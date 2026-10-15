'use strict';
/**
 * Utilitários compartilhados das funções da Vercel (o prefixo "_" impede que este
 * arquivo vire um endereço público). Sem dependências externas.
 *
 * Variáveis de ambiente usadas:
 *   KV_REST_API_URL / KV_REST_API_TOKEN   (criadas automaticamente ao conectar o Upstash Redis na Vercel)
 *   ADMIN_PASSWORD                        senha do painel do administrador
 *   ADMIN_SECRET                          (opcional) segredo para assinar a sessão do painel
 *   AGENDA_CONTATO_PUBLICO                (opcional) "true" para mostrar o telefone completo na agenda pública
 */

const crypto = require('crypto');
const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');

// Lê uma variável de ambiente pelo nome original ou por um nome alternativo
// (o navegador pode traduzir os nomes na tela da Vercel, ex.: SENHA_DE_ADMINISTRADOR).
const env = (...nomes) => {
    for (const n of nomes) if (process.env[n]) return process.env[n];
    return '';
};
const ENV_NOMES = {
    senha: ['ADMIN_PASSWORD', 'SENHA_DE_ADMINISTRADOR'],
    segredo: ['ADMIN_SECRET'],
    callmebot: ['CALLMEBOT_APIKEY', 'CHAVE_API_CALLMEBOT'],
    contatoPublico: ['AGENDA_CONTATO_PUBLICO'],
    destino: ['WHATSAPP_DESTINO']
};
const conf = (chave) => env(...ENV_NOMES[chave]);

/* ------------------------- sanitização ------------------------- */
const linha = (v, max = 160) =>
    String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const texto = (v, max = 500) =>
    String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);

/* ------------------------- requisição ------------------------- */
// Aceita só pedidos vindos do próprio domínio (bloqueia disparo a partir de outros sites).
function origemPermitida(req) {
    const host = req.headers.host;
    if (!host) return true;
    for (const header of [req.headers.origin, req.headers.referer]) {
        if (!header) continue;
        try {
            if (new URL(header).host !== host) return false;
        } catch (e) {
            return false;
        }
    }
    return true;
}

function lerCorpo(req) {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    return body && typeof body === 'object' ? body : null;
}

const ipDe = (req) =>
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconhecido';

