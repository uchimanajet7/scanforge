function applyTabIndex(target, disabled) {
  if (!target) {
    return;
  }
  target.setAttribute('tabindex', disabled ? '-1' : '0');
}

export function createDropzoneView({
  dropzone,
  root,
  status,
  initialState,
  onStateChange,
} = {}) {
  if (!dropzone) {
    return null;
  }

  let disabled = dropzone.getAttribute('aria-disabled') === 'true';
  let currentState = initialState || (disabled ? 'disabled' : 'idle');

  dropzone.setAttribute('role', 'button');
  applyTabIndex(dropzone, disabled);
  dropzone.dataset.state = currentState;
  dropzone.setAttribute('aria-busy', currentState === 'busy' ? 'true' : 'false');

  if (root) {
    root.dataset.uploaderState = currentState;
  }

  function setState(nextState, { silent = false } = {}) {
    if (!nextState) {
      return;
    }
    currentState = nextState;
    dropzone.dataset.state = nextState;
    dropzone.setAttribute('aria-busy', nextState === 'busy' ? 'true' : 'false');
    if (root) {
      root.dataset.uploaderState = nextState;
    }
    if (!silent && typeof onStateChange === 'function') {
      onStateChange(nextState);
    }
  }

  function setDisabled(nextDisabled = false, { silent = true } = {}) {
    disabled = !!nextDisabled;
    dropzone.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    applyTabIndex(dropzone, disabled);
    if (disabled) {
      setState('disabled', { silent });
    } else if (currentState === 'disabled') {
      setState('idle', { silent });
    }
  }

  function announceStatus(message, variant = 'info') {
    if (!status) {
      return;
    }
    status.textContent = message || '';
    status.dataset.variant = variant;
  }

  function teardown() {
    dropzone.removeAttribute('aria-busy');
    dropzone.removeAttribute('data-state');
    dropzone.removeAttribute('role');
    dropzone.removeAttribute('tabindex');
    if (root) {
      delete root.dataset.uploaderState;
    }
  }

  return {
    setState,
    setDisabled,
    announceStatus,
    getState: () => currentState,
    isDisabled: () => disabled,
    teardown,
  };
}
