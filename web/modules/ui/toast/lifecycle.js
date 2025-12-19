/**
 * トーストのライフサイクル（state購読とキーボードハンドラ）を管理する。
 */

import { observeToasts } from './state-sync.js';
import { on } from '../core/dom/events.js';

export function activateLifecycle({ state, logger, clear }) {
  const unsubscribe = observeToasts(state, logger);
  const keyboardCleanup = on(document, 'keydown', event => {
    if (event.key === 'Escape' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      clear();
      event.preventDefault();
    }
  });

  return function deactivateLifecycle() {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
    if (typeof keyboardCleanup === 'function') {
      keyboardCleanup();
    }
  };
}
