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