/**
 * ロゴ機能の UI 更新ロジック。
 */

import { elements } from '../dom-cache.js';
import { getLogoState, getStructuralColorForDisplay, getLogoColorMode } from './state.js';
import {
  updatePriorityToggleUI,
  setPriorityToggleDisabled,
  setPriorityToggleLoading,
} from './ui/priority-toggle.js';
import { setLogoModeTabsState as applyLogoModeTabsState } from './ui/mode-tabs.js';
import {
  setLogoInteractiveState as applyLogoInteractiveState,
  updateLogoDropState as applyLogoDropState,
} from './ui/dropzone-view.js';

const LOGO_SUMMARY_DEFAULT = '';
const LOGO_QR_ONLY_MESSAGE = 'ロゴ描画は QR コード出力時にのみ適用されます。';

function setLogoSummary(text) {
  if (!elements.logoSummary) {
    return;
  }
  const content = text || LOGO_SUMMARY_DEFAULT;
  elements.logoSummary.textContent = content;
  elements.logoSummary.hidden = !content;
}

function setTransparentOptionState(checked, { disabled = false } = {}) {
  const isChecked = !!checked;
  if (elements.transparentInput) {
    elements.transparentInput.checked = isChecked;
    elements.transparentInput.disabled = !!disabled;
  }
  if (elements.transparentToggle) {
    elements.transparentToggle.dataset.checked = isChecked ? 'true' : 'false';
    elements.transparentToggle.classList.toggle('is-disabled', !!disabled);
    if (disabled) {
      elements.transparentToggle.setAttribute('aria-disabled', 'true');
    } else {
      elements.transparentToggle.removeAttribute('aria-disabled');
    }
    const stateLabel = elements.transparentToggle.querySelector('[data-checkbox-state]');
    if (stateLabel) {
      stateLabel.textContent = isChecked ? 'オン' : 'オフ';
    }
  }
}

function updateLogoPriorityToggleUI(checked) {
  updatePriorityToggleUI(elements, checked);
}

function setLogoPriorityToggleDisabled(disabled) {
  setPriorityToggleDisabled(elements, disabled);
}

export function setLogoPriorityToggleLoading(isLoading) {
  setPriorityToggleLoading(elements, isLoading);
}

export function applyLogoPrioritySideEffects() {
  const state = getLogoState();
  updateLogoPriorityToggleUI(state.logoPriority);
  if (elements.transparentInput) {
    setTransparentOptionState(elements.transparentInput.checked, { disabled: elements.transparentInput.disabled });
  }
  updateLogoColorUi({
    data: state.logoColor,
    structural: state.logoStructuralColor,
  });
  const mode = getLogoColorMode();
  setLogoModeTabsState(mode);
}

export function updateLogoPriorityAvailability() {
  if (!elements.logoPriorityToggle) {
    return;
  }
  setLogoPriorityToggleDisabled(false);
  applyLogoPrioritySideEffects();
}

function setLogoToggleState(checked) {
  if (!elements.logoToggle) {
    return;
  }
  const isChecked = !!checked;
  elements.logoToggle.checked = isChecked;
  elements.logoToggle.setAttribute('aria-checked', isChecked ? 'true' : 'false');
}

function setLogoToggleDisabled() {
  if (!elements.logoToggle) {
    return;
  }
  elements.logoToggle.disabled = false;
  elements.logoToggle.removeAttribute('aria-disabled');
  const container = elements.logoToggle.closest('.logo-toggle');
  if (container) {
    container.classList.remove('is-disabled');
    container.removeAttribute('aria-disabled');
  }
}

export function setLogoInteractiveState(enabled) {
  applyLogoInteractiveState(elements, enabled);
}

export function updateLogoAvailability() {
  if (!elements.logoToggle) {
    return;
  }
  const state = getLogoState();
  setLogoToggleDisabled(false);
  setLogoToggleState(state.logoEnabled);
  setLogoInteractiveState(state.logoEnabled);
}

export function setLogoModeTabsState(mode) {
  applyLogoModeTabsState(elements, mode);
}

export function updateLogoDropState(state) {
  applyLogoDropState(elements, state);
}

export function setLogoPreviewState(state) {
  if (!elements.logoPreviewFrame) {
    return;
  }
  elements.logoPreviewFrame.dataset.state = state;
  elements.logoPreviewFrame.setAttribute('aria-busy', state === 'busy' ? 'true' : 'false');
}

export function updateLogoColorUi({ data, structural }) {
  if (elements.logoColorChip) {
    elements.logoColorChip.style.backgroundColor = data;
  }
  if (elements.logoColorValue) {
    elements.logoColorValue.textContent = data;
  }
  const state = getLogoState();
  const accentColor = structural || getStructuralColorForDisplay(state);
  if (elements.logoAccentChip) {
    elements.logoAccentChip.style.backgroundColor = accentColor;
  }
  if (elements.logoAccentValue) {
    const mode = getLogoColorMode();
    let label = accentColor;
    if (state.logoAccentFallback && mode === 'safe') {
      label = `${accentColor}（finder を黒で描画）`;
    }
    elements.logoAccentValue.textContent = label;
  }
}

export function showLogoMeta(asset) {
  if (!elements.logoMeta) {
    return;
  }
  const state = getLogoState();
  const sizeKb = asset.blob ? (asset.blob.size / 1024).toFixed(1) : '0';
  const lines = [];
  if (state.logoFileName) {
    lines.push(state.logoFileName);
    setLogoSummary(`${state.logoFileName} / ${sizeKb}KB`);
  } else {
    setLogoSummary(`${sizeKb}KB`);
  }
  lines.push(`${sizeKb}KB`);
  if (state.logoFileType) {
    lines.push(state.logoFileType);
  }
  if (asset.width && asset.height) {
    lines.push(`${asset.width}×${asset.height}px`);
  }
  elements.logoMeta.textContent = lines.join(' / ');
  elements.logoMeta.hidden = false;
}

export function hideLogoMeta() {
  if (elements.logoMeta) {
    elements.logoMeta.textContent = '';
    elements.logoMeta.hidden = true;
  }
  setLogoSummary(LOGO_SUMMARY_DEFAULT);
}

export function clearLogoInputValue() {
  if (elements.logoInput) {
    elements.logoInput.value = '';
  }
}

export function setLogoPriorityToggle(checked) {
  updateLogoPriorityToggleUI(!!checked);
}

export { LOGO_QR_ONLY_MESSAGE };
