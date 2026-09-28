/**
 * Função serverless da Vercel: recebe os formulários de AGENDA e TRABALHE CONOSCO
 * e envia o aviso direto para o WhatsApp do músico, sem abrir o WhatsApp para o visitante.
 *
 * Variáveis de ambiente (Vercel > Settings > Environment Variables):
 *   CALLMEBOT_APIKEY   chave gerada pelo CallMeBot para o número que recebe os avisos
 *   WHATSAPP_DESTINO   (opcional) número que recebe, com 55 + DDD. Padrão: 5521977041825
 */

const https = require('https');

const DESTINO = (process.env.WHATSAPP_DESTINO || '5521977041825').replace(/\D/g, '');
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// Limite simples por IP (funciona por instância; barra abuso básico)
const historico = new Map();
const LIMITE = 5;
const JANELA_MS = 10 * 60 * 1000;

function excedeuLimite(ip) {
    const agora = Date.now();
    const lista = (historico.get(ip) || []).filter(t => agora - t < JANELA_MS);
    lista.push(agora);
    historico.set(ip, lista);
    return lista.length > LIMITE;
}

const linha = (v, max = 160) =>
    String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const texto = (v, max = 500) =>
    String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);

function origem(secao, url, referer) {
    const link = linha(url || referer || 'não informado', 200);
    return `📍 *Origem:* Site JBMusic › ${secao}\n🔗 ${link}`;
}

function montarMensagem(b, referer) {
    if (b.tipo === 'agenda') {
        const [ano, mes, dia] = linha(b.data, 10).split('-').map(Number);
        if (!ano || !mes || !dia) return null;
        const semana = DIAS[new Date(ano, mes - 1, dia).getDay()];
        const campos = [b.nome, b.cargo, b.contato, b.igreja, b.endereco, b.horario];
        if (campos.some(c => !linha(c))) return null;
        return (
            `📅 *NOVA SOLICITAÇÃO DE AGENDA*\n` +
            `${origem('Agenda', b.origem, referer)}\n\n` +
            `⛪ *Igreja:* ${linha(b.igreja)}\n` +
            `📌 *Endereço:* ${linha(b.endereco)}\n` +
            `📆 *Dia:* ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano} (${semana})\n` +
            `🕒 *Horário:* ${linha(b.horario, 10)}\n` +
            `👤 *Responsável:* ${linha(b.nome)} (${linha(b.cargo)})\n` +
            `📞 *Contato:* ${linha(b.contato, 20)}`
        );
    }

    if (b.tipo === 'trabalhe') {
        const campos = [b.nome, b.contato, b.idade, b.email, b.endereco, b.igreja, b.enderecoIgreja, b.mensagem];
        if (campos.some(c => !linha(c))) return null;
        return (
            `🎤 *NOVA INSCRIÇÃO - TRABALHE CONOSCO*\n` +
            `${origem('Trabalhe conosco', b.origem, referer)}\n\n` +
            `👤 *Nome:* ${linha(b.nome)}\n` +
            `📞 *Contato:* ${linha(b.contato, 20)}\n` +
            `🎂 *Idade:* ${linha(b.idade, 3)}\n` +
            `✉️ *E-mail:* ${linha(b.email)}\n` +
            `🏠 *Endereço:* ${linha(b.endereco)}\n` +
            `⛪ *Igreja:* ${linha(b.igreja)}\n` +
            `📌 *Endereço da igreja:* ${linha(b.enderecoIgreja)}\n\n` +
            `💬 *Sobre mim:* ${texto(b.mensagem, 400)}`
        );
    }

    return null;
}

function chamarCallMeBot(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 10000 }, (resp) => {
            let corpo = '';
            resp.on('data', (chunk) => { corpo += chunk; });
            resp.on('end', () => resolve({ status: resp.statusCode, corpo }));
        });
        req.on('timeout', () => req.destroy(new Error('Tempo esgotado ao contatar o CallMeBot.')));
        req.on('error', reject);
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (!body || typeof body !== 'object') {
        return res.status(400).json({ ok: false, erro: 'Dados inválidos.' });
    }

    // Campo isca invisível: robôs preenchem, pessoas não. Finge sucesso e descarta.
    if (body.website) {
        return res.status(200).json({ ok: true });
    }

    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconhecido';
    if (excedeuLimite(ip)) {
        return res.status(429).json({ ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos.' });
    }

    const mensagem = montarMensagem(body, req.headers.referer);
    if (!mensagem) {
        return res.status(400).json({ ok: false, erro: 'Preencha todos os campos.' });
    }

    const apikey = process.env.CALLMEBOT_APIKEY;
    if (!apikey) {
        console.error('CALLMEBOT_APIKEY não configurada na Vercel.');
        return res.status(500).json({ ok: false, erro: 'Envio não configurado.' });
    }

    try {
        const url =
            `https://api.callmebot.com/whatsapp.php?phone=${DESTINO}` +
            `&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(apikey)}`;
        const { status, corpo } = await chamarCallMeBot(url);

        if (status < 200 || status >= 300 || /error|invalid|not authorized/i.test(corpo)) {
            console.error('Falha CallMeBot:', status, corpo.slice(0, 200));
            return res.status(502).json({ ok: false, erro: 'Não foi possível enviar agora.' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Erro ao enviar aviso:', err);
        return res.status(502).json({ ok: false, erro: 'Não foi possível enviar agora.' });
    }
};