/* ------------------------- Redis (REST) ------------------------- */
function redisConfig() {
    const e = process.env;
    let url = e.KV_REST_API_URL || e.UPSTASH_REDIS_REST_URL;
    let token = e.KV_REST_API_TOKEN || e.UPSTASH_REDIS_REST_TOKEN;

    // A Vercel permite escolher um prefixo para as variáveis (ex.: STORAGE_KV_REST_API_URL).
    if (!url || !token) {
        for (const nome of Object.keys(e)) {
            const m = nome.match(/^(.*?)(KV_REST_API_URL|UPSTASH_REDIS_REST_URL)$/);
            if (!m) continue;
            const par = m[1] + m[2].replace('URL', 'TOKEN');
            if (e[nome] && e[par]) { url = e[nome]; token = e[par]; break; }
        }
    }
    if (url && token) return { modo: 'rest', url: url.replace(/\/+$/, ''), token };

    // Conexão direta (protocolo Redis) pela variável REDIS_URL criada pela integração da Vercel
    let tcp = e.REDIS_URL || e.URL_REDIS || e.KV_URL;
    if (!tcp) {
        for (const nome of Object.keys(e)) {
            if (/(^|_)(REDIS_URL|KV_URL)$/.test(nome) && /^rediss?:\/\//.test(e[nome])) { tcp = e[nome]; break; }
        }
    }
    return tcp && /^rediss?:\/\//.test(tcp) ? { modo: 'tcp', url: tcp } : null;
}

const redisAtivo = () => !!redisConfig();
const redisModo = () => (redisConfig() || {}).modo || null;

/* ---- cliente mínimo do protocolo Redis (RESP2), sem dependências ---- */
function codificar(comando) {
    const partes = comando.map(String);
    let out = `*${partes.length}\r\n`;
    for (const p of partes) out += `$${Buffer.byteLength(p)}\r\n${p}\r\n`;
    return out;
}

function lerResp(buf, i) {
    if (i >= buf.length) return null;
    const tipo = String.fromCharCode(buf[i]);
    const fim = buf.indexOf('\r\n', i);
    if (fim === -1) return null;
    const linhaTxt = buf.toString('utf8', i + 1, fim);
    const prox = fim + 2;
    switch (tipo) {
        case '+': return [linhaTxt, prox];
        case '-': return [new Error(linhaTxt), prox];
        case ':': return [Number(linhaTxt), prox];
        case '$': {
            const n = Number(linhaTxt);
            if (n < 0) return [null, prox];
            if (buf.length < prox + n + 2) return null;
            return [buf.toString('utf8', prox, prox + n), prox + n + 2];
        }
        case '*': {
            const n = Number(linhaTxt);
            if (n < 0) return [null, prox];
            const itens = [];
            let pos = prox;
            for (let k = 0; k < n; k++) {
                const r = lerResp(buf, pos);
                if (!r) return null;
                itens.push(r[0]);
                pos = r[1];
            }
            return [itens, pos];
        }
        default: throw new Error('Resposta inesperada do banco de dados.');
    }
}

function redisTcp(urlTexto, comando) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlTexto);
        const opcoes = { host: u.hostname, port: Number(u.port) || 6379 };
        const sock = u.protocol === 'rediss:'
            ? tls.connect({ ...opcoes, servername: u.hostname })
            : net.connect(opcoes);

        const usuario = decodeURIComponent(u.username || '');
        const senha = decodeURIComponent(u.password || '');
        const lote = [];
        if (senha) lote.push(usuario ? ['AUTH', usuario, senha] : ['AUTH', senha]);
        lote.push(comando);

        let buf = Buffer.alloc(0);
        const respostas = [];
        let terminou = false;
        const concluir = (erro, valor) => {
            if (terminou) return;
            terminou = true;
            sock.destroy();
            erro ? reject(erro) : resolve(valor);
        };

        sock.setTimeout(8000, () => concluir(new Error('Tempo esgotado no banco de dados.')));
        sock.on('error', concluir);
        sock.on('close', () => concluir(new Error('Conexão com o banco encerrada.')));
        sock.on(u.protocol === 'rediss:' ? 'secureConnect' : 'connect', () => {
            sock.write(lote.map(codificar).join(''));
        });
        sock.on('data', (pedaco) => {
            buf = Buffer.concat([buf, pedaco]);
            try {
                let pos = 0;
                while (respostas.length < lote.length) {
                    const r = lerResp(buf, pos);
                    if (!r) break;
                    respostas.push(r[0]);
                    pos = r[1];
                }
                buf = buf.subarray(pos);
            } catch (err) {
                return concluir(err);
            }
            if (respostas.length === lote.length) {
                const erro = respostas.find((r) => r instanceof Error);
                concluir(erro || null, respostas[respostas.length - 1]);
            }
        });
    });
}

