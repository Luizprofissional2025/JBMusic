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
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

const redisAtivo = () => !!redisConfig();

function redis(comando) {
    const cfg = redisConfig();
    if (!cfg) return Promise.reject(new Error('Banco de dados não configurado.'));

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
        .update('jbmusic-admin:' + (process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || ''))
        .digest();

function senhaCorreta(informada) {
    const senha = process.env.ADMIN_PASSWORD;
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
    redis, redisAtivo, COLECOES, novoRegistro, salvar, listar, obter, remover,
    validarAgenda, limitar, senhaCorreta, gerarToken, tokenValido, tokenDe, mascararContato
};
