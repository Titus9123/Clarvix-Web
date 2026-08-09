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

let lastPointerX = null;
let lastPointerY = null;

if (finePointer && !reducedMotion) {
  document.body.classList.add('has-pointer');
  window.addEventListener('pointermove', (event) => {
    root.style.setProperty('--pointer-x', `${event.clientX}px`);
    root.style.setProperty('--pointer-y', `${event.clientY}px`);
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
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

if (lab) {
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
}

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
if (labDisplay) {
  labDisplay.addEventListener('pointermove', (event) => moveLabPointer(event.clientX, event.clientY), { passive: true });
}

const canvas = document.querySelector('#signal-canvas');
const context = canvas ? canvas.getContext('2d') : null;
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

if (canvas && lab && !reducedMotion && 'IntersectionObserver' in window) {
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
const heroContext = heroCanvas ? heroCanvas.getContext('2d') : null;
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

if (hero && heroCanvas && !reducedMotion) {
  sizeHeroCanvas();
  const heroObserver = new IntersectionObserver(([entry]) => {
    heroActive = entry.isIntersecting;
    cancelAnimationFrame(heroFrame);
    if (heroActive) drawHeroField();
  }, { threshold: 0.01 });
  heroObserver.observe(hero);
  window.addEventListener('resize', sizeHeroCanvas, { passive: true });
}

const formatILS = (value) => value.toLocaleString('he-IL');

function pulseAmount(el, value) {
  const from = Number(el.textContent.replace(/[^\d]/g, '')) || 0;
  const to = value;
  if (reducedMotion || from === to) {
    el.textContent = formatILS(to);
    return;
  }
  const duration = 320;
  const start = performance.now();
  el.classList.add('pulse');
  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatILS(Math.round(from + (to - from) * eased));
    if (progress < 1) requestAnimationFrame(tick);
    else el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true });
  }
  requestAnimationFrame(tick);
}

document.querySelectorAll('.plan-toggle').forEach((toggle) => {
  const plan = toggle.closest('.plan');
  const amountEl = plan.querySelector('.plan-amount');
  toggle.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      toggle.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
      pulseAmount(amountEl, Number(button.dataset.price));
    });
  });
});

document.querySelectorAll('.care-toggle').forEach((toggle) => {
  const plan = toggle.closest('.care-plan');
  const amountEl = plan.querySelector('.care-amount');
  toggle.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      toggle.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
      pulseAmount(amountEl, Number(button.dataset.price));
    });
  });
});

const addonInputs = document.querySelectorAll('[data-addon]');
const addonsSum = document.querySelector('#addons-sum');
const addonsHint = document.querySelector('#addons-hint');
function updateAddonsTotal() {
  const prices = Array.from(addonInputs)
    .filter((input) => input.checked)
    .map((input) => Number(input.dataset.price))
    .sort((a, b) => b - a);
  const total = prices.reduce((sum, price, index) => {
    const rate = index === 0 ? 1 : index === 1 ? 0.9 : 0.83;
    return sum + price * rate;
  }, 0);
  const rounded = Math.round(total);
  if (reducedMotion) {
    addonsSum.textContent = `${formatILS(rounded)}₪`;
  } else {
    const from = Number(addonsSum.textContent.replace(/[^\d]/g, '')) || 0;
    if (from !== rounded) {
      const start = performance.now();
      const duration = 320;
      (function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        addonsSum.textContent = `${formatILS(Math.round(from + (rounded - from) * eased))}₪`;
        if (progress < 1) requestAnimationFrame(tick);
      })(start);
    }
  }
  if (!prices.length) {
    addonsHint.textContent = 'בחרו תוספת כדי לראות את ההנחה';
  } else if (prices.length === 1) {
    addonsHint.textContent = 'תוספת שנייה תקבל 10% הנחה אוטומטית';
  } else {
    addonsHint.textContent = `ההנחה חושבה אוטומטית על ${prices.length} תוספות`;
  }
}
addonInputs.forEach((input) => input.addEventListener('change', updateAddonsTotal));

// Accessibility widget (Israeli Standard 5568 basics: text size, contrast, link emphasis, motion control)
const a11yToggle = document.querySelector('#a11y-toggle');
const a11yPanel = document.querySelector('#a11y-panel');
if (a11yToggle && a11yPanel) {
  const docEl = document.documentElement;
  const A11Y_KEY = 'clarvix-a11y';
  const textClasses = ['a11y-text-lg', 'a11y-text-xl'];

  function applyState(state) {
    docEl.classList.toggle('a11y-contrast', !!state.contrast);
    docEl.classList.toggle('a11y-underline', !!state.underline);
    docEl.classList.toggle('a11y-no-motion', !!state.noMotion);
    textClasses.forEach((cls) => docEl.classList.remove(cls));
    if (state.textStep === 1) docEl.classList.add('a11y-text-lg');
    if (state.textStep >= 2) docEl.classList.add('a11y-text-xl');
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(A11Y_KEY)) || { textStep: 0, contrast: false, underline: false, noMotion: false };
    } catch (e) {
      return { textStep: 0, contrast: false, underline: false, noMotion: false };
    }
  }

  function saveState(state) {
    localStorage.setItem(A11Y_KEY, JSON.stringify(state));
    applyState(state);
  }

  let a11yState = loadState();
  applyState(a11yState);

  a11yToggle.addEventListener('click', () => {
    const isOpen = a11yPanel.hidden === false;
    a11yPanel.hidden = isOpen;
    a11yToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', (event) => {
    if (!a11yPanel.hidden && !event.target.closest('.a11y-widget')) {
      a11yPanel.hidden = true;
      a11yToggle.setAttribute('aria-expanded', 'false');
    }
  });

  a11yPanel.querySelectorAll('[data-a11y]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.a11y;
      if (action === 'inc') a11yState.textStep = Math.min(2, a11yState.textStep + 1);
      if (action === 'dec') a11yState.textStep = Math.max(0, a11yState.textStep - 1);
      if (action === 'contrast') a11yState.contrast = !a11yState.contrast;
      if (action === 'underline') a11yState.underline = !a11yState.underline;
      if (action === 'motion') a11yState.noMotion = !a11yState.noMotion;
      if (action === 'reset') a11yState = { textStep: 0, contrast: false, underline: false, noMotion: false };
      saveState(a11yState);
    });
  });
}

