/* --- SCRIPT 1: TRANSIÇÃO AO ROLAR DE TELA (INTERSECTION OBSERVER) --- */
        document.addEventListener('DOMContentLoaded', () => {
            const videoSection = document.querySelector('.video-gallery-section');
            if (!videoSection) return;

            const observerOptions = {
                threshold: 0.15
            };

            const sectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        videoSection.classList.add('is-visible');
                    }
                });
            }, observerOptions);

            sectionObserver.observe(videoSection);
        });

        /* --- SCRIPT 2: CURSOR FLUTUANTE DO CARROSSEL --- */
        const customCursor = document.querySelector('.drag-cursor-fluid');
        let posX = 0, posY = 0;     
        let mouseX = 0, mouseY = 0; 

        if (customCursor) {
            window.addEventListener('mousemove', (e) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
            });

            function animateCursor() {
                posX += (mouseX - posX) * 0.1;
                posY += (mouseY - posY) * 0.1;

                customCursor.style.left = `${posX}px`;
                customCursor.style.top = `${posY}px`;

                requestAnimationFrame(animateCursor);
            }

            if (window.innerWidth > 1024) {
                animateCursor();
            }
        }

        /* --- SCRIPT 3: MODAL E REPRODUÇÃO DE VÍDEO --- */
        document.addEventListener('DOMContentLoaded', () => {
            const cards = document.querySelectorAll('.video-card');
            const modal = document.getElementById('videoModal');
            const closeModal = document.getElementById('closeModal');
            const videoPlayer = document.getElementById('localVideoPlayer');

            if (!modal || !closeModal || !videoPlayer) return;

            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const videoSrc = card.getAttribute('data-video-src');
                    if (videoSrc) {
                        videoPlayer.src = videoSrc;
                        modal.classList.add('active');
                        videoPlayer.play();
                    }
                });
            });

            const stopAndCloseVideo = () => {
                modal.classList.remove('active');
                videoPlayer.pause();
                videoPlayer.currentTime = 0;
                videoPlayer.src = '';
            };

            closeModal.addEventListener('click', stopAndCloseVideo);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    stopAndCloseVideo();
                }
            });
        });

        /* --- SCRIPT 4: FORMULÁRIO "DEIXE UMA MENSAGEM" (AVISO AUTOMÁTICO NO WHATSAPP DO MÚSICO) --- */
        document.addEventListener('DOMContentLoaded', () => {
            const whatsappForm = document.getElementById('whatsappForm');

            if (whatsappForm) {
                whatsappForm.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const nome = document.getElementById('formName').value.trim();
                    const mensagem = document.getElementById('formMessage').value.trim();
                    if (!nome || !mensagem) return;

                    const btn = whatsappForm.querySelector('button[type="submit"]');
                    const payload = { tipo: 'contato', nome, mensagem, website: jbIsca(whatsappForm) };

                    jbSetLoading(btn, true);
                    const ok = await jbEnviar(payload);
                    jbSetLoading(btn, false);

                    if (ok) {
                        whatsappForm.reset();
                        jbToast('Mensagem enviada!', 'Recebemos sua mensagem e retornaremos em breve.');
                    } else {
                        jbToast('Não foi possível enviar', 'Tente novamente em instantes.', 'erro');
                    }
                });
            }
        });

        /* --- SCRIPT 5: FORMULÁRIO "TRABALHE CONOSCO" (AVISO AUTOMÁTICO NO WHATSAPP DO MÚSICO) --- */
        document.addEventListener('DOMContentLoaded', () => {
            const tcForm = document.getElementById('trabalheForm');

            if (tcForm) {
                tcForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (!jbValidate(tcForm)) return;

                    const g = id => document.getElementById(id).value.trim();
                    const btn = tcForm.querySelector('button[type="submit"]');
                    const payload = {
                        tipo: 'trabalhe',
                        nome: g('tcNome'),
                        contato: g('tcContato'),
                        idade: g('tcIdade'),
                        email: g('tcEmail'),
                        endereco: g('tcEndereco'),
                        igreja: g('tcIgreja'),
                        enderecoIgreja: g('tcEnderecoIgreja'),
                        mensagem: g('tcMensagem'),
                        website: jbIsca(tcForm)
                    };

                    jbSetLoading(btn, true);
                    const ok = await jbEnviar(payload);
                    jbSetLoading(btn, false);

                    if (ok) {
                        jbSubmitted(tcForm);
                        jbToast('Inscrição enviada!', 'Recebemos seus dados e entraremos em contato em breve.');
                    } else {
                        jbToast('Não foi possível enviar', 'Tente novamente em instantes.', 'erro');
                    }
                });
            }
        });

        /* --- SCRIPT 6: AGENDA (SALVA NO LOCALSTORAGE E LISTA POR MÊS) --- */
        document.addEventListener('DOMContentLoaded', () => {
            const AGENDA_KEY = 'jbmusic_agendas';
            const MESES = [
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ];
            const DIAS_SEMANA = [
                'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
                'Quinta-feira', 'Sexta-feira', 'Sábado'
            ];

            const agendaForm = document.getElementById('agendaForm');
            const agendaList = document.getElementById('agendaList');
            const agendaMonthLabel = document.getElementById('agendaMonthLabel');
            const agendaPrevMonth = document.getElementById('agendaPrevMonth');
            const agendaNextMonth = document.getElementById('agendaNextMonth');
            const agendaTodayBtn = document.getElementById('agendaTodayBtn');

            if (!agendaList || !agendaMonthLabel) return;

            let viewDate = new Date();
            viewDate.setDate(1);

            function getAgendas() {
                try {
                    const data = JSON.parse(localStorage.getItem(AGENDA_KEY));
                    return Array.isArray(data) ? data : [];
                } catch (err) {
                    return [];
                }
            }

            function saveAgenda(agenda) {
                const agendas = getAgendas();
                agendas.push(agenda);
                localStorage.setItem(AGENDA_KEY, JSON.stringify(agendas));
            }

            function escapeHtml(str) {
                const div = document.createElement('div');
                div.textContent = str || '';
                return div.innerHTML;
            }

            function renderAgendaList() {
                const ano = viewDate.getFullYear();
                const mes = viewDate.getMonth(); // 0-11

                agendaMonthLabel.textContent = `${MESES[mes]} de ${ano}`;

                const doMes = getAgendas()
                    .filter(a => {
                        if (!a.data) return false;
                        const [y, m] = a.data.split('-').map(Number);
                        return y === ano && (m - 1) === mes;
                    })
                    .sort((a, b) => a.data.localeCompare(b.data));

                if (doMes.length === 0) {
                    agendaList.innerHTML = `<div class="agenda-empty">Nenhum evento agendado em ${MESES[mes].toLowerCase()}.</div>`;
                    return;
                }

                const grupos = {};
                doMes.forEach(a => {
                    if (!grupos[a.data]) grupos[a.data] = [];
                    grupos[a.data].push(a);
                });

                let html = '';
                Object.keys(grupos).sort().forEach(dataStr => {
                    const [y, m, d] = dataStr.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    const diaSemana = DIAS_SEMANA[dateObj.getDay()];

                    let eventosHtml = '';
                    grupos[dataStr].forEach(a => {
                        const tel = (a.contato || '').replace(/\D/g, '');
                        const contatoHtml = tel
                            ? `<a href="https://wa.me/55${tel}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.contato)}</a>`
                            : '—';
                        eventosHtml += `
                            <div class="agenda-event-row">
                                <div class="agenda-cell agenda-cell-igreja"><span class="agenda-dot"></span><span>${escapeHtml(a.igreja)}</span></div>
                                <div class="agenda-cell" data-label="Endereço">${escapeHtml(a.endereco) || '—'}</div>
                                <div class="agenda-cell agenda-cell-horario" data-label="Horário">${escapeHtml(a.horario)}</div>
                                <div class="agenda-cell agenda-cell-nome" data-label="Responsável"><strong>${escapeHtml(a.nome)}</strong> <small>${escapeHtml(a.cargo)}</small></div>
                                <div class="agenda-cell agenda-cell-contato" data-label="Contato">${contatoHtml}</div>
                            </div>`;
                    });

                    html += `
                        <div class="agenda-date-group">
                            <div class="agenda-date-row">
                                <span class="agenda-date-text">${d} de ${MESES[m - 1]} de ${y}</span>
                                <span class="agenda-weekday">${diaSemana}</span>
                            </div>
                            <div class="agenda-events">${eventosHtml}</div>
                        </div>`;
                });

                const cabecalho = `
                    <div class="agenda-cols-head">
                        <span>Igreja</span><span>Endereço</span><span>Horário</span><span>Responsável</span><span>Contato</span>
                    </div>`;
                agendaList.innerHTML = cabecalho + html;
            }

            if (agendaPrevMonth) {
                agendaPrevMonth.addEventListener('click', () => {
                    viewDate.setMonth(viewDate.getMonth() - 1);
                    renderAgendaList();
                });
            }

            if (agendaNextMonth) {
                agendaNextMonth.addEventListener('click', () => {
                    viewDate.setMonth(viewDate.getMonth() + 1);
                    renderAgendaList();
                });
            }

            if (agendaTodayBtn) {
                agendaTodayBtn.addEventListener('click', () => {
                    viewDate = new Date();
                    viewDate.setDate(1);
                    renderAgendaList();
                });
            }

            if (agendaForm) {
                agendaForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (!jbValidate(agendaForm)) return;

                    const btn = agendaForm.querySelector('button[type="submit"]');
                    const agenda = {
                        nome: document.getElementById('agendaNome').value.trim(),
                        cargo: document.getElementById('agendaCargo').value.trim(),
                        igreja: document.getElementById('agendaIgreja').value.trim(),
                        endereco: document.getElementById('agendaEndereco').value.trim(),
                        contato: document.getElementById('agendaContato').value.trim(),
                        data: document.getElementById('agendaData').value,
                        horario: document.getElementById('agendaHorario').value
                    };

                    if (!agenda.nome || !agenda.igreja || !agenda.data) return;

                    jbSetLoading(btn, true);
                    const ok = await jbEnviar({ tipo: 'agenda', ...agenda, website: jbIsca(agendaForm) });
                    jbSetLoading(btn, false);

                    if (!ok) {
                        jbToast('Não foi possível enviar', 'Tente novamente em instantes.', 'erro');
                        return;
                    }

                    saveAgenda(agenda);

                    const [y, m] = agenda.data.split('-').map(Number);
                    viewDate = new Date(y, m - 1, 1);
                    renderAgendaList();

                    jbSubmitted(agendaForm);
                    jbToast('Agenda enviada!', 'Sua agenda foi enviada e será avaliada e confirmada pelo WhatsApp.');
                });
            }

            renderAgendaList();
        });

        /* --- SCRIPT 7: CARDS DE PROJETOS EXPANSÍVEIS AO CLICAR --- */
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.projeto-card.is-expandable').forEach(card => {
                card.addEventListener('click', () => {
                    card.classList.toggle('active');
                });
            });
        });


        /* --- SCRIPT 8: INTERAÇÃO DOS FORMULÁRIOS (VALIDAÇÃO BOOTSTRAP, MÁSCARA, CONTADOR) --- */
        function jbValidate(form) {
            if (form.checkValidity()) return true;
            form.classList.add('was-validated');
            const firstInvalid = form.querySelector(':invalid');
            if (firstInvalid) {
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalid.focus({ preventScroll: true });
            }
            return false;
        }

        function jbSubmitted(form) {
            form.reset();
            form.classList.remove('was-validated');
            form.querySelectorAll('textarea[data-counter]').forEach(t => t.dispatchEvent(new Event('input')));
        }

        function jbSetLoading(btn, ativo) {
            if (!btn) return;
            btn.disabled = ativo;
            btn.classList.toggle('is-loading', ativo);
        }

        function jbIsca(form) {
            const campo = form.querySelector('[name="website"]');
            return campo ? campo.value : '';
        }

        /* Envia os dados para a função /api/notificar, que avisa o músico no WhatsApp. */
        async function jbEnviar(payload) {
            if (window.JB_PREVIEW) {
                await new Promise(r => setTimeout(r, 700));
                return true;
            }
            try {
                const resposta = await fetch('/api/notificar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, origem: location.href.split(/[?#]/)[0] })
                });
                const dados = await resposta.json().catch(() => ({}));
                return resposta.ok && dados.ok === true;
            } catch (err) {
                return false;
            }
        }

        /* Aviso que desce do topo (sucesso ou erro) */
        function jbToast(titulo, texto, tipo) {
            let t = document.getElementById('jbToast');
            if (!t) {
                t = document.createElement('div');
                t.id = 'jbToast';
                t.className = 'agenda-toast';
                t.setAttribute('role', 'status');
                t.innerHTML = '<div class="agenda-toast-icon"></div><div class="agenda-toast-text"><strong></strong><span></span></div><button type="button" class="agenda-toast-close" aria-label="Fechar aviso">&times;</button>';
                document.body.appendChild(t);
                t.querySelector('.agenda-toast-close').addEventListener('click', () => t.classList.remove('show'));
            }
            t.classList.toggle('is-error', tipo === 'erro');
            t.querySelector('.agenda-toast-icon').innerHTML = tipo === 'erro' ? '&#33;' : '&#10003;';
            t.querySelector('strong').textContent = titulo;
            t.querySelector('span').textContent = texto;
            t.classList.add('show');
            clearTimeout(t._hide);
            t._hide = setTimeout(() => t.classList.remove('show'), 6500);
        }

        document.addEventListener('DOMContentLoaded', () => {
            // Máscara de telefone brasileiro: (21) 99999-9999
            document.querySelectorAll('input[data-mask="phone"]').forEach(input => {
                input.addEventListener('input', () => {
                    let v = input.value.replace(/\D/g, '').slice(0, 11);
                    if (v.length > 6) {
                        v = v.length > 10
                            ? `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
                            : `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
                    } else if (v.length > 2) {
                        v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                    } else if (v.length > 0) {
                        v = `(${v}`;
                    }
                    input.value = v;
                });
            });

            // Contador de caracteres dos campos de texto longo
            document.querySelectorAll('textarea[data-counter]').forEach(area => {
                const counter = document.getElementById(area.getAttribute('data-counter'));
                if (!counter) return;
                const update = () => { counter.textContent = area.value.length; };
                area.addEventListener('input', update);
                update();
            });

            // Não permitir agendar datas no passado
            const agendaData = document.getElementById('agendaData');
            if (agendaData) {
                const hoje = new Date();
                const mm = String(hoje.getMonth() + 1).padStart(2, '0');
                const dd = String(hoje.getDate()).padStart(2, '0');
                agendaData.min = `${hoje.getFullYear()}-${mm}-${dd}`;
            }
        });
