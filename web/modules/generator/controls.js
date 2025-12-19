/**
 * フォームコントロール周りの共通処理を提供するモジュール。
 */

import { SUPPORTED_FORMATS } from '../data/formats/catalog.js';
import {
  DEFAULT_SETTINGS,
  FORMAT_ALIASES,
  getState,
  updateState,
} from './context.js';
import { elements } from './dom-cache.js';
import { logger } from './feedback.js';
import { renderEmptyPreview } from './preview/render.js';
import { updateCopyActionState, updatePreviewMeta } from './preview/state.js';

function initializeControls({
  onResetLogoColor,
  onLogoPriorityAvailability,
} = {}) {
  updateSizeControls(DEFAULT_SETTINGS.targetSizePx, { emitHint: false });
  updatePreviewMeta();
  if (typeof onResetLogoColor === 'function') {
    onResetLogoColor();
  }
  if (typeof onLogoPriorityAvailability === 'function') {
    onLogoPriorityAvailability();
  }
  renderEmptyPreview();
  updateCopyActionState(null, elements.outputSelect?.value || 'svg');
  if (elements.downloadBtn) {
    elements.downloadBtn.disabled = true;
  }
  if (elements.copyBtn) {
    elements.copyBtn.disabled = true;
  }
  logger.debug('generator:init:ui-initialized');
}

function updateSizeControls(value, { emitHint = true } = {}) {
  const clamped = clampSize(value);
  updateState({ targetSizePx: clamped });
  if (elements.sizeSlider) {
    elements.sizeSlider.value = String(clamped);
    updateSliderProgress(elements.sizeSlider, clamped);
  }
  if (elements.sizeInput) {
    elements.sizeInput.value = String(clamped);
  }
  if (emitHint && elements.sizeHint) {
    elements.sizeHint.textContent = `生成されるコードの仕上がりサイズを指定します。現在: ${clamped}px`;
  }
}

function updateSliderProgress(slider, value) {
  if (!slider) {
    return;
  }
  const minAttr = Number.parseFloat(slider.getAttribute('min') ?? '');
  const maxAttr = Number.parseFloat(slider.getAttribute('max') ?? '');
  const min = Number.isFinite(minAttr) ? minAttr : DEFAULT_SETTINGS.minSizePx;
  const max = Number.isFinite(maxAttr) ? maxAttr : DEFAULT_SETTINGS.maxSizePx;
  const range = max - min;
  const ratio = range > 0 ? (value - min) / range : 0;
  const bounded = Math.max(0, Math.min(1, ratio));
  const percent = Math.round(bounded * 10000) / 100;
  slider.style.setProperty('--range-progress', `${percent}%`);
}

function clampSize(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.targetSizePx;
  }
  return Math.max(
    DEFAULT_SETTINGS.minSizePx,
    Math.min(DEFAULT_SETTINGS.maxSizePx, Math.round(value)),
  );
}

function mapFormatValue(value) {
  const key = FORMAT_ALIASES[value] || value;
  if (SUPPORTED_FORMATS[key]) {
    return key;
  }
  return 'qr_code';
}

function getQuietZoneModules(formatKey) {
  if (formatKey === 'qr_code') {
    return 4;
  }
  const def = SUPPORTED_FORMATS[formatKey];
  if (def?.category === 'matrix') {
    return 1;
  }
  if (def?.category === 'stacked') {
    return 2;
  }
  return 10;
}

function getTargetSizePx() {
  return getState().targetSizePx;
}

function getOutputFormat() {
  return elements.outputSelect?.value || 'svg';
}

export {
  clampSize,
  getOutputFormat,
  getQuietZoneModules,
  getTargetSizePx,
  initializeControls,
  mapFormatValue,
  updateSizeControls,
};
