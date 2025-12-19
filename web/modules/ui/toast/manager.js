/**
 * トースト通知 API
 */

import { logger } from '../../core/logger.js';
import state from '../../core/state/app-state.js';
import { APP_CONFIG } from '../../core/config/app-settings.js';
import { getDisplayName } from '../../data/formats/catalog.js';

import { activateLifecycle } from './lifecycle.js';
import { resetRegistry } from './registry.js';
import * as notifications from './notifications.js';
import { remove as removeToast, clear as clearToasts } from './removal.js';

const context = {
  state,
  logger,
  APP_CONFIG,
};

let lifecycleCleanup = null;

export function init() {
  if (lifecycleCleanup) {
    return;
  }

  lifecycleCleanup = activateLifecycle({
    state,
    logger,
    clear: () => clear(),
  });
  logger.debug('toast:init:complete');
}

export function destroy() {
  lifecycleCleanup?.();
  lifecycleCleanup = null;
  clear();
  resetRegistry();
}

export function show(message, options = {}) {
  return notifications.show(context, message, options);
}

export function success(message, options = {}) {
  return notifications.success(context, message, options);
}

export function error(message, options = {}) {
  return notifications.error(context, message, options);
}

export function warning(message, options = {}) {
  return notifications.warning(context, message, options);
}

export function info(message, options = {}) {
  return notifications.info(context, message, options);
}

export function remove(id, options) {
  removeToast(context, id, options);
}

export function clear() {
  clearToasts(context);
}

export function notifyDetection(payload) {
  if (!payload) {
    return;
  }
  const { text, metadata, format } = payload;
  const formatKey = metadata?.format || format;
  const formatDisplay = formatKey ? getDisplayName(formatKey) : 'フォーマット不明';
  const normalizedText = typeof text === 'string' ? text.trim() : '';
  const preview = normalizedText.length === 0
    ? ''
    : normalizedText.length > APP_CONFIG.TOAST_DETECTION_PREVIEW_LIMIT
      ? `${normalizedText.slice(0, APP_CONFIG.TOAST_DETECTION_PREVIEW_LIMIT)}…`
      : normalizedText;
  const description = preview || '検出内容を履歴カードで確認できます。';

  success(`検出成功 - ${formatDisplay}`, {
    duration: APP_CONFIG.TOAST_DETECTION_DURATION_MS,
    description,
  });
}

export function notifyError(operation, err) {
  const message = err?.message || 'エラーが発生しました';
  error(`${operation}: ${message}`, {
    duration: 6000,
  });
}

export function notifyPermissionError() {
  error('カメラへのアクセスが拒否されました', {
    action: () => {
      window.open('https://support.google.com/chrome/answer/2693767', '_blank');
    },
    actionLabel: 'ヘルプ',
    duration: 0,
  });
}

export default {
  init,
  destroy,
  show,
  success,
  error,
  warning,
  info,
  remove,
  clear,
  notifyDetection,
  notifyError,
  notifyPermissionError,
};
