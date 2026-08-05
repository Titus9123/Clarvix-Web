const header = document.querySelector('#header');
const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('#mobile-menu');
const progressBar = document.querySelector('.progress span');

function updatePageChrome() {
  header.classList.toggle('scrolled', window.scrollY > 10);
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
  progressBar.style.width = `${progress * 100}%`;
}

updatePageChrome();
window.addEventListener('scroll', updatePageChrome, { passive: true });
window.addEventListener('resize', updatePageChrome, { passive: true });

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

document.querySelector('#year').textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = document.querySelectorAll('.reveal');

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
  revealItems.forEach((item) => observer.observe(item));
}
