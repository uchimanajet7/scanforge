/**
 * アクセシビリティ機能
 */

import { logger } from '../../core/logger.js';
import { get } from './dom/query.js';
import { on } from './dom/events.js';
import { createElement } from './dom/mutation.js';

export function initAccessibility() {
  const skipLink = get('.skip-link');
  if (skipLink) {
    on(skipLink, 'click', (event) => {
      event.preventDefault();
      const target = get('#main-content');
      if (target) {
        target.focus();
        target.scrollIntoView();
      }
    });
  }

  createAnnouncer();
  setupFocusTrap();

  logger.debug('ui:accessibility:init');
}

export function createAnnouncer() {
  if (get('#announcer')) return;

  const announcer = createElement(`
    <div id="announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>
  `);
  document.body.appendChild(announcer);
}

export function announce(message, priority = 'polite') {
  const announcer = get('#announcer');
  if (!announcer) return;

  announcer.setAttribute('aria-live', priority);
  announcer.textContent = message;

  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

export function setupFocusTrap() {
  // 現状はフォーカストラップ対象となるモーダル UI がないため何もしない。
}

export function teardownAccessibility() {
  const announcer = get('#announcer');
  if (announcer && announcer.parentNode) {
    announcer.parentNode.removeChild(announcer);
  }
}

export default {
  initAccessibility,
  createAnnouncer,
  announce,
  setupFocusTrap,
  teardownAccessibility,
};
