const header = document.querySelector('#header');
const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('#mobile-menu');
const progressBar = document.querySelector('.progress span');
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

let scrollFrame = 0;
function updatePageChrome() {
  const scrollY = window.scrollY;
  header.classList.toggle('scrolled', scrollY > 10);
  const scrollable = root.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(1, scrollY / scrollable) : 0;
  progressBar.style.width = `${progress * 100}%`;

  if (!reducedMotion) {
    const heroProgress = Math.min(1, scrollY / Math.max(1, window.innerHeight));
    root.style.setProperty('--copy-shift', `${heroProgress * 48}px`);
    root.style.setProperty('--stage-y', `${heroProgress * -38}px`);
    root.style.setProperty('--orbit-shift', `${heroProgress * 110}px`);
    root.style.setProperty('--orbit-spin', `${heroProgress * 22}deg`);

    document.querySelectorAll('.project').forEach((project) => {
      const rect = project.getBoundingClientRect();
      const centerDelta = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      project.style.setProperty('--art-shift', `${Math.max(-18, Math.min(18, centerDelta * -28))}px`);
    });

    const promise = document.querySelector('.promise');
    if (promise) {
      const rect = promise.getBoundingClientRect();
      const shift = Math.max(-60, Math.min(60, (rect.top / window.innerHeight) * 45));
      root.style.setProperty('--promise-shift', `${shift}px`);
    }
  }
  scrollFrame = 0;
}

function requestChromeUpdate() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updatePageChrome);
}

updatePageChrome();
window.addEventListener('scroll', requestChromeUpdate, { passive: true });
window.addEventListener('resize', requestChromeUpdate, { passive: true });

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'פתיחת תפריט');
  mobileMenu.hidden = true;
  header.classList.remove('menu-open');
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  if (isOpen) {
    closeMenu();
    return;
  }
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'סגירת תפריט');
  mobileMenu.hidden = false;
  header.classList.add('menu-open');
});

mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});

document.querySelector('#year').textContent = new Date().getFullYear();

const revealItems = document.querySelectorAll('.reveal');
const scramble = (element) => {
  if (reducedMotion || element.dataset.scrambled) return;
  element.dataset.scrambled = 'true';
  const finalText = element.textContent;
  const glyphs = 'אבגדהוזחטיכלמנסעפצקרשת';
  let frame = 0;
  const totalFrames = 18;
  const animate = () => {
    const settled = Math.floor((frame / totalFrames) * finalText.length);
    element.textContent = [...finalText].map((char, index) => {
      if (char === ' ' || char === '.') return char;
      return index < settled ? char : glyphs[Math.floor(Math.random() * glyphs.length)];
    }).join('');
    frame += 1;
    if (frame <= totalFrames) requestAnimationFrame(animate);
    else element.textContent = finalText;
  };
  animate();
};

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      entry.target.querySelectorAll('[data-scramble]').forEach(scramble);
      if (entry.target.matches('[data-scramble]')) scramble(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
  revealItems.forEach((item) => observer.observe(item));
}