// Contact form: build a pre-filled mailto (static site, no backend yet)
const contactForm = document.querySelector('#contact-form');
if (contactForm) {
  const formStatus = document.querySelector('#form-status');
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const name = data.get('name');
    const phone = data.get('phone');
    const email = data.get('email');
    const plan = data.get('plan');
    const message = data.get('message');
    const subject = `פנייה חדשה מהאתר — ${name}`;
    const body = `שם: ${name}\nטלפון: ${phone}\nמייל: ${email}\nמתעניין ב: ${plan}\n\n${message}`;
    const mailto = `mailto:contact@clarvix.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    if (formStatus) {
      formStatus.textContent = 'תוכנת המייל נפתחת עכשיו — רק צריך לאשר שליחה.';
      formStatus.classList.add('visible');
    }
  });
}

// Easter egg: the brand mark drops from the header, bounces once and scurries off screen.
function runMarkDrop() {
  const headerMark = document.querySelector('.brand img');
  if (!headerMark || !('animate' in headerMark)) return;

  const startRect = headerMark.getBoundingClientRect();
  if (!startRect.width) return;
  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;

  const w = 42;
  const h = 52;
  const clone = document.createElement('div');
  clone.className = 'pacman-drop';
  clone.style.width = `${w}px`;
  clone.style.height = `${h}px`;
  clone.innerHTML = '<img src="images/clarvix-mark.svg" alt="" aria-hidden="true">';
  document.body.appendChild(clone);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const initX = startX - w / 2;
  const initY = startY - h / 2;
  const targetPointerX = lastPointerX !== null ? lastPointerX : vw / 2;
  const landX = Math.max(70, Math.min(vw - 70, targetPointerX + (Math.random() * 180 - 90)));
  const landY = Math.max(vh * 0.35, Math.min(vh * 0.82, vh * (0.4 + Math.random() * 0.35)));
  const exitDir = Math.random() < 0.5 ? -1 : 1;
  const exitX = exitDir === 1 ? vw + 120 : -160;
  const spin = 360 * exitDir;

  const pos = (x, y) => `translate(${x - w / 2}px, ${y - h / 2}px)`;

  const keyframes = [
    { transform: `${pos(startX, startY)} rotate(0deg) scale(1)`, offset: 0 },
    { transform: `${pos(landX, landY)} rotate(70deg) scale(1)`, offset: 0.32, easing: 'cubic-bezier(.55,0,1,.45)' },
    { transform: `${pos(landX, landY + 6)} rotate(78deg) scaleY(.62) scaleX(1.28)`, offset: 0.35 },
    { transform: `${pos(landX, landY - 34)} rotate(96deg) scale(1)`, offset: 0.46, easing: 'ease-out' },
    { transform: `${pos(landX, landY + 3)} rotate(104deg) scaleY(.85) scaleX(1.1)`, offset: 0.56, easing: 'ease-in' },
    { transform: `${pos(landX, landY - 9)} rotate(99deg) scale(1)`, offset: 0.62 },
    { transform: `${pos(landX, landY)} rotate(95deg) scale(1)`, offset: 0.67 },
    { transform: `${pos(landX, landY)} rotate(83deg) scale(1)`, offset: 0.74 },
    { transform: `${pos(landX, landY)} rotate(101deg) scale(1)`, offset: 0.79 },
    { transform: `${pos(landX, landY)} rotate(90deg) scale(1)`, offset: 0.84 },
    { transform: `translate(${exitX - w / 2}px, ${landY - h / 2 - 24}px) rotate(${90 + spin}deg) scale(.75)`, offset: 1, easing: 'cubic-bezier(.4,0,1,1)' }
  ];

  const anim = clone.animate(keyframes, { duration: 3600, fill: 'forwards' });
  anim.onfinish = () => {
    clone.remove();
    headerMark.classList.add('mark-pulse');
    headerMark.addEventListener('animationend', () => headerMark.classList.remove('mark-pulse'), { once: true });
  };
}

if (!reducedMotion && !sessionStorage.getItem('clarvix-mark-drop-seen')) {
  const dropDelay = 12000 + Math.random() * 28000;
  setTimeout(() => {
    if (document.visibilityState === 'visible' && !sessionStorage.getItem('clarvix-mark-drop-seen')) {
      sessionStorage.setItem('clarvix-mark-drop-seen', '1');
      runMarkDrop();
    }
  }, dropDelay);
}
