/**
 * ボタン・操作ハンドラー
 */

import { on } from '../core/dom/events.js';

export default function createControlsModule(context) {
  const { elements, callbacks, logger } = context;

  const listeners = [];

  function init() {
    if (elements.queue) {
      listeners.push(on(elements.queue, 'click', handleQueueAction));
    }
    if (elements.retryFailed) {
      listeners.push(on(elements.retryFailed, 'click', (event) => {
        event.preventDefault();
        callbacks.onRetryFailed?.();
      }));
    }
    if (elements.abortActive) {
      listeners.push(on(elements.abortActive, 'click', (event) => {
        event.preventDefault();
        const confirmed = window.confirm('進行中と待機中の処理をすべて中断しますか？');
        if (!confirmed) {
          return;
        }
        callbacks.onAbortActive?.();
      }));
    }
    if (elements.reset) {
      listeners.push(on(elements.reset, 'click', (event) => {
        event.preventDefault();
        if (elements.reset.disabled) {
          return;
        }
        callbacks.onReset?.();
      }));
    }
  }

  function destroy() {
    listeners.splice(0).forEach(off => off());
  }

  function handleQueueAction(event) {
    const button = event.target.closest('[data-job-action]');
    if (!button) {
      return;
    }

    const jobId = button.getAttribute('data-job-id');
    const action = button.getAttribute('data-job-action');

    if (!jobId || !action) {
      return;
    }

    switch (action) {
      case 'cancel':
        callbacks.onCancelJob?.(jobId);
        break;
      case 'retry':
        callbacks.onRetryJob?.(jobId);
        break;
      case 'remove':
        callbacks.onRemoveJob?.(jobId);
        break;
      default:
        logger.warn('scan-import:queue:unknown-action', { action, jobId });
    }
  }

  return {
    init,
    destroy,
  };
}
