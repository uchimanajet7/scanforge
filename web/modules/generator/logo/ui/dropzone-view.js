function resetShellState(elements) {
  const shell = elements.logoDropzone?.__uploaderShell;
  if (shell) {
    shell.setDisabled(false);
    const nextState = elements.logoDropzone?.dataset.state || 'idle';
    shell.setState(nextState, { silent: true });
  }
}

export function setLogoInteractiveState(elements, enabled) {
  if (elements.logoDropzone) {
    elements.logoDropzone.setAttribute('tabindex', '0');
    elements.logoDropzone.removeAttribute('aria-disabled');
  }
  if (elements.logoInput) {
    elements.logoInput.disabled = false;
  }
  resetShellState(elements);
  if (!enabled && elements.logoDropzone) {
    elements.logoDropzone.setAttribute('aria-disabled', 'true');
  }
}

export function updateLogoDropState(elements, state) {
  if (!elements.logoDropzone) {
    return;
  }
  if (state) {
    elements.logoDropzone.dataset.dropState = state;
    elements.logoDropzone.dataset.state = state;
  } else {
    delete elements.logoDropzone.dataset.dropState;
    delete elements.logoDropzone.dataset.state;
  }
  elements.logoDropzone.setAttribute('aria-busy', state === 'busy' ? 'true' : 'false');
  if (state !== 'busy') {
    resetShellState(elements);
  }
}
