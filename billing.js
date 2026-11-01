(() => {
  const buttons = document.querySelectorAll('[data-billing]');
  buttons.forEach(button => button.addEventListener('click', () => {
    const annual = button.dataset.billing === 'annual';
    document.querySelectorAll('.billing-monthly').forEach(el => { el.hidden = annual; });
    document.querySelectorAll('.billing-annual').forEach(el => { el.hidden = !annual; });
    buttons.forEach(el => el.setAttribute('aria-pressed', String(el === button)));
  }));
})();
