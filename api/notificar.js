/**
 * Recebe os formulários de AGENDA, TRABALHE CONOSCO e "Deixe uma mensagem".
 *  1) Guarda o registro no banco (aparece no Painel do administrador para validar).
 *  2) Avisa o músico no WhatsApp, sem abrir o WhatsApp do visitante.
 *
 * Variáveis de ambiente: CALLMEBOT_APIKEY, WHATSAPP_DESTINO (opcional) e as do banco (ver _lib.js).
 */
const https = require('https');
const lib = require('./_lib');

const { linha, texto } = lib;

const DESTINO = (lib.conf('destino') || '5521977041825').replace(/\D/g, '');
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function origem(secao, url, referer) {
    const link = linha(url || referer || 'não informado', 200);
    return `📍 *Origem:* Site JBMusic › ${secao}\n🔗 ${link}`;
}

/** Valida o pedido e devolve o que será guardado e a mensagem do WhatsApp (ou null se inválido). */
function preparar(b) {
    if (b.tipo === 'agenda') {
        const a = lib.validarAgenda(b);
        if (!a) return null;
        const [ano, mes, dia] = a.data.split('-').map(Number);
        const semana = DIAS[new Date(ano, mes - 1, dia).getDay()];
        return {
            colecao: 'agendas',
            dados: a,
            status: 'pendente',
            secao: 'Agenda',
            montar: (orig) =>
                `📅 *NOVA SOLICITAÇÃO DE AGENDA*\n${orig}\n\n` +
                `⛪ *Igreja:* ${a.igreja}\n` +
                `📌 *Endereço:* ${a.endereco}\n` +
                `📆 *Dia:* ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano} (${semana})\n` +
                `🕒 *Horário:* ${a.horario}\n` +
                `👤 *Responsável:* ${a.nome} (${a.cargo})\n` +
                `📞 *Contato:* ${a.contato}`
        };
    }

    if (b.tipo === 'trabalhe') {
        const d = {
            nome: linha(b.nome, 80),
            contato: linha(b.contato, 20),
            idade: linha(b.idade, 3),
            email: linha(b.email, 120),
            endereco: linha(b.endereco, 160),
            igreja: linha(b.igreja, 100),
            enderecoIgreja: linha(b.enderecoIgreja, 160),
            mensagem: texto(b.mensagem, 400)
        };
        if (Object.values(d).some((v) => !v)) return null;
        return {
            colecao: 'inscricoes',
            dados: d,
            status: 'pendente',
            secao: 'Trabalhe conosco',
            montar: (orig) =>
                `🎤 *NOVA INSCRIÇÃO - TRABALHE CONOSCO*\n${orig}\n\n` +
                `👤 *Nome:* ${d.nome}\n` +
                `📞 *Contato:* ${d.contato}\n` +
                `🎂 *Idade:* ${d.idade}\n` +
                `✉️ *E-mail:* ${d.email}\n` +
                `🏠 *Endereço:* ${d.endereco}\n` +
                `⛪ *Igreja:* ${d.igreja}\n` +
                `📌 *Endereço da igreja:* ${d.enderecoIgreja}\n\n` +
                `💬 *Sobre mim:* ${d.mensagem}`
        };
    }

    if (b.tipo === 'contato') {
        const d = { nome: linha(b.nome, 80), mensagem: texto(b.mensagem, 800) };
        if (!d.nome || !d.mensagem) return null;
        return {
            colecao: 'mensagens',
            dados: d,
            status: 'nova',
            secao: 'Formulário "Deixe uma mensagem"',
            montar: (orig) =>
                `💬 *NOVA MENSAGEM DO SITE*\n${orig}\n\n` +
                `👤 *Nome:* ${d.nome}\n\n${d.mensagem}`
        };
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

    if (!lib.origemPermitida(req)) {
        return res.status(403).json({ ok: false, erro: 'Origem não permitida.' });
    }

    const body = lib.lerCorpo(req);
    if (!body) {
        return res.status(400).json({ ok: false, erro: 'Dados inválidos.' });
    }

    // Campo isca invisível: robôs preenchem, pessoas não. Finge sucesso e descarta.
    if (body.website) {
        return res.status(200).json({ ok: true });
    }

    if (await lib.limitar(`notificar:${lib.ipDe(req)}`, 5, 600)) {
        return res.status(429).json({ ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos.' });
    }

    const pedido = preparar(body);
    if (!pedido) {
        return res.status(400).json({ ok: false, erro: 'Preencha todos os campos.' });
    }

    // 1) Guarda no banco para aparecer no painel do administrador
    let salvo = false;
    if (lib.redisAtivo()) {
        try {
            await lib.salvar(pedido.colecao, lib.novoRegistro(pedido.dados, pedido.status, 'site'));
            salvo = true;
        } catch (err) {
            console.error('Falha ao salvar no banco:', err.message);
        }
    }

    // 2) Avisa no WhatsApp do músico
    let painel = '';
    if (salvo) painel = `\n\n🔎 *Validar no painel:* https://${req.headers.host}/admin.html`;
    else if (lib.redisAtivo()) painel = '\n\n⚠️ *Atenção:* esta solicitação NÃO foi salva no painel (erro no banco de dados). Veja os logs da Vercel.';
    const mensagem = pedido.montar(origem(pedido.secao, body.origem, req.headers.referer)) + painel;

    // Sem banco, o log é a única cópia dos dados: registra para não perder a mensagem.
    if (!salvo) console.log('[notificar] (sem banco) mensagem:\n' + mensagem);

    let enviado = false;
    const apikey = lib.conf('callmebot');
    if (!apikey) {
        console.error('CALLMEBOT_APIKEY não configurada na Vercel.');
    } else {
        try {
            const url =
                `https://api.callmebot.com/whatsapp.php?phone=${DESTINO}` +
                `&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(apikey)}`;
            const { status, corpo } = await chamarCallMeBot(url);
            console.log('[notificar] tipo:', body.tipo, '| salvo:', salvo, '| CallMeBot:', status, corpo.slice(0, 120));
            enviado = status >= 200 && status < 300 && !/error|invalid|not authorized/i.test(corpo);
            if (!enviado) console.error('Falha CallMeBot:', status, corpo.slice(0, 200));
        } catch (err) {
            console.error('Erro ao enviar aviso:', err.message);
        }
    }

    // Sucesso se o dado está seguro no painel OU se o aviso chegou no WhatsApp
    if (salvo || enviado) return res.status(200).json({ ok: true, painel: salvo });
    return res.status(502).json({ ok: false, erro: 'Não foi possível enviar agora.' });
};
