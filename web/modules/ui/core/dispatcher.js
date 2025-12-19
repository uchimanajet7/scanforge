/**
 * グローバルイベントディスパッチャ
 */

import { logger } from '../../core/logger.js';
import { on } from './dom/events.js';

export function registerGlobalHandlers({
  onResize,
  onBeforePrint,
  onAfterPrint,
} = {}) {
  const cleanups = [];

  if (typeof onResize === 'function') {
    let resizeTimer = null;
    cleanups.push(on(window, 'resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        onResize();
      }, 100);
    }));
  }

  cleanups.push(on(document, 'mousedown', () => {
    document.body.classList.add('using-mouse');
  }));

  cleanups.push(on(document, 'keydown', (event) => {
    if (event.key === 'Tab') {
      document.body.classList.remove('using-mouse');
    }
  }));

  if (typeof onBeforePrint === 'function') {
    cleanups.push(on(window, 'beforeprint', onBeforePrint));
  }

  if (typeof onAfterPrint === 'function') {
    cleanups.push(on(window, 'afterprint', onAfterPrint));
  }

  logger.debug('ui:dispatcher:register', {
    resize: !!onResize,
    beforePrint: !!onBeforePrint,
    afterPrint: !!onAfterPrint,
  });

  return function cleanup() {
    cleanups.forEach(fn => fn());
    logger.debug('ui:dispatcher:cleanup');
  };
}

export default {
  registerGlobalHandlers,
};
