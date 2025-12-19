/**
 * トーストコンテナ管理
 */

import { get as getElement } from '../core/dom/query.js';
import { createElement } from '../core/dom/mutation.js';

export function getOrCreateContainer(logger) {
  let container = getElement('.toast-container');

  if (!container) {
    container = createElement(`
      <div class="toast-container" role="region" aria-live="polite" aria-label="通知"></div>
    `);
    document.body.appendChild(container);
    logger.debug('toast:container-created');
  } else {
    logger.debug('toast:container-reused', {
      childCount: container.children.length,
    });
  }

  return container;
}

export function findContainer() {
  return getElement('.toast-container');
}

export function removeContainerIfEmpty(container, logger) {
  if (container && container.children.length === 0) {
    container.remove();
    logger.debug('toast:container-removed');
  }
}
