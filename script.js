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

        /* --- SCRIPT 4: FORMULÁRIO DE CONTATO -> WHATSAPP --- */
        document.addEventListener('DOMContentLoaded', () => {
            const whatsappForm = document.getElementById('whatsappForm');
            const WHATSAPP_NUMBER = '5521990738646'; // 55 + DDD 21 + número

            if (whatsappForm) {
                whatsappForm.addEventListener('submit', (e) => {
                    e.preventDefault();

                    const name = document.getElementById('formName').value.trim();
                    const message = document.getElementById('formMessage').value.trim();

                    if (!name || !message) return;

                    const text = `💬 *NOVA MENSAGEM*\n${jbOrigin('Formulário do rodapé - ' + document.title.replace('JBMUSIC - ', ''))}\n\n👤 *Nome:* ${name}\n\n${message}`;
                    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

                    window.open(whatsappUrl, '_blank');
                    whatsappForm.reset();
                });
            }
        });

        /* --- SCRIPT 5: FORMULÁRIO "TRABALHE CONOSCO" -> WHATSAPP --- */
        document.addEventListener('DOMContentLoaded', () => {
            const tcForm = document.getElementById('trabalheForm');
            const WHATSAPP_NUMBER = '5521990738646';

            if (tcForm) {
                tcForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (!jbValidate(tcForm)) return;

                    const nome = document.getElementById('tcNome').value.trim();
                    const contato = document.getElementById('tcContato').value.trim();
                    const idade = document.getElementById('tcIdade').value.trim();
                    const email = document.getElementById('tcEmail').value.trim();
                    const endereco = document.getElementById('tcEndereco').value.trim();
                    const igreja = document.getElementById('tcIgreja').value.trim();
                    const enderecoIgreja = document.getElementById('tcEnderecoIgreja').value.trim();
                    const mensagem = document.getElementById('tcMensagem').value.trim();

                    if (!nome || !contato) return;

                    const text =
                        `🎤 *NOVA INSCRIÇÃO - TRABALHE CONOSCO*\n` +
                        `${jbOrigin('Trabalhe conosco')}\n\n` +
                        `👤 *Nome:* ${nome}\n` +
                        `📞 *Contato:* ${contato}\n` +
                        `🎂 *Idade:* ${idade}\n` +
                        `✉️ *E-mail:* ${email}\n` +
                        `🏠 *Endereço:* ${endereco}\n` +
                        `⛪ *Igreja:* ${igreja}\n` +
                        `📌 *Endereço da igreja:* ${enderecoIgreja}\n\n` +
                        `💬 *Sobre mim:* ${mensagem}`;

                    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

                    window.open(whatsappUrl, '_blank');
                    jbSubmitted(tcForm);
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
            const agendaToast = document.getElementById('agendaToast');
            const agendaToastClose = document.getElementById('agendaToastClose');

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

            function showAgendaToast() {
                if (!agendaToast) return;
                agendaToast.classList.add('show');
                clearTimeout(agendaToast._hideTimeout);
                agendaToast._hideTimeout = setTimeout(() => {
                    agendaToast.classList.remove('show');
                }, 6000);
            }

            if (agendaToastClose) {
                agendaToastClose.addEventListener('click', () => {
                    agendaToast.classList.remove('show');
                    clearTimeout(agendaToast._hideTimeout);
                });
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
                agendaForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (!jbValidate(agendaForm)) return;

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

                    saveAgenda(agenda);

                    const [y, m] = agenda.data.split('-').map(Number);
                    viewDate = new Date(y, m - 1, 1);
                    renderAgendaList();

                    jbSubmitted(agendaForm);

                    if (agendaToast) {
                        showAgendaToast();
                    }

                    const [ay, am, ad] = agenda.data.split('-').map(Number);
                    const diaSemana = DIAS_SEMANA[new Date(ay, am - 1, ad).getDay()];
                    const textoAgenda =
                        `📅 *NOVA SOLICITAÇÃO DE AGENDA*\n` +
                        `${jbOrigin('Agenda')}\n\n` +
                        `⛪ *Igreja:* ${agenda.igreja}\n` +
                        `📌 *Endereço:* ${agenda.endereco}\n` +
                        `📆 *Dia:* ${String(ad).padStart(2, '0')}/${String(am).padStart(2, '0')}/${ay} (${diaSemana})\n` +
                        `🕒 *Horário:* ${agenda.horario}\n` +
                        `👤 *Responsável:* ${agenda.nome} (${agenda.cargo})\n` +
                        `📞 *Contato:* ${agenda.contato}`;
                    window.open(`https://wa.me/5521990738646?text=${encodeURIComponent(textoAgenda)}`, '_blank');
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
            const btn = form.querySelector('button[type="submit"]');
            if (btn) {
                btn.classList.add('is-loading');
                setTimeout(() => btn.classList.remove('is-loading'), 900);
            }
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


        /* Identifica de qual página/formulário do site a mensagem saiu (aparece no WhatsApp) */
        function jbOrigin(secao) {
            const url = location.href.split(/[?#]/)[0];
            return `📍 *Origem:* Site JBMusic › ${secao}\n🔗 ${url}`;
        }
