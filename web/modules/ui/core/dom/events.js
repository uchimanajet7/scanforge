/**
 * DOMイベント補助
 *
 * イベントリスナー登録と解除のユーティリティ。
 */

import { get } from './query.js';

function resolve(element) {
  return typeof element === 'string' ? get(element) : element;
}

export function on(element, event, handler, options = {}) {
  const el = resolve(element);
  if (!el) return () => {};

  el.addEventListener(event, handler, options);
  return () => {
    el.removeEventListener(event, handler, options);
  };
}

export function once(element, event, handler, options = {}) {
  return on(element, event, handler, { ...options, once: true });
}

export function delegate(element, event, selector, handler) {
  const el = resolve(element);
  if (!el) return () => {};

  const delegatedHandler = (e) => {
    const target = e.target.closest(selector);
    if (target && el.contains(target)) {
      handler.call(target, e);
    }
  };

  return on(el, event, delegatedHandler);
}

export default {
  on,
  once,
  delegate,
};
