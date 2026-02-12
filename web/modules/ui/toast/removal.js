/**
 * トースト要素の削除とクリアを担当する。
 */

import { findContainer, removeContainerIfEmpty } from './container.js';
import { animateRemove } from './presenter.js';
import { removeToast as removeToastFromState } from './state-sync.js';
import { pullCleanup, pullTimer } from './registry.js';

const TOAST_REMOVAL_DELAY_MS = 250;

export function remove(context, id, { reason = 'manual' } = {}) {
  const { logger, state } = context;
  const container = findContainer();
  if (!container) {
    return;
  }

  const toast = container.querySelector(`[data-toast-id="${id}"]`);
  if (!toast) {
    return;
  }

  animateRemove(toast);
  logger?.debug('toast:remove-init', {
    id,
    reason,
    containerChildren: container.children.length,
  });

  const timerId = pullTimer(id);
  if (timerId) {
    clearTimeout(timerId);
  }

  const cleanup = pullCleanup(id);

  setTimeout(() => {
    toast.remove();
    try {
      cleanup?.();
    } catch {
      // cleanup は任意の後処理であり、ベストエフォートとして例外で削除フローが中断しないよう無視する。
    }
    removeContainerIfEmpty(container, logger);
  }, TOAST_REMOVAL_DELAY_MS);

  removeToastFromState(state, id);
  logger?.debug('トースト削除', { id, reason });
}

export function clear(context) {
  const { logger } = context;
  const container = findContainer();
  if (!container) {
    return;
  }

  const toasts = container.querySelectorAll('.toast');
  toasts.forEach(toast => {
    const toastId = toast.dataset.toastId;
    if (toastId) {
      remove(context, toastId, { reason: 'clear' });
    }
  });

  logger?.debug('トーストクリア');
}
