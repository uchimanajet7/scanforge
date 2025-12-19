/**
 * DOM 要素のキャッシュと必須要素検証を担当するモジュール。
 */

import { getAll as getElements } from '../ui/core/dom/query.js';

const SELECTORS = {
  form: '#generateForm',
  textInput: '#generateText',
  textError: '#generateTextError',
  formatSelect: '#formatSelect',
  outputSelect: '#outputSelect',
  sizeSlider: '#sizeSlider',
  sizeInput: '#sizeInput',
  sizeHint: '#sizeHint',
  includeTextInput: '#includeTextInput',
  transparentInput: '#transparentBgInput',
  logoInput: '#logoInput',
  logoToggle: '#logoToggle',
  logoSummary: '#logoSummary',
  logoHint: '#logoHint',
  logoTrigger: '#logoTrigger',
  logoDropzone: '#logoDropzone',
  logoMeta: '#logoMeta',
  logoPreviewFrame: '#logoPreviewFrame',
  logoPreviewImage: '#logoPreviewImage',
  logoColorSection: '#logoColorSection',
  logoColorChip: '#logoColorChip',
  logoColorValue: '#logoColorValue',
  logoAccentChip: '#logoAccentChip',
  logoAccentValue: '#logoAccentValue',
  logoPriorityToggle: '#logoPriorityToggle',
  logoPriorityCard: '.logo-priority-card',
  logoModeTabs: '#logoModeTabs',
  previewInfo: '#previewInfo',
  previewViewport: '#previewViewport',
  previewContainer: '#previewContainer',
  downloadBtn: '#downloadBtn',
  copyBtn: '#copyImageBtn',
  resetBtn: '#resetGenerateBtn',
};

const elements = {
  form: null,
  textInput: null,
  textError: null,
  formatSelect: null,
  outputSelect: null,
  sizeSlider: null,
  sizeInput: null,
  sizeHint: null,
  includeTextInput: null,
  transparentInput: null,
  logoInput: null,
  logoToggle: null,
  logoSummary: null,
  logoHint: null,
  logoTrigger: null,
  logoDropzone: null,
  logoMeta: null,
  logoPreviewFrame: null,
  logoPreviewImage: null,
  logoColorSection: null,
  logoColorChip: null,
  logoColorValue: null,
  logoAccentChip: null,
  logoAccentValue: null,
  logoPriorityToggle: null,
  logoPriorityCard: null,
  logoModeTabs: null,
  previewInfo: null,
  previewViewport: null,
  previewContainer: null,
  downloadBtn: null,
  copyBtn: null,
  resetBtn: null,
};

function cacheElements() {
  Object.assign(elements, getElements(SELECTORS));
  return elements;
}

function requireElements(requiredKeys) {
  const missing = requiredKeys.filter(key => !elements[key]);
  if (missing.length) {
    throw new Error(`生成モジュールの必須要素が不足: ${missing.join(', ')}`);
  }
}

export { SELECTORS, cacheElements, elements, requireElements };
