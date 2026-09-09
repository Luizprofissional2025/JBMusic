/* =========================================================
   1) CURSOR CUSTOMIZADO
   Move o círculo junto com o mouse e aumenta o tamanho
   quando passa sobre qualquer elemento com classe "cursor-hover".
========================================================= */
const cursor = document.getElementById('customCursor');

document.addEventListener('mousemove', (evento) => {
  cursor.style.left = evento.clientX + 'px';
  cursor.style.top = evento.clientY + 'px';
});

// Todos os elementos que devem "ativar" o cursor grande
const elementosComHover = document.querySelectorAll('.cursor-hover');

elementosComHover.forEach((elemento) => {
  elemento.addEventListener('mouseenter', () => {
    cursor.classList.add('hover-ativo');
  });
  elemento.addEventListener('mouseleave', () => {
    cursor.classList.remove('hover-ativo');
  });
});


/* =========================================================
   2) CARROSSEL
========================================================= */
const track = document.getElementById('slidesTrack');
const slides = Array.from(track.children);
const dotsContainer = document.getElementById('carouselDots');
const btnPrev = document.getElementById('prevBtn');
const btnNext = document.getElementById('nextBtn');

let slideAtual = 0;
const totalSlides = slides.length;
const tempoAutoplayMs = 6000; // troque aqui o tempo entre slides
let autoplayInterval = null;

// Cria uma bolinha para cada slide
slides.forEach((_, indice) => {
  const dot = document.createElement('button');
  dot.classList.add('dot', 'cursor-hover');
  if (indice === 0) dot.classList.add('ativo');
  dot.addEventListener('click', () => irParaSlide(indice));
  dotsContainer.appendChild(dot);
});

const dots = Array.from(dotsContainer.children);

function atualizarCarrossel() {
  track.style.transform = `translateX(-${slideAtual * 100}%)`;

  dots.forEach((dot, indice) => {
    dot.classList.toggle('ativo', indice === slideAtual);
  });
}

function irParaSlide(indice) {
  slideAtual = indice;
  atualizarCarrossel();
  reiniciarAutoplay();
}

function proximoSlide() {
  slideAtual = (slideAtual + 1) % totalSlides;
  atualizarCarrossel();
}

function slideAnterior() {
  slideAtual = (slideAtual - 1 + totalSlides) % totalSlides;
  atualizarCarrossel();
}

function iniciarAutoplay() {
  autoplayInterval = setInterval(proximoSlide, tempoAutoplayMs);
}

function pararAutoplay() {
  clearInterval(autoplayInterval);
}

function reiniciarAutoplay() {
  pararAutoplay();
  iniciarAutoplay();
}

btnNext.addEventListener('click', () => {
  proximoSlide();
  reiniciarAutoplay();
});

btnPrev.addEventListener('click', () => {
  slideAnterior();
  reiniciarAutoplay();
});

// Pausa o autoplay quando o mouse está sobre o carrossel
const carrosselEl = document.getElementById('carousel');
carrosselEl.addEventListener('mouseenter', pararAutoplay);
carrosselEl.addEventListener('mouseleave', iniciarAutoplay);

// Inicializa tudo
atualizarCarrossel();
iniciarAutoplay();
