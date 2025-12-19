export function setLogoModeTabsState(elements, mode) {
  if (!elements.logoModeTabs) {
    return;
  }
  const normalized = mode === 'safe' ? 'safe' : 'faithful';
  const buttons = elements.logoModeTabs.querySelectorAll('.logo-mode-pill');
  buttons.forEach(button => {
    const isSelected = button.dataset.mode === normalized;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    button.setAttribute('tabindex', isSelected ? '0' : '-1');
  });
}
