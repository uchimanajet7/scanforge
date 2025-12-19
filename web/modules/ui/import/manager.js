/**
 * 画像取り込み UI オーケストレーター
 */

import { logger } from '../../core/logger.js';
import state from '../../core/state/app-state.js';
import { formatDateTime } from '../../core/utils.js';
import formats from '../../data/formats/catalog.js';
import toast from '../toast/manager.js';
import { get as getElement } from '../core/dom/query.js';

import createControlsModule from './controls.js';
import createDropzoneModule from './dropzone.js';
import createSummaryModule from './summary.js';
import createQueueModule from './queue.js';
import createBindingsModule from './bindings.js';

const ELEMENT_SELECTORS = {
  section: '#scanImportSection',
  card: '.scan-import-card',
  trigger: '#scanImageTrigger',
  input: '#scanImageInput',
  uploaderStatus: '#scanImageStatus',
  summaryCount: '#scanImageSummaryCount',
  summaryStatus: '#scanImageSummaryStatus',
  progressBar: '#scanImageProgressBar',
  progressValue: '#scanImageProgressValue',
  dropzone: '#scanImageDropzone',
  queue: '#scanImageQueue',
  retryFailed: '#scanImageRetryFailedBtn',
  abortActive: '#scanImageAbortActiveBtn',
  reset: '#scanImageResetBtn',
  template: '#scanImageQueueItemTemplate',
};

function collectElements() {
  const section = getElement(ELEMENT_SELECTORS.section);
  const result = { section };
  for (const [key, selector] of Object.entries(ELEMENT_SELECTORS)) {
    if (key === 'section') continue;
    const scope = key === 'card' ? section : section || document;
    result[key] = getElement(selector, scope || document);
  }
  return result;
}

export function initScanImportUI(options = {}) {
  const elements = collectElements();
  if (!elements.section || !elements.card || !elements.input || !elements.queue) {
    logger.warn('scan-import:init:missing-elements', {
      hasSection: !!elements.section,
      hasCard: !!elements.card,
      hasInput: !!elements.input,
      hasQueue: !!elements.queue,
    });
    return () => {};
  }

  const callbacks = {
    onSelectFiles: typeof options.onSelectFiles === 'function' ? options.onSelectFiles : null,
    onCancelJob: typeof options.onCancelJob === 'function' ? options.onCancelJob : null,
    onRetryJob: typeof options.onRetryJob === 'function' ? options.onRetryJob : null,
    onRemoveJob: typeof options.onRemoveJob === 'function' ? options.onRemoveJob : null,
    onRetryFailed: typeof options.onRetryFailed === 'function' ? options.onRetryFailed : null,
    onAbortActive: typeof options.onAbortActive === 'function' ? options.onAbortActive : null,
    onReset: typeof options.onReset === 'function' ? options.onReset : null,
  };

  const context = {
    elements,
    callbacks,
    state,
    logger,
    toast,
    formats,
    formatDateTime,
  };

  context.invokeSelectFiles = function(files) {
    if (!callbacks.onSelectFiles) {
      return;
    }
    try {
      const result = callbacks.onSelectFiles(files);
      if (result && typeof result.then === 'function') {
        result.catch(error => {
          logger.error('scan-import:select-files:async-error', error);
          toast.error('画像ファイルの追加中にエラーが発生しました。');
        });
      }
    } catch (error) {
      logger.error('scan-import:select-files:error', error);
      toast.error('画像ファイルの追加中にエラーが発生しました。');
    }
  };

  const controls = createControlsModule(context);
  const dropzone = createDropzoneModule(context);
  const summary = createSummaryModule(context);
  const queue = createQueueModule(context);
  const bindings = createBindingsModule(context, { summary, queue, dropzone });

  const modules = [controls, dropzone, summary, queue, bindings];
  modules.forEach(module => module.init?.());

  logger.debug('scan-import:init:complete');

  return () => {
    modules.slice().reverse().forEach(module => module.destroy?.());
  };
}

export default {
  initScanImportUI,
};
