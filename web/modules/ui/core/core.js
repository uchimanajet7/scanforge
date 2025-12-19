/**
 * UIコア初期化
 */

import { logger } from '../../core/logger.js';

import { registerGlobalHandlers } from './dispatcher.js';
import { initAccessibility, announce, teardownAccessibility } from './accessibility.js';
import { updateViewportHeight, handleResize } from './layout.js';
import { applyColorScheme, setTheme } from './theming.js';
import { showLoading, hideLoading } from './loading.js';

let cleanupHandlers = null;

function handleBeforePrint() {
  document.body.classList.add('is-printing');
  logger.debug('ui:print:start');
}

function handleAfterPrint() {
  document.body.classList.remove('is-printing');
  logger.debug('ui:print:end');
}

function applyMotionPreferences() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduce-motion');
  } else {
    document.documentElement.classList.remove('reduce-motion');
  }
}

export function initCore() {
  teardownCore();

  showLoading();

  initAccessibility();
  applyMotionPreferences();
  applyColorScheme();
  updateViewportHeight();

  cleanupHandlers = registerGlobalHandlers({
    onResize: handleResize,
    onBeforePrint: handleBeforePrint,
    onAfterPrint: handleAfterPrint,
  });

  logger.debug('ui:core:init');
}

export async function finalizeCore() {
  await hideLoading();
  logger.debug('ui:core:finalized');
}

export function teardownCore() {
  if (typeof cleanupHandlers === 'function') {
    cleanupHandlers();
    cleanupHandlers = null;
  }
  teardownAccessibility();
}

export { announce, applyColorScheme, setTheme, updateViewportHeight, showLoading, hideLoading };
