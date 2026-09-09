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

        /* --- SCRIPT 1B: SETAS DE NAVEGAÇÃO + PARALLAX DE FUNDO DO CARROSSEL --- */
        document.addEventListener('DOMContentLoaded', () => {
            const carousel = document.querySelector('.accordion-carousel');
            const panels = Array.from(document.querySelectorAll('.accordion-panel'));
            const prevBtn = document.querySelector('.carousel-nav.prev');
            const nextBtn = document.querySelector('.carousel-nav.next');

            if (!carousel || panels.length === 0) return;

            let activeIndex = 0;

            const setActive = (index) => {
                activeIndex = (index + panels.length) % panels.length;
                panels.forEach((panel, i) => {
                    panel.classList.toggle('is-active', i === activeIndex);
                });
            };

            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setActive(activeIndex - 1);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setActive(activeIndex + 1);
                });
            }

            panels.forEach((panel, i) => {
                const bg = panel.querySelector('.panel-background');

                // Passar o mouse sincroniza as setas para continuarem a partir daqui
                panel.addEventListener('mouseenter', () => {
                    activeIndex = i;
                });

                // Parallax sutil: a imagem de fundo acompanha o mouse dentro do painel
                panel.addEventListener('mousemove', (e) => {
                    if (!bg) return;
                    const rect = panel.getBoundingClientRect();
                    const px = ((e.clientX - rect.left) / rect.width - 0.5) * 2;  // -1 a 1
                    const py = ((e.clientY - rect.top) / rect.height - 0.5) * 2;  // -1 a 1
                    bg.style.setProperty('--px', `${px * 14}px`);
                    bg.style.setProperty('--py', `${py * 14}px`);
                });

                panel.addEventListener('mouseleave', () => {
                    if (!bg) return;
                    bg.style.setProperty('--px', '0px');
                    bg.style.setProperty('--py', '0px');
                });
            });
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
