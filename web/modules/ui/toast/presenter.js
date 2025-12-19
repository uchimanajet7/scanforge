/**
 * トーストDOM生成
 */

import { createElement } from '../core/dom/mutation.js';
import { on } from '../core/dom/events.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function createToastElement({
  id,
  type,
  message,
  description,
  action,
  actionLabel,
  closeLabel,
  onRemove,
}) {
  const toast = createElement(`
    <div class="toast toast-${type}" role="alert" data-toast-id="${id}">
      <div class="toast-content">
        <div class="toast-message"></div>
      </div>
      <button class="toast-close" type="button">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
        </svg>
      </button>
    </div>
  `);

  const cleanups = [];

  const content = toast.querySelector('.toast-content');
  const messageEl = toast.querySelector('.toast-message');
  if (messageEl) {
    messageEl.textContent = message;
  }

  if (description && content) {
    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'toast-description';
    descriptionEl.textContent = description;
    content.appendChild(descriptionEl);
  }

  if (action && actionLabel && content) {
    const actionBtn = createElement(`
      <button class="toast-action" type="button">${escapeHtml(actionLabel)}</button>
    `);
    cleanups.push(on(actionBtn, 'click', () => {
      action();
      onRemove('action');
    }));
    content.appendChild(actionBtn);
  }

  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.setAttribute('aria-label', closeLabel);
    cleanups.push(on(closeBtn, 'click', () => {
      onRemove('close-button');
    }));
  }

  return {
    element: toast,
    cleanup: () => {
      cleanups.forEach(off => off());
    },
  };
}

export function animateShow(toast, logger) {
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
    const visibleStyles = window.getComputedStyle(toast);
    logger.debug('toast:visible-applied', {
      id: toast.dataset.toastId,
      opacity: visibleStyles.opacity,
      transform: visibleStyles.transform,
    });
    setTimeout(() => {
      const delayedStyles = window.getComputedStyle(toast);
      logger.debug('toast:visible-checkpoint', {
        id: toast.dataset.toastId,
        opacity: delayedStyles.opacity,
        transform: delayedStyles.transform,
      });
    }, 100);
  });
}

export function animateRemove(toast) {
  toast.classList.remove('toast-visible');
  toast.classList.add('toast-removing');
}
