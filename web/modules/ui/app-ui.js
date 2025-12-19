/**
 * UIエントリーポイント
 */

import * as core from './core/core.js';
import * as tabs from './tabs/controller.js';
import toast from './toast/manager.js';
import { initScanControlsUI } from './scanner/manager.js';
import { initScanImportUI } from './import/manager.js';
import { get as getElement } from './core/dom/query.js';

let scannerCleanup = null;
let importCleanup = null;

function configureImportUI(options = {}) {
  if (typeof importCleanup === 'function') {
    importCleanup();
  }

  const cleanup = initScanImportUI(options);
  importCleanup = typeof cleanup === 'function' ? cleanup : null;
  return importCleanup;
}

export async function initUI() {
  core.initCore();

  toast.init();
  tabs.init();

  scannerCleanup = initScanControlsUI({ announce: core.announce });
  configureImportUI({});

  await core.finalizeCore();
}

export function disposeUI() {
  scannerCleanup?.();
  scannerCleanup = null;
  importCleanup?.();
  importCleanup = null;
  toast.destroy();
  tabs.destroy?.();
  core.teardownCore();
}

export const showLoading = core.showLoading;
export const hideLoading = core.hideLoading;
export const applyColorScheme = core.applyColorScheme;
export const setTheme = core.setTheme;
export const updateViewportHeight = core.updateViewportHeight;
export const announce = core.announce;

export function confirm(message, options = {}) {
  const {
    title = '確認',
    confirmLabel = 'OK',
    cancelLabel = 'キャンセル',
  } = options;
  void title;
  void confirmLabel;
  void cancelLabel;
  return window.confirm(message);
}

export function prompt(message, options = {}) {
  const {
    title = '入力',
    defaultValue = '',
    placeholder = '',
  } = options;
  void title;
  void placeholder;
  return window.prompt(message, defaultValue);
}

export function scrollIntoView(element, options = {}) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (!el) return;

  const {
    behavior = 'smooth',
    block = 'nearest',
    inline = 'nearest',
  } = options;

  el.scrollIntoView({ behavior, block, inline });
}

export function createDebouncedInput(handler, delay = 300) {
  let timer;
  return function(e) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      handler(e);
    }, delay);
  };
}

export { toast, tabs };
export { configureImportUI };
