function getLogoPriorityCard(elements) {
  return elements.logoPriorityToggle?.closest('.logo-priority-card') || elements.logoPriorityCard || null;
}

export function updatePriorityToggleUI(elements, checked) {
  if (!elements.logoPriorityToggle) {
    return;
  }
  const isChecked = !!checked;
  elements.logoPriorityToggle.checked = isChecked;
  elements.logoPriorityToggle.setAttribute('aria-checked', isChecked ? 'true' : 'false');
}

export function setPriorityToggleDisabled(elements, disabled) {
  if (!elements.logoPriorityToggle) {
    return;
  }
  const card = getLogoPriorityCard(elements);
  if (disabled) {
    elements.logoPriorityToggle.disabled = true;
    elements.logoPriorityToggle.setAttribute('aria-disabled', 'true');
    elements.logoPriorityToggle.dataset.disabled = 'true';
    card?.classList.add('is-disabled');
    card?.setAttribute('aria-disabled', 'true');
  } else {
    elements.logoPriorityToggle.disabled = false;
    elements.logoPriorityToggle.removeAttribute('aria-disabled');
    delete elements.logoPriorityToggle.dataset.disabled;
    card?.classList.remove('is-disabled');
    card?.removeAttribute('aria-disabled');
  }
}

export function setPriorityToggleLoading(elements, isLoading) {
  if (!elements.logoPriorityToggle) {
    return;
  }
  const card = getLogoPriorityCard(elements);
  if (isLoading) {
    elements.logoPriorityToggle.dataset.loading = 'true';
    elements.logoPriorityToggle.setAttribute('aria-busy', 'true');
    card?.setAttribute('aria-busy', 'true');
    elements.logoPriorityToggle.dataset.prevDisabled = elements.logoPriorityToggle.disabled ? 'true' : 'false';
    elements.logoPriorityToggle.disabled = true;
  } else {
    elements.logoPriorityToggle.removeAttribute('data-loading');
    elements.logoPriorityToggle.removeAttribute('aria-busy');
    card?.removeAttribute('aria-busy');
    const wasDisabled = elements.logoPriorityToggle.dataset.prevDisabled === 'true' ||
      elements.logoPriorityToggle.dataset.disabled === 'true';
    delete elements.logoPriorityToggle.dataset.prevDisabled;
    if (wasDisabled) {
      elements.logoPriorityToggle.disabled = true;
      elements.logoPriorityToggle.setAttribute('aria-disabled', 'true');
      card?.classList.add('is-disabled');
      card?.setAttribute('aria-disabled', 'true');
    } else {
      elements.logoPriorityToggle.disabled = false;
      elements.logoPriorityToggle.removeAttribute('aria-disabled');
      card?.classList.remove('is-disabled');
      card?.removeAttribute('aria-disabled');
    }
  }
}
