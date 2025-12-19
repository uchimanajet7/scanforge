/**
 * トースト表示 API を提供する。
 */

import { getOrCreateContainer } from './container.js';
import { createToastElement, animateShow } from './presenter.js';
import { registerToast } from './state-sync.js';
import { setTimer, setCleanup } from './registry.js';
import { remove } from './removal.js';

export function show(context, message, options = {}) {
  const {
    state,
    logger,
    APP_CONFIG,
  } = context;

  const {
    type = 'info',
    duration = APP_CONFIG.TOAST_DEFAULT_DURATION,
    action = null,
    actionLabel,
    closeLabel = '閉じる',
    description = '',
  } = options;

  const hasActionHandler = typeof action === 'function';
  const normalizedActionLabel = typeof actionLabel === 'string' && actionLabel.trim().length > 0
    ? actionLabel.trim()
    : null;
  const safeAction = hasActionHandler && normalizedActionLabel ? action : null;

  const container = getOrCreateContainer(logger);
  const id = Date.now().toString();

  const { element, cleanup } = createToastElement({
    id,
    type,
    message,
    description,
    action: safeAction,
    actionLabel: safeAction ? normalizedActionLabel : null,
    closeLabel,
    onRemove: (reason) => remove(context, id, { reason }),
  });

  setCleanup(id, cleanup);

  container.appendChild(element);
  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);
  logger?.debug('toast:dom-mounted', {
    id,
    type,
    rect: {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    styles: {
      display: computed.display,
      opacity: computed.opacity,
      visibility: computed.visibility,
      position: computed.position,
      zIndex: computed.zIndex,
    },
    containerChildren: container.children.length,
  });

  animateShow(element, logger);

  const effectiveDuration = normalizeDuration(duration, APP_CONFIG);
  registerToast(state, {
    id,
    message,
    type,
    timestamp: Date.now(),
    duration: effectiveDuration,
    description: description || null,
  });

  if (effectiveDuration > 0) {
    const timerId = setTimeout(() => {
      remove(context, id, { reason: 'duration-expired' });
    }, effectiveDuration);
    setTimer(id, timerId);
    logger?.debug('toast:timer-armed', { id, duration: effectiveDuration });
  } else {
    logger?.debug('toast:timer-skipped', { id });
  }

  if (container.children.length > 1) {
    logger?.debug('toast:stack-size', { count: container.children.length });
  }

  logger?.debug('トースト表示', { id, message, type });

  return id;
}

export function success(context, message, options = {}) {
  return show(context, message, { ...options, type: 'success' });
}

export function error(context, message, options = {}) {
  return show(context, message, { ...options, type: 'error' });
}

export function warning(context, message, options = {}) {
  return show(context, message, { ...options, type: 'warning' });
}

export function info(context, message, options = {}) {
  return show(context, message, { ...options, type: 'info' });
}

function normalizeDuration(value, APP_CONFIG) {
  const numericDuration = Number(value);
  if (Number.isNaN(numericDuration)) {
    return APP_CONFIG.TOAST_DEFAULT_DURATION;
  }
  if (numericDuration < 0) {
    return 0;
  }
  return numericDuration;
}
