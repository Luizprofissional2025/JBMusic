// ============================================
// Ano no rodapé
// ============================================
document.getElementById('year').textContent = new Date().getFullYear();

// ============================================
// Menu mobile
// ============================================
const menuToggle = document.getElementById('menu-toggle');
const mainNav = document.getElementById('main-nav');

menuToggle.addEventListener('click', () => {
  mainNav.classList.toggle('is-open');
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mainNav.classList.remove('is-open'));
});

// ============================================
// Cartões accordion — clique/toque (mobile e acessibilidade)
// hover já é tratado só em CSS quando há mouse
// ============================================
const cards = document.querySelectorAll('.reveal-cards .card');

function setActive(card){
  cards.forEach(c => c.classList.toggle('is-active', c === card));
}

const isCoarsePointer = window.matchMedia('(hover: none)').matches;

if (isCoarsePointer) {
  // primeiro cartão ativo por padrão em telas de toque
  setActive(cards[0]);

  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (!card.classList.contains('is-active')) {
        e.preventDefault();
        setActive(card);
      }
    });
  });
}

// ============================================
// Newsletter (demonstração — sem backend)
// ============================================
const form = document.getElementById('newsletter-form');
const note = document.getElementById('newsletter-note');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = form.querySelector('input').value;
  note.textContent = `Obrigado! Em breve novidades chegarão em ${email}.`;
  form.reset();
});

// ============================================
// Chuva animada no hero (canvas leve)
// ============================================
const canvas = document.getElementById('rain-canvas');
const ctx = canvas.getContext('2d');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let drops = [];
let rafId = null;

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function makeDrops(){
  const count = Math.floor((canvas.width * canvas.height) / 22000);
  drops = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    len: 10 + Math.random() * 18,
    speed: 3 + Math.random() * 5,
    opacity: 0.08 + Math.random() * 0.18
  }));
}

function drawRain(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(160, 190, 240, 1)';
  ctx.lineWidth = 1;

  drops.forEach(d => {
    ctx.globalAlpha = d.opacity;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x, d.y + d.len);
    ctx.stroke();

    d.y += d.speed;
    if (d.y > canvas.height) {
      d.y = -d.len;
      d.x = Math.random() * canvas.width;
    }
  });

  ctx.globalAlpha = 1;
  rafId = requestAnimationFrame(drawRain);
}

function startRain(){
  resize();
  makeDrops();
  if (!prefersReducedMotion) {
    cancelAnimationFrame(rafId);
    drawRain();
  }
}

window.addEventListener('resize', () => {
  resize();
  makeDrops();
});

startRain();
