        /* --- SCRIPT 1: TRANSIÇÃO AO ROLAR DE TELA (INTERSECTION OBSERVER) --- */
        document.addEventListener('DOMContentLoaded', () => {
            const videoSection = document.querySelector('.video-gallery-section');

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

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateCursor() {
            posX += (mouseX - posX) * 0.1;
            posY += (mouseY - posY) * 0.1;

            if(customCursor) {
                customCursor.style.left = `${posX}px`;
                customCursor.style.top = `${posY}px`;
            }

            requestAnimationFrame(animateCursor);
        }

        if (window.innerWidth > 1024) {
            animateCursor();
        }

        /* --- SCRIPT 3: MODAL E REPRODUÇÃO DE VÍDEO --- */
        document.addEventListener('DOMContentLoaded', () => {
            const cards = document.querySelectorAll('.video-card');
            const modal = document.getElementById('videoModal');
            const closeModal = document.getElementById('closeModal');
            const videoPlayer = document.getElementById('localVideoPlayer');

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

                    const text = `Olá, meu nome é ${name}.\n\n${message}`;
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

                    const nome = document.getElementById('tcNome').value.trim();
                    const contato = document.getElementById('tcContato').value.trim();
                    const idade = document.getElementById('tcIdade').value.trim();
                    const email = document.getElementById('tcEmail').value.trim();
                    const endereco = document.getElementById('tcEndereco').value.trim();
                    const igreja = document.getElementById('tcIgreja').value.trim();
                    const mensagem = document.getElementById('tcMensagem').value.trim();

                    if (!nome || !contato) return;

                    const text =
                        `Olá! Quero fazer parte do movimento JBMusic.\n\n` +
                        `Nome: ${nome}\n` +
                        `Contato: ${contato}\n` +
                        `Idade: ${idade}\n` +
                        `E-mail: ${email}\n` +
                        `Endereço: ${endereco}\n` +
                        `Igreja: ${igreja}\n\n` +
                        `Sobre mim: ${mensagem}`;

                    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

                    window.open(whatsappUrl, '_blank');
                    tcForm.reset();
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

            const agendaForm = document.getElementById('agendaForm');
            const agendaAccordion = document.getElementById('agendaAccordion');
            const agendaConfirmModalEl = document.getElementById('agendaConfirmModal');

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

            function formatDate(dateStr) {
                const partes = dateStr.split('-');
                if (partes.length !== 3) return dateStr;
                const [ano, mes, dia] = partes;
                return `${dia}/${mes}/${ano}`;
            }

            function escapeHtml(str) {
                const div = document.createElement('div');
                div.textContent = str || '';
                return div.innerHTML;
            }

            function renderAgendas() {
                if (!agendaAccordion) return;

                const agendas = getAgendas();
                agendaAccordion.innerHTML = '';

                MESES.forEach((mesNome, index) => {
                    const numeroMes = index + 1;

                    const itensDoMes = agendas
                        .filter(a => a.data && parseInt(a.data.split('-')[1], 10) === numeroMes)
                        .sort((a, b) => a.data.localeCompare(b.data));

                    const collapseId = `mes-${numeroMes}`;

                    let linhas = '';
                    if (itensDoMes.length === 0) {
                        linhas = `<tr><td colspan="5" class="text-center text-muted py-3">Nenhuma agenda para ${mesNome}</td></tr>`;
                    } else {
                        itensDoMes.forEach(a => {
                            linhas += `
                                <tr>
                                    <td>${formatDate(a.data)}</td>
                                    <td>${escapeHtml(a.horario)}</td>
                                    <td>${escapeHtml(a.igreja)}</td>
                                    <td>${escapeHtml(a.nome)} <span class="text-muted">(${escapeHtml(a.cargo)})</span></td>
                                    <td>${escapeHtml(a.contato)}</td>
                                </tr>`;
                        });
                    }

                    const item = document.createElement('div');
                    item.className = 'accordion-item';
                    item.innerHTML = `
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                                ${mesNome} <span class="badge-count ms-2">${itensDoMes.length}</span>
                            </button>
                        </h2>
                        <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#agendaAccordion">
                            <div class="accordion-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-dark table-hover align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Horário</th>
                                                <th>Igreja</th>
                                                <th>Responsável</th>
                                                <th>Contato</th>
                                            </tr>
                                        </thead>
                                        <tbody>${linhas}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>`;

                    agendaAccordion.appendChild(item);
                });
            }

            if (agendaForm) {
                agendaForm.addEventListener('submit', (e) => {
                    e.preventDefault();

                    const agenda = {
                        nome: document.getElementById('agendaNome').value.trim(),
                        cargo: document.getElementById('agendaCargo').value.trim(),
                        igreja: document.getElementById('agendaIgreja').value.trim(),
                        contato: document.getElementById('agendaContato').value.trim(),
                        data: document.getElementById('agendaData').value,
                        horario: document.getElementById('agendaHorario').value
                    };

                    if (!agenda.nome || !agenda.igreja || !agenda.data) return;

                    saveAgenda(agenda);
                    renderAgendas();
                    agendaForm.reset();

                    if (agendaConfirmModalEl && window.bootstrap) {
                        const confirmModal = new bootstrap.Modal(agendaConfirmModalEl);
                        confirmModal.show();
                    }
                });
            }

            renderAgendas();
        });
