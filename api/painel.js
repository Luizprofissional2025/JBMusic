/* =========================================================================
   PAINEL DO ADMINISTRADOR
   Usa as funções jbValidate / jbToast / jbSetLoading definidas em script.js
   ========================================================================= */
(function () {
    const loginBox = document.getElementById('admLogin');
    if (!loginBox) return;

    const TOKEN_KEY = 'jbAdminToken';
    const painelBox = document.getElementById('admPainel');
    const loginForm = document.getElementById('admLoginForm');
    const loginErro = document.getElementById('admLoginErro');
    const novaForm = document.getElementById('admNovaForm');
    const novaBox = document.getElementById('admNovaAgenda');

    const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    const COLECOES = {
        agendas: {
            vazio: 'Nenhuma agenda neste filtro.',
            filtros: [['pendente', 'Pendentes'], ['validada', 'Validadas'], ['recusada', 'Não validadas'], ['todas', 'Todas']],
            pendente: 'pendente'
        },
        inscricoes: {
            vazio: 'Nenhuma inscrição neste filtro.',
            filtros: [['pendente', 'Pendentes'], ['validada', 'Validadas'], ['recusada', 'Não validadas'], ['todas', 'Todas']],
            pendente: 'pendente'
        },
        mensagens: {
            vazio: 'Nenhuma mensagem neste filtro.',
            filtros: [['nova', 'Novas'], ['lida', 'Lidas'], ['todas', 'Todas']],
            pendente: 'nova'
        }
    };

    const ROTULO_STATUS = {
        pendente: 'Pendente', validada: 'Validada', recusada: 'Não validada', nova: 'Nova', lida: 'Lida'
    };

    let token = sessionStorage.getItem(TOKEN_KEY) || '';
    let dados = { agendas: [], inscricoes: [], mensagens: [] };
    let abaAtiva = 'agendas';
    const filtro = { agendas: 'pendente', inscricoes: 'pendente', mensagens: 'nova' };

    /* ---------------- utilidades ---------------- */
    function esc(valor) {
        const div = document.createElement('div');
        div.textContent = valor == null ? '' : String(valor);
        return div.innerHTML;
    }

    function dataBR(iso) {
        const [y, m, d] = String(iso || '').split('-').map(Number);
        if (!y) return '—';
        const dia = DIAS[new Date(y, m - 1, d).getDay()];
        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y} · ${dia}`;
    }

    function dataHora(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        const p = (n) => String(n).padStart(2, '0');
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    function linkZap(contato) {
        const n = String(contato || '').replace(/\D/g, '');
        const texto = esc(contato) || '—';
        return n.length >= 10 && n.length <= 11
            ? `<a href="https://wa.me/55${n}" target="_blank" rel="noopener noreferrer">${texto}</a>`
            : texto;
    }

    async function api(acao, extra) {
        const resposta = await fetch('/api/admin', {
            method: 'POST',
            headers: Object.assign(
                { 'Content-Type': 'application/json' },
                token ? { Authorization: 'Bearer ' + token } : {}
            ),
            body: JSON.stringify(Object.assign({ acao }, extra || {}))
        });
        const json = await resposta.json().catch(() => ({}));
        if (resposta.status === 401 && acao !== 'login') {
            sair();
            throw new Error('Sessão expirada. Entre novamente.');
        }
        if (!resposta.ok || !json.ok) throw new Error(json.erro || 'Não foi possível concluir a ação.');
        return json;
    }

    /* ---------------- sessão ---------------- */
    function mostrarPainel(sim) {
        loginBox.hidden = sim;
        painelBox.hidden = !sim;
    }

    function sair() {
        token = '';
        sessionStorage.removeItem(TOKEN_KEY);
        dados = { agendas: [], inscricoes: [], mensagens: [] };
        mostrarPainel(false);
    }

    async function carregar() {
        const r = await api('listar');
        dados = { agendas: r.agendas, inscricoes: r.inscricoes, mensagens: r.mensagens };
        render();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!jbValidate(loginForm)) return;
        const btn = loginForm.querySelector('button[type="submit"]');
        loginErro.hidden = true;
        jbSetLoading(btn, true);
        try {
            const r = await api('login', { senha: document.getElementById('admSenha').value });
            token = r.token;
            sessionStorage.setItem(TOKEN_KEY, token);
            loginForm.reset();
            loginForm.classList.remove('was-validated');
            await carregar();
            mostrarPainel(true);
        } catch (err) {
            loginErro.textContent = err.message;
            loginErro.hidden = false;
        }
        jbSetLoading(btn, false);
    });

    document.getElementById('admSair').addEventListener('click', sair);
    document.getElementById('admAtualizar').addEventListener('click', async () => {
        try {
            await carregar();
            jbToast('Painel atualizado', 'Os dados mais recentes foram carregados.');
        } catch (err) {
            jbToast('Não foi possível atualizar', err.message, 'erro');
        }
    });

    /* ---------------- abas e filtros ---------------- */
    document.querySelectorAll('.adm-tab').forEach((botao) => {
        botao.addEventListener('click', () => {
            abaAtiva = botao.getAttribute('data-aba');
            render();
        });
    });

    /* ---------------- desenho ---------------- */
    function passaFiltro(colecao, item) {
        const f = filtro[colecao];
        return f === 'todas' || item.status === f;
    }

    function campo(rotulo, valorHtml, largo) {
        return `<div class="adm-campo${largo ? ' adm-campo-largo' : ''}"><span>${rotulo}</span><strong>${valorHtml}</strong></div>`;
    }

    function camposDe(colecao, i) {
        if (colecao === 'agendas') {
            return campo('Igreja', esc(i.igreja)) +
                campo('Endereço', esc(i.endereco)) +
                campo('Dia do evento', dataBR(i.data)) +
                campo('Horário', esc(i.horario)) +
                campo('Responsável', `${esc(i.nome)} <small>${esc(i.cargo)}</small>`) +
                campo('Contato', linkZap(i.contato));
        }
        if (colecao === 'inscricoes') {
            return campo('Nome', esc(i.nome)) +
                campo('Contato', linkZap(i.contato)) +
                campo('Idade', esc(i.idade)) +
                campo('E-mail', esc(i.email)) +
                campo('Endereço', esc(i.endereco)) +
                campo('Igreja', esc(i.igreja)) +
                campo('Endereço da igreja', esc(i.enderecoIgreja)) +
                campo('Sobre a pessoa', esc(i.mensagem), true);
        }
        return campo('Nome', esc(i.nome)) + campo('Mensagem', esc(i.mensagem), true);
    }

    function acoesDe(colecao, i) {
        const botao = (acao, texto, classe) =>
            `<button type="button" class="adm-btn ${classe}" data-acao="${acao}" data-colecao="${colecao}" data-id="${esc(i.id)}">${texto}</button>`;
        let html = '';
        if (colecao === 'mensagens') {
            html += i.status === 'nova' ? botao('lida', 'Marcar como lida', 'adm-btn-ok') : botao('nova', 'Marcar como nova', 'adm-btn-neutro');
        } else {
            if (i.status !== 'validada') html += botao('validada', '✓ Validar', 'adm-btn-ok');
            if (i.status !== 'recusada') html += botao('recusada', '✕ Não validar', 'adm-btn-nao');
        }
        return html + botao('excluir', 'Excluir', 'adm-btn-excluir');
    }

    function avisoConflito(i) {
        if (i.status === 'validada') return '';
        const outra = dados.agendas.find((a) => a.id !== i.id && a.status === 'validada' && a.data === i.data);
        return outra
            ? `<div class="adm-alerta">⚠ Já existe uma agenda validada neste dia: ${esc(outra.igreja)} às ${esc(outra.horario)}.</div>`
            : '';
    }

    function cartao(colecao, i) {
        const origem = i.origem === 'painel' ? 'Adicionada pelo painel' : 'Recebida pelo site';
        return `
            <article class="adm-item">
                <header class="adm-item-topo">
                    <span class="adm-status st-${esc(i.status)}">${ROTULO_STATUS[i.status] || esc(i.status)}</span>
                    <span class="adm-meta">${origem} · ${dataHora(i.criadoEm)}</span>
                </header>
                ${colecao === 'agendas' ? avisoConflito(i) : ''}
                <div class="adm-campos">${camposDe(colecao, i)}</div>
                <footer class="adm-acoes">${acoesDe(colecao, i)}</footer>
            </article>`;
    }

    function render() {
        document.querySelectorAll('.adm-tab').forEach((botao) => {
            const aba = botao.getAttribute('data-aba');
            botao.classList.toggle('ativa', aba === abaAtiva);
            const pendentes = dados[aba].filter((i) => i.status === COLECOES[aba].pendente).length;
            const selo = botao.querySelector('.adm-selo');
            selo.textContent = pendentes;
            selo.hidden = pendentes === 0;
        });

        Object.keys(COLECOES).forEach((colecao) => {
            const painel = document.getElementById('admAba-' + colecao);
            painel.hidden = colecao !== abaAtiva;

            document.getElementById('admFiltros-' + colecao).innerHTML = COLECOES[colecao].filtros
                .map(([valor, rotulo]) => {
                    const total = valor === 'todas'
                        ? dados[colecao].length
                        : dados[colecao].filter((i) => i.status === valor).length;
                    return `<button type="button" class="adm-chip${filtro[colecao] === valor ? ' ativa' : ''}" data-filtro="${valor}" data-colecao="${colecao}">${rotulo} <b>${total}</b></button>`;
                })
                .join('');

            const itens = dados[colecao].filter((i) => passaFiltro(colecao, i));
            const ordenados = colecao === 'agendas'
                ? itens.slice().sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`))
                : itens;
            document.getElementById('admLista-' + colecao).innerHTML = ordenados.length
                ? ordenados.map((i) => cartao(colecao, i)).join('')
                : `<div class="adm-vazio">${COLECOES[colecao].vazio}</div>`;
        });
    }

    /* ---------------- ações (validar, recusar, excluir) ---------------- */
    painelBox.addEventListener('click', async (e) => {
        const chip = e.target.closest('.adm-chip');
        if (chip) {
            filtro[chip.getAttribute('data-colecao')] = chip.getAttribute('data-filtro');
            render();
            return;
        }

        const botao = e.target.closest('.adm-btn[data-acao]');
        if (!botao) return;

        const acao = botao.getAttribute('data-acao');
        const colecao = botao.getAttribute('data-colecao');
        const id = botao.getAttribute('data-id');

        try {
            if (acao === 'excluir') {
                if (!window.confirm('Excluir este registro definitivamente? Esta ação não pode ser desfeita.')) return;
                botao.disabled = true;
                await api('excluir', { colecao, id });
                dados[colecao] = dados[colecao].filter((i) => i.id !== id);
                jbToast('Registro excluído', 'Ele foi removido do painel.');
            } else {
                botao.disabled = true;
                const r = await api('status', { colecao, id, status: acao });
                dados[colecao] = dados[colecao].map((i) => (i.id === id ? r.registro : i));
                const msgs = {
                    validada: ['Validado!', colecao === 'agendas' ? 'A agenda já aparece na página pública.' : 'Registro validado.'],
                    recusada: ['Não validado', colecao === 'agendas' ? 'A agenda não aparece na página pública.' : 'Registro marcado como não validado.'],
                    lida: ['Marcada como lida', ''],
                    nova: ['Marcada como nova', '']
                };
                const m = msgs[acao];
                jbToast(m[0], m[1] || 'Atualizado com sucesso.');
            }
            render();
        } catch (err) {
            botao.disabled = false;
            jbToast('Não foi possível concluir', err.message, 'erro');
        }
    });

    /* ---------------- nova agenda manual ---------------- */
    document.getElementById('admNovaToggle').addEventListener('click', () => {
        novaBox.hidden = !novaBox.hidden;
        if (!novaBox.hidden) document.getElementById('admIgreja').focus();
    });
    document.getElementById('admNovaCancelar').addEventListener('click', () => { novaBox.hidden = true; });

    novaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!jbValidate(novaForm)) return;
        const v = (id) => document.getElementById(id).value.trim();
        const btn = novaForm.querySelector('button[type="submit"]');
        jbSetLoading(btn, true);
        try {
            const r = await api('criarAgenda', {
                agenda: {
                    igreja: v('admIgreja'), endereco: v('admEndereco'), data: v('admData'),
                    horario: v('admHorario'), nome: v('admNome'), cargo: v('admCargo'), contato: v('admContato')
                }
            });
            dados.agendas.unshift(r.registro);
            filtro.agendas = 'validada';
            novaForm.reset();
            novaForm.classList.remove('was-validated');
            novaBox.hidden = true;
            render();
            jbToast('Agenda adicionada!', 'Ela já aparece como validada na página pública.');
        } catch (err) {
            jbToast('Não foi possível adicionar', err.message, 'erro');
        }
        jbSetLoading(btn, false);
    });

    /* ---------------- início ---------------- */
    if (token) {
        carregar().then(() => mostrarPainel(true)).catch(() => sair());
    }

    // Atualiza sozinho a cada 60 segundos enquanto o painel está aberto
    setInterval(() => {
        if (!painelBox.hidden && token && !document.hidden) carregar().catch(() => {});
    }, 60000);
})();
