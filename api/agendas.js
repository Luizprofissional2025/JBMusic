/**
 * Lista PÚBLICA das agendas validadas pelo administrador (aparece na página Agenda).
 * O telefone é mascarado por padrão para não expor dados pessoais; para exibir completo,
 * defina AGENDA_CONTATO_PUBLICO=true na Vercel.
 */
const lib = require('./_lib');

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
    }

    if (!lib.redisAtivo()) {
        return res.status(200).json({ ok: true, agendas: [] });
    }

    try {
        const publico = process.env.AGENDA_CONTATO_PUBLICO === 'true';
        const todas = await lib.listar('agendas');
        const agendas = todas
            .filter((a) => a.status === 'validada')
            .sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`))
            .map((a) => ({
                id: a.id,
                igreja: a.igreja,
                endereco: a.endereco,
                data: a.data,
                horario: a.horario,
                nome: a.nome,
                cargo: a.cargo,
                contato: publico ? a.contato : lib.mascararContato(a.contato),
                contatoOculto: !publico
            }));
        return res.status(200).json({ ok: true, agendas });
    } catch (err) {
        console.error('Falha ao listar agendas:', err.message);
        return res.status(502).json({ ok: false, erro: 'Não foi possível carregar a agenda.' });
    }
};
