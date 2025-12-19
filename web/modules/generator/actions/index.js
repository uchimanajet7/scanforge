import { elements } from '../dom-cache.js';
import { getState } from '../context.js';
import {
  clampSize,
  updateSizeControls,
} from '../controls.js';
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
