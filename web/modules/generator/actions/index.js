import { elements } from '../dom-cache.js';
import { getState } from '../context.js';
import {
  clampSize,
  mapFormatValue,
  updateSizeControls,
} from '../controls.js';
import { validateText } from '../../data/formats/validation.js';
import {
  updateLogoPriorityAvailability,
  updateLogoAvailability,
} from '../logo/manager.js';
import { invalidatePreview } from '../preview/state.js';
import { logger } from '../feedback.js';
import { createGenerateRunner } from './generate-runner.js';
import { createLogoPriorityControls } from './logo-priority.js';
import { createOutputActions } from './output-actions.js';
import { createViewSync } from './view-sync.js';

const OPTION_CHANGE_MESSAGE = '描画オプションが変更されました。バーコードを再生成してください。';
const TEXT_CHANGE_MESSAGE = 'テキストが変更されました。バーコードを再生成してください。';
const GENERATE_INPUT_KEYS = new Set([
  'text',
  'format',
  'output',
  'size',
  'includeText',
  'transparent',
]);
const MIN_TEXT_LENGTH = 1;
const MAX_TEXT_LENGTH = 4296;
const MIN_SIZE = 120;
const MAX_SIZE = 960;

let runnerInstance = null;

export function bindEvents() {
  const viewSync = createViewSync();
  runnerInstance = createGenerateRunner({
    onAfterSuccess: (preview, output) => viewSync.syncAfterGenerate(preview, output),
  });
  const logoPriority = createLogoPriorityControls({
    runGenerate: runnerInstance.runGenerate,
  });
  logoPriority.init();

  const outputActions = createOutputActions();
  outputActions.init();

  elements.form.addEventListener('submit', async event => {
    event.preventDefault();
    await handleSubmit();
  });

  elements.resetBtn?.addEventListener('click', () => {
    viewSync.handleReset();
  });

  elements.textInput.addEventListener('input', () => {
    if (!getState().preview) {
      return;
    }
    invalidatePreview(TEXT_CHANGE_MESSAGE);
  });

  elements.formatSelect.addEventListener('change', () => {
    updateLogoPriorityAvailability();
    updateLogoAvailability();
    invalidatePreview('出力形式が変更されました。バーコードを再生成してください。');
  });

  elements.outputSelect.addEventListener('change', () => {
    invalidatePreview('出力形式が変更されました。バーコードを再生成してください。');
  });

  elements.sizeSlider.addEventListener('input', () => {
    const value = clampSize(Number(elements.sizeSlider.value));
    updateSizeControls(value);
    invalidatePreview('サイズ設定が変更されました。バーコードを再生成してください。');
  });

  elements.sizeInput.addEventListener('change', () => {
    const value = clampSize(Number(elements.sizeInput.value));
    updateSizeControls(value);
    invalidatePreview('サイズ設定が変更されました。バーコードを再生成してください。');
  });

  elements.includeTextInput?.addEventListener('change', () => {
    const enabled = !!elements.includeTextInput?.checked;
    logger.debug('ui:toggle:generate-option', { name: 'includeText', enabled });
    invalidatePreview(OPTION_CHANGE_MESSAGE);
  });

  elements.transparentInput?.addEventListener('change', () => {
    const enabled = !!elements.transparentInput?.checked;
    logger.debug('ui:toggle:generate-option', { name: 'transparentBg', enabled });
    updateLogoPriorityAvailability();
    invalidatePreview(OPTION_CHANGE_MESSAGE);
  });
}

export async function handleSubmit() {
  if (!runnerInstance) {
    throw new Error('bindEvents を呼び出してから handleSubmit を実行してください。');
  }
  await runnerInstance.runGenerate({ silent: false });
}

export async function generateCode(input, { signal, silent = true } = {}) {
  if (!runnerInstance) {
    return { success: false, code: 'generator-unavailable' };
  }

  if (!isPlainObject(input) || Object.keys(input).some(key => !GENERATE_INPUT_KEYS.has(key))) {
    return { success: false, code: 'invalid-input' };
  }

  if (!hasOwn(input, 'text') || typeof input.text !== 'string') {
    return { success: false, code: 'invalid-input' };
  }

  const text = input.text.trim();
  const textLength = Array.from(text).length;
  if (textLength < MIN_TEXT_LENGTH || textLength > MAX_TEXT_LENGTH) {
    return { success: false, code: 'invalid-input' };
  }

  const format = hasOwn(input, 'format') ? input.format : elements.formatSelect.value;
  const output = hasOwn(input, 'output') ? input.output : elements.outputSelect.value;
  const size = hasOwn(input, 'size') ? input.size : Number(elements.sizeInput.value);
  const includeText = hasOwn(input, 'includeText')
    ? input.includeText
    : !!elements.includeTextInput?.checked;
  const transparent = hasOwn(input, 'transparent')
    ? input.transparent
    : !!elements.transparentInput?.checked;

  if (
    typeof format !== 'string'
    || !selectHasOption(elements.formatSelect, format)
    || typeof output !== 'string'
    || !selectHasOption(elements.outputSelect, output)
    || !Number.isInteger(size)
    || size < MIN_SIZE
    || size > MAX_SIZE
    || typeof includeText !== 'boolean'
    || typeof transparent !== 'boolean'
  ) {
    return { success: false, code: 'invalid-input' };
  }

  const formatKey = mapFormatValue(format);
  if (!validateText(text, formatKey).valid) {
    return { success: false, code: 'invalid-text' };
  }

  signal?.throwIfAborted();

  elements.textInput.value = text;
  elements.formatSelect.value = format;
  elements.outputSelect.value = output;
  updateSizeControls(size);
  if (elements.includeTextInput) {
    elements.includeTextInput.checked = includeText;
  }
  if (elements.transparentInput) {
    elements.transparentInput.checked = transparent;
  }
  updateLogoPriorityAvailability();
  updateLogoAvailability();

  const outcome = await runnerInstance.runGenerate({ silent, signal });
  if (!outcome.success) {
    return outcome;
  }

  return {
    success: true,
    format,
    formatKey,
    output,
    size,
    includeText,
    transparent,
    preview: outcome.preview,
  };
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function selectHasOption(select, value) {
  return Array.from(select.options).some(option => option.value === value);
}
