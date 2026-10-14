/**
 * API do Painel do administrador. Tudo (menos o login) exige a sessão assinada
 * enviada no cabeçalho Authorization.
 *
 * Variáveis de ambiente: ADMIN_PASSWORD (obrigatória), ADMIN_SECRET (opcional) e as do banco.
 */
const lib = require('./_lib');

const { COLECOES } = lib;

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
    if (!body) return res.status(400).json({ ok: false, erro: 'Dados inválidos.' });

    if (!process.env.ADMIN_PASSWORD) {
        return res.status(500).json({ ok: false, erro: 'Painel não configurado: falta a variável ADMIN_PASSWORD na Vercel.' });
    }
    if (!lib.redisAtivo()) {
        return res.status(500).json({ ok: false, erro: 'Banco de dados não configurado na Vercel (Upstash Redis).' });
    }

    try {
        /* ---------- login ---------- */
        if (body.acao === 'login') {
            if (await lib.limitar(`login:${lib.ipDe(req)}`, 5, 900)) {
                return res.status(429).json({ ok: false, erro: 'Muitas tentativas. Aguarde 15 minutos.' });
            }
            if (!lib.senhaCorreta(body.senha)) {
                return res.status(401).json({ ok: false, erro: 'Senha incorreta.' });
            }
            return res.status(200).json({ ok: true, token: lib.gerarToken() });
        }

        /* ---------- demais ações: precisam de sessão ---------- */
        if (!lib.tokenValido(lib.tokenDe(req))) {
            return res.status(401).json({ ok: false, erro: 'Sessão expirada. Entre novamente.' });
        }

        if (body.acao === 'listar') {
            const [agendas, inscricoes, mensagens] = await Promise.all([
                lib.listar('agendas'), lib.listar('inscricoes'), lib.listar('mensagens')
            ]);
            return res.status(200).json({ ok: true, agendas, inscricoes, mensagens });
        }

        const colecao = String(body.colecao || '');
        const id = lib.linha(body.id, 40);

        if (body.acao === 'status') {
            if (!COLECOES[colecao] || !COLECOES[colecao].status.includes(body.status) || !id) {
                return res.status(400).json({ ok: false, erro: 'Pedido inválido.' });
            }
            const registro = await lib.obter(colecao, id);
            if (!registro) return res.status(404).json({ ok: false, erro: 'Registro não encontrado.' });
            registro.status = body.status;
            registro.atualizadoEm = new Date().toISOString();
            await lib.salvar(colecao, registro);
            return res.status(200).json({ ok: true, registro });
        }

        if (body.acao === 'excluir') {
            if (!COLECOES[colecao] || !id) return res.status(400).json({ ok: false, erro: 'Pedido inválido.' });
            await lib.remover(colecao, id);
            return res.status(200).json({ ok: true });
        }

        if (body.acao === 'criarAgenda') {
            const dados = lib.validarAgenda(body.agenda || {});
            if (!dados) return res.status(400).json({ ok: false, erro: 'Preencha todos os campos da agenda corretamente.' });
            const registro = lib.novoRegistro(dados, 'validada', 'painel');
            await lib.salvar('agendas', registro);
            return res.status(200).json({ ok: true, registro });
        }

        return res.status(400).json({ ok: false, erro: 'Ação desconhecida.' });
    } catch (err) {
        console.error('Erro no painel:', err.message);
        return res.status(502).json({ ok: false, erro: 'Falha ao acessar o banco de dados.' });
    }
};