function redis(comando) {
    const cfg = redisConfig();
    if (!cfg) return Promise.reject(new Error('Banco de dados não configurado.'));
    if (cfg.modo === 'tcp') return redisTcp(cfg.url, comando);

    return new Promise((resolve, reject) => {
        const u = new URL(cfg.url);
        const lib = u.protocol === 'http:' ? http : https;
        const dados = JSON.stringify(comando.map(String));
        const req = lib.request(
            {
                hostname: u.hostname,
                port: u.port || undefined,
                path: u.pathname || '/',
                method: 'POST',
                timeout: 8000,
                headers: {
                    Authorization: `Bearer ${cfg.token}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(dados)
                }
            },
            (resp) => {
                let corpo = '';
                resp.on('data', (c) => { corpo += c; });
                resp.on('end', () => {
                    try {
                        const json = JSON.parse(corpo);
                        if (json.error) return reject(new Error(json.error));
                        resolve(json.result);
                    } catch (e) {
                        reject(new Error('Resposta inválida do banco de dados.'));
                    }
                });
            }
        );
        req.on('timeout', () => req.destroy(new Error('Tempo esgotado no banco de dados.')));
        req.on('error', reject);
        req.write(dados);
        req.end();
    });
}

/* ------------------------- coleções ------------------------- */
const COLECOES = {
    agendas:    { chave: 'jb:agendas',    status: ['pendente', 'validada', 'recusada'] },
    inscricoes: { chave: 'jb:inscricoes', status: ['pendente', 'validada', 'recusada'] },
    mensagens:  { chave: 'jb:mensagens',  status: ['nova', 'lida'] }
};

function novoRegistro(dados, status, origem) {
    return {
        id: crypto.randomBytes(8).toString('hex'),
        ...dados,
        status,
        origem,
        criadoEm: new Date().toISOString()
    };
}

const salvar = (colecao, registro) =>
    redis(['HSET', COLECOES[colecao].chave, registro.id, JSON.stringify(registro)]);

async function listar(colecao) {
    const r = await redis(['HGETALL', COLECOES[colecao].chave]);
    const pares = Array.isArray(r) ? r : Object.entries(r || {}).flat();
    const itens = [];
    for (let i = 0; i < pares.length; i += 2) {
        try { itens.push(JSON.parse(pares[i + 1])); } catch (e) { /* ignora registro corrompido */ }
    }
    return itens.sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
}

async function obter(colecao, id) {
    const r = await redis(['HGET', COLECOES[colecao].chave, id]);
    if (!r) return null;
    try { return JSON.parse(r); } catch (e) { return null; }
}

const remover = (colecao, id) => redis(['HDEL', COLECOES[colecao].chave, id]);

/* ------------------------- validação da agenda ------------------------- */
function validarAgenda(b) {
    const a = {
        nome: linha(b.nome, 80),
        cargo: linha(b.cargo, 60),
        contato: linha(b.contato, 20),
        igreja: linha(b.igreja, 100),
        endereco: linha(b.endereco, 160),
        data: linha(b.data, 10),
        horario: linha(b.horario, 5)
    };
    if (Object.values(a).some((v) => !v)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.data)) return null;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.horario)) return null;

    const [y, m, d] = a.data.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return a;
}

/* ------------------------- limite de tentativas ------------------------- */
const memoria = new Map();

// true = passou do limite. Usa o Redis (vale entre todas as instâncias) e cai para memória se indisponível.
async function limitar(chave, max, janelaSeg) {
    if (redisAtivo()) {
        try {
            const k = `jb:rl:${chave}`;
            await redis(['SET', k, '0', 'EX', janelaSeg, 'NX']);
            const n = await redis(['INCR', k]);
            return n > max;
        } catch (e) {
            console.error('Limite via Redis falhou, usando memória:', e.message);
        }
    }
    const agora = Date.now();
    const lista = (memoria.get(chave) || []).filter((t) => agora - t < janelaSeg * 1000);
    lista.push(agora);
    memoria.set(chave, lista);
    return lista.length > max;
}

/* ------------------------- sessão do administrador ------------------------- */
const SESSAO_MS = 8 * 60 * 60 * 1000;

const chaveSessao = () =>
    crypto.createHash('sha256')
        .update('jbmusic-admin:' + (conf('segredo') || conf('senha') || ''))
        .digest();

function senhaCorreta(informada) {
    const senha = conf('senha');
    if (!senha) return false;
    const a = crypto.createHash('sha256').update(String(informada ?? '')).digest();
    const b = crypto.createHash('sha256').update(senha).digest();
    return crypto.timingSafeEqual(a, b);
}

function gerarToken() {
    const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSAO_MS })).toString('base64url');
    const assinatura = crypto.createHmac('sha256', chaveSessao()).update(payload).digest('base64url');
    return `${payload}.${assinatura}`;
}

function tokenValido(token) {
    try {
        const [payload, assinatura] = String(token || '').split('.');
        if (!payload || !assinatura) return false;
        const esperado = crypto.createHmac('sha256', chaveSessao()).update(payload).digest('base64url');
        const a = Buffer.from(assinatura);
        const b = Buffer.from(esperado);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
        return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
    } catch (e) {
        return false;
    }
}

function tokenDe(req) {
    const h = String(req.headers.authorization || '');
    return h.startsWith('Bearer ') ? h.slice(7) : '';
}

/* ------------------------- telefone ------------------------- */
function mascararContato(c) {
    const d = String(c || '').replace(/\D/g, '');
    if (d.length < 8) return '••••';
    return d.length > 9 ? `(${d.slice(0, 2)}) *****-${d.slice(-4)}` : `*****-${d.slice(-4)}`;
}

module.exports = {
    linha, texto, origemPermitida, lerCorpo, ipDe,
    conf, redis, redisAtivo, redisModo, COLECOES, novoRegistro, salvar, listar, obter, remover,
    validarAgenda, limitar, senhaCorreta, gerarToken, tokenValido, tokenDe, mascararContato
};
