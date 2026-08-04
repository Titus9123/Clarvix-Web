const header = document.querySelector('#header');
const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('#mobile-menu');

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 10);
}

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  menuButton.setAttribute('aria-label', open ? 'פתיחת תפריט' : 'סגירת תפריט');
  mobileMenu.hidden = open;
  mobileMenu.classList.toggle('open', !open);
});

mobileMenu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'פתיחת תפריט');
    mobileMenu.hidden = true;
    mobileMenu.classList.remove('open');
  });
});

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
  }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
  revealItems.forEach((item) => observer.observe(item));
}
