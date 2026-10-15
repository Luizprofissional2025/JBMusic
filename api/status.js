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

    // Teste de escrita: grava, lê e apaga um registro de teste (confirma que as agendas conseguem ser salvas)
    let escrita = ligado ? 'não testado (sem conexão)' : 'não testado (banco não configurado)';
    if (ligado && conexao === 'OK') {
        try {
            await lib.redis(['HSET', 'jb:teste', 'x', 'ok']);
            const lido = await lib.redis(['HGET', 'jb:teste', 'x']);
            await lib.redis(['HDEL', 'jb:teste', 'x']);
            escrita = lido === 'ok' ? 'OK' : 'FALHOU: valor lido diferente do gravado';
        } catch (err) {
            escrita = 'FALHOU: ' + String(err.message).slice(0, 80);
        }
    }

    const sim = (v) => (v ? 'OK' : 'FALTA');
    const resultado = {
        ADMIN_PASSWORD: sim(lib.conf('senha')),
        banco_de_dados_variaveis: sim(ligado),
        banco_de_dados_tipo: ligado ? (lib.redisModo() === 'tcp' ? 'REDIS_URL (conexão direta)' : 'REST (Upstash)') : '-',
        banco_de_dados_conexao: conexao,
        banco_de_dados_escrita: escrita,
        CALLMEBOT_APIKEY: sim(lib.conf('callmebot'))
    };
    resultado.versao_api = 'painel-2026-10-15';
    resultado.tudo_certo = resultado.ADMIN_PASSWORD === 'OK' && conexao === 'OK' && escrita === 'OK' && resultado.CALLMEBOT_APIKEY === 'OK';
    return res.status(200).json(resultado);
};
