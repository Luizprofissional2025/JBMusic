/**
 * Diagnóstico da configuração: abra  /api/status  no navegador.
 * Mostra apenas SIM/NÃO (nunca exibe senhas, chaves ou dados).
 */
const lib = require('./_lib');

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ ok: false });
    }

    const ligado = lib.redisAtivo();
    let conexao = 'não testado (banco não configurado)';
    if (ligado) {
        try {
            const r = await lib.redis(['PING']);
            conexao = r === 'PONG' ? 'OK' : 'resposta inesperada';
        } catch (err) {
            conexao = 'FALHOU: ' + String(err.message).slice(0, 80);
        }
    }

    const sim = (v) => (v ? 'OK' : 'FALTA');
    const resultado = {
        ADMIN_PASSWORD: sim(lib.conf('senha')),
        banco_de_dados_variaveis: sim(ligado),
        banco_de_dados_tipo: ligado ? (lib.redisModo() === 'tcp' ? 'REDIS_URL (conexão direta)' : 'REST (Upstash)') : '-',
        banco_de_dados_conexao: conexao,
        CALLMEBOT_APIKEY: sim(lib.conf('callmebot'))
    };
    resultado.tudo_certo = resultado.ADMIN_PASSWORD === 'OK' && conexao === 'OK' && resultado.CALLMEBOT_APIKEY === 'OK';
    return res.status(200).json(resultado);
};