if (finePointer && !reducedMotion) {
  document.body.classList.add('has-pointer');
  window.addEventListener('pointermove', (event) => {
    root.style.setProperty('--pointer-x', `${event.clientX}px`);
    root.style.setProperty('--pointer-y', `${event.clientY}px`);
  }, { passive: true });

  document.querySelectorAll('[data-depth-scene]').forEach((scene) => {
    scene.addEventListener('pointermove', (event) => {
      const rect = scene.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      scene.style.setProperty('--stage-x', `${x * 14}px`);
      scene.style.setProperty('--stage-rx', `${y * -4}deg`);
      scene.style.setProperty('--stage-ry', `${x * 5}deg`);
    });
    scene.addEventListener('pointerleave', () => {
      scene.style.setProperty('--stage-x', '0px');
      scene.style.setProperty('--stage-rx', '0deg');
      scene.style.setProperty('--stage-ry', '0deg');
    });
  });

  document.querySelectorAll('[data-tilt-card]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--tilt-x', `${y * -5}deg`);
      card.style.setProperty('--tilt-y', `${x * 6}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });

  document.querySelectorAll('.button, .contact-orb').forEach((item) => {
    item.addEventListener('pointermove', (event) => {
      const rect = item.getBoundingClientRect();
      item.style.translate = `${(event.clientX - rect.left - rect.width / 2) * 0.12}px ${(event.clientY - rect.top - rect.height / 2) * 0.12}px`;
    });
    item.addEventListener('pointerleave', () => { item.style.translate = ''; });
  });
}

const lab = document.querySelector('.motion-lab');
const labDisplay = document.querySelector('.lab-display');
const labCoordinate = document.querySelector('.lab-coordinate');
const labModes = {
  signal: ['המותג מגיב אליכם', 'הזיזו את הסמן או החליקו על המסך'],
  orbit: ['עומק שמושך פנימה', 'שכבות, קצב ומרחב שנעים יחד'],
  flow: ['תנועה שמובילה לפעולה', 'אינטראקציה שמשרתת את המסלול העסקי']
};

document.querySelectorAll('[data-lab-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.labMode;
    lab.dataset.mode = mode;
    document.querySelectorAll('[data-lab-mode]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('#lab-title').textContent = labModes[mode][0];
    document.querySelector('#lab-description').textContent = labModes[mode][1];
  });
});

function moveLabPointer(clientX, clientY) {
  const rect = labDisplay.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  labDisplay.style.setProperty('--lab-x', `${x * 100}%`);
  labDisplay.style.setProperty('--lab-y', `${y * 100}%`);
  labDisplay.style.setProperty('--orb-x', `${(x - 0.5) * 30}px`);
  labDisplay.style.setProperty('--orb-y', `${(y - 0.5) * 30}px`);
  labCoordinate.textContent = `X ${String(Math.round(x * 100)).padStart(3, '0')} / Y ${String(Math.round(y * 100)).padStart(3, '0')}`;
}
labDisplay.addEventListener('pointermove', (event) => moveLabPointer(event.clientX, event.clientY), { passive: true });

const canvas = document.querySelector('#signal-canvas');
const context = canvas.getContext('2d');
let canvasFrame = 0;
let canvasActive = false;
let canvasTime = 0;
let particles = [];

function sizeCanvas() {
  const rect = lab.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const count = rect.width < 700 ? 22 : 42;
  particles = Array.from({ length: count }, (_, index) => ({
    x: ((index * 67) % 101) / 101 * rect.width,
    y: ((index * 43) % 97) / 97 * rect.height,
    phase: index * 0.71,
    radius: index % 5 === 0 ? 2.2 : 1.2
  }));
}

function drawCanvas() {
  if (!canvasActive || reducedMotion) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  context.clearRect(0, 0, width, height);
  canvasTime += 0.008;
  const mode = lab.dataset.mode || 'signal';
  const color = mode === 'orbit' ? '167,235,219' : mode === 'flow' ? '255,107,67' : '199,244,59';
  const moved = particles.map((particle) => ({
    ...particle,
    px: particle.x + Math.sin(canvasTime * 4 + particle.phase) * (mode === 'flow' ? 34 : 18),
    py: particle.y + Math.cos(canvasTime * 3 + particle.phase) * (mode === 'orbit' ? 30 : 15)
  }));
  moved.forEach((particle, index) => {
    for (let next = index + 1; next < moved.length; next += 1) {
      const other = moved[next];
      const distance = Math.hypot(particle.px - other.px, particle.py - other.py);
      if (distance < 145) {
        context.strokeStyle = `rgba(${color},${(1 - distance / 145) * 0.16})`;
        context.beginPath();
        context.moveTo(particle.px, particle.py);
        context.lineTo(other.px, other.py);
        context.stroke();
      }
    }
    context.fillStyle = `rgba(${color},${index % 5 === 0 ? 0.9 : 0.42})`;
    context.beginPath();
    context.arc(particle.px, particle.py, particle.radius, 0, Math.PI * 2);
    context.fill();
  });
  canvasFrame = requestAnimationFrame(drawCanvas);
}

if (!reducedMotion && 'IntersectionObserver' in window) {
  const canvasObserver = new IntersectionObserver(([entry]) => {
    canvasActive = entry.isIntersecting;
    cancelAnimationFrame(canvasFrame);
    if (canvasActive) drawCanvas();
  }, { threshold: 0.02 });
  canvasObserver.observe(lab);
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas, { passive: true });
}

// Lightweight autonomous signal field for the first viewport on pointer and touch devices.
const hero = document.querySelector('.hero');
const heroCanvas = document.querySelector('#hero-canvas');
const heroContext = heroCanvas.getContext('2d');
let heroFrame = 0;
let heroActive = false;
let heroTime = 0;
let heroSignals = [];

function sizeHeroCanvas() {
  const rect = hero.getBoundingClientRect();
  const height = hero.offsetHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  heroCanvas.width = Math.max(1, Math.round(rect.width * ratio));
  heroCanvas.height = Math.max(1, Math.round(height * ratio));
  heroCanvas.style.width = `${rect.width}px`;
  heroCanvas.style.height = `${height}px`;
  heroContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  const count = rect.width < 700 ? 20 : 36;
  heroSignals = Array.from({ length: count }, (_, index) => ({
    x: ((index * 83) % 101) / 101 * rect.width,
    y: ((index * 47) % 97) / 97 * height,
    phase: index * 0.73,
    speed: 0.55 + (index % 4) * 0.12
  }));
}

function drawHeroField() {
  if (!heroActive || reducedMotion) return;
  const width = heroCanvas.clientWidth;
  const height = heroCanvas.clientHeight;
  heroContext.clearRect(0, 0, width, height);
  heroTime += 0.012;
  const points = heroSignals.map((signal) => ({
    x: (signal.x + heroTime * 22 * signal.speed) % (width + 40) - 20,
    y: signal.y + Math.sin(heroTime * 2.4 + signal.phase) * 18
  }));
  points.forEach((point, index) => {
    const next = points[(index + 7) % points.length];
    const distance = Math.hypot(point.x - next.x, point.y - next.y);
    if (distance < 270) {
      heroContext.strokeStyle = `rgba(199,244,59,${(1 - distance / 270) * 0.16})`;
      heroContext.beginPath();
      heroContext.moveTo(point.x, point.y);
      heroContext.lineTo(next.x, next.y);
      heroContext.stroke();
    }
    heroContext.fillStyle = index % 5 === 0 ? 'rgba(199,244,59,.9)' : 'rgba(167,235,219,.42)';
    heroContext.beginPath();
    heroContext.arc(point.x, point.y, index % 5 === 0 ? 2 : 1.15, 0, Math.PI * 2);
    heroContext.fill();
  });
  heroFrame = requestAnimationFrame(drawHeroField);
}

if (!reducedMotion) {
  sizeHeroCanvas();
  const heroObserver = new IntersectionObserver(([entry]) => {
    heroActive = entry.isIntersecting;
    cancelAnimationFrame(heroFrame);
    if (heroActive) drawHeroField();
  }, { threshold: 0.01 });
  heroObserver.observe(hero);
  window.addEventListener('resize', sizeHeroCanvas, { passive: true });
}
