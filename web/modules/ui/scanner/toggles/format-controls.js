import { on } from '../../core/dom/events.js';

export function createFormatControls(context) {
  const { elements, state, shared } = context;
  const listeners = [];
  let formatsMode = normalizeFormatsMode(state.getState('settings.scanFormatsMode'));
  let manualFormats = toArray(state.getState('settings.scanFormatsManual'));

  function init() {
    if (elements.formatsAutoSwitch) {
      listeners.push(on(elements.formatsAutoSwitch, 'change', handleFormatsAutoToggle));
    }
    if (elements.formatsSelect) {
      listeners.push(on(elements.formatsSelect, 'change', handleFormatsSelectionChange));
    }
  }

  function destroy() {
    listeners.splice(0).forEach(off => off?.());
  }

  function setFormatsMode(mode, { persist = true, silent = false, focus = false } = {}) {
    const normalized = normalizeFormatsMode(mode);
    const previousMode = formatsMode;
    formatsMode = normalized;

    if (elements.formatsAutoSwitch) {
      shared.setSwitchState(elements.formatsAutoSwitch, normalized !== 'manual');
      if (focus) {
        elements.formatsAutoSwitch.focus();
      }
    }

    if (formatsMode === 'manual') {
      manualFormats = toArray(state.getState('settings.scanFormatsManual'));
      toggleFormatsSelect(true);
      const applied = applyManualSelection(manualFormats, { fallback: true });
      const restoredFromEmpty = manualFormats.length === 0 && applied.length > 0;
      manualFormats = applied;
      if (!manualFormats.length) {
        updateFormatsNotice('対象フォーマットを選択してください。', 'warning');
      } else if (restoredFromEmpty) {
        state.updateSettings({ scanFormatsManual: manualFormats.slice() });
        clearFormatsNotice();
      } else {
        clearFormatsNotice();
      }
      if (persist) {
        state.updateSettings({
          scanFormatsMode: formatsMode,
          scanFormatsManual: manualFormats.slice(),
        });
      }
    } else {
      toggleFormatsSelect(false);
      clearFormatsNotice();
      if (persist) {
        state.updateSettings({ scanFormatsMode: formatsMode });
      }
    }

    if (!silent && previousMode !== formatsMode) {
      shared.logToggle('formats-mode', { mode: formatsMode });
      const message = formatsMode === 'manual'
        ? '対象フォーマットを手動選択に切り替えました。'
        : '対象フォーマットを自動判別に切り替えました。';
      shared.announceChange(message);
    }
  }

  function handleFormatsSelectionChange() {
    if (formatsMode !== 'manual') return;
    const values = getFormatsSelectValues();
    if (!values.length) {
      applyManualSelection(manualFormats, { fallback: true });
      updateFormatsNotice('対象フォーマットを最低1件選択してください。', 'warning');
      shared.announceChange('対象フォーマットを選択してください。');
      return;
    }
    manualFormats = values;
    clearFormatsNotice();
    state.updateSettings({ scanFormatsManual: manualFormats.slice() });
    shared.logToggle('formats-manual', { values: manualFormats });
    shared.announceChange(`対象フォーマットを ${manualFormats.length} 件選択しました。`);
  }

  function handleFormatsAutoToggle(event) {
    const isChecked = !!event.currentTarget?.checked;
    const nextMode = isChecked ? 'auto' : 'manual';
    if (nextMode === formatsMode) {
      shared.setSwitchState(elements.formatsAutoSwitch, isChecked);
      return;
    }
    setFormatsMode(nextMode);
  }

  function toggleFormatsSelect(enabled) {
    const allowSelection = !!enabled;
    setManualFieldsetState(allowSelection);
    if (elements.formatsSelect) {
      elements.formatsSelect.disabled = !allowSelection;
      elements.formatsSelect.setAttribute('aria-disabled', String(!allowSelection));
      elements.formatsSelect.setAttribute('aria-required', allowSelection ? 'true' : 'false');
    }
    if (!allowSelection) {
      clearFormatsNotice();
    }
  }

  function getSelectedFormats() {
    if (formatsMode !== 'manual') {
      return null;
    }
    return manualFormats.length ? manualFormats.slice() : null;
  }

  function syncManualFormats(values, { fallback = false } = {}) {
    manualFormats = toArray(values);
    if (formatsMode !== 'manual') {
      return;
    }
    const applied = applyManualSelection(manualFormats, { fallback });
    manualFormats = applied;
    if (!manualFormats.length) {
      updateFormatsNotice('対象フォーマットを選択してください。', 'warning');
    } else {
      clearFormatsNotice();
    }
  }

  function applyManualSelection(values, { fallback = true } = {}) {
    if (!elements.formatsSelect) return [];
    const targetValues = toArray(values);
    const options = Array.from(elements.formatsSelect.options);
    options.forEach(option => {
      option.selected = targetValues.includes(option.value);
    });
    let selected = Array.from(elements.formatsSelect.selectedOptions)
      .map(option => option.value)
      .filter(Boolean);
    if (!selected.length && fallback && options.length) {
      options[0].selected = true;
      selected = [options[0].value];
    }
    return selected;
  }

  function getFormatsSelectValues() {
    if (!elements.formatsSelect) return [];
    return Array.from(elements.formatsSelect.selectedOptions)
      .map(option => option.value)
      .filter(Boolean);
  }

  function updateFormatsNotice(message, variant = 'info') {
    if (!elements.formatsNotice) return;
    elements.formatsNotice.dataset.variant = variant;
    if (!message) {
      elements.formatsNotice.textContent = '';
      elements.formatsNotice.hidden = true;
      return;
    }
    elements.formatsNotice.textContent = message;
    elements.formatsNotice.hidden = false;
  }

  function clearFormatsNotice() {
    updateFormatsNotice('', 'info');
  }

  function setManualFieldsetState(enabled) {
    const allowSelection = !!enabled;
    if (elements.formatsManualRegion) {
      elements.formatsManualRegion.classList.toggle('is-disabled', !allowSelection);
      elements.formatsManualRegion.setAttribute('aria-disabled', allowSelection ? 'false' : 'true');
      elements.formatsManualRegion.dataset.state = allowSelection ? 'manual' : 'auto';
    }
    if (elements.formatsGroup) {
      elements.formatsGroup.classList.toggle('is-disabled', !allowSelection);
    }
  }

  return {
    init,
    destroy,
    setFormatsMode,
    getSelectedFormats,
    syncManualFormats,
    toggleFormatsSelect,
  };
}

function normalizeFormatsMode(mode) {
  return mode === 'manual' ? 'manual' : 'auto';
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}
