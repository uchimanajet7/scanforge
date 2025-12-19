/**
 * DOM変異操作
 *
 * 表示切替や属性操作などのユーティリティ。
 */

import { get } from './query.js';

function resolve(element) {
  return typeof element === 'string' ? get(element) : element;
}

export function show(element) {
  const el = resolve(element);
  if (!el) return;
  el.style.display = '';
  el.removeAttribute('hidden');
}

export function hide(element) {
  const el = resolve(element);
  if (!el) return;
  el.style.display = 'none';
}

export function toggle(element, visible = null) {
  const el = resolve(element);
  if (!el) return;

  let shouldShow = visible;
  if (shouldShow === null) {
    shouldShow = el.style.display === 'none' || el.hasAttribute('hidden');
  }

  if (shouldShow) {
    show(el);
  } else {
    hide(el);
  }
}

export function enable(element) {
  const el = resolve(element);
  if (!el) return;
  el.disabled = false;
  el.removeAttribute('data-disabled');
}

export function disable(element) {
  const el = resolve(element);
  if (!el) return;
  el.disabled = true;
  el.setAttribute('data-disabled', 'true');
}

export function addClass(element, className) {
  const el = resolve(element);
  if (!el) return;
  el.classList.add(className);
}

export function removeClass(element, className) {
  const el = resolve(element);
  if (!el) return;
  el.classList.remove(className);
}

export function toggleClass(element, className, force = null) {
  const el = resolve(element);
  if (!el) return;

  if (force === null) {
    el.classList.toggle(className);
  } else {
    el.classList.toggle(className, force);
  }
}

export function setAttributes(element, attributes) {
  const el = resolve(element);
  if (!el) return;

  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, value);
    }
  }
}

export function setData(element, data) {
  const el = resolve(element);
  if (!el) return;

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      delete el.dataset[key];
    } else {
      el.dataset[key] = value;
    }
  }
}

export function createElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function createElements(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

export function insert(target, element, position = 'beforeend') {
  const targetEl = resolve(target);
  if (!targetEl) return;

  if (typeof element === 'string') {
    targetEl.insertAdjacentHTML(position, element);
  } else {
    targetEl.insertAdjacentElement(position, element);
  }
}

export function setContent(element, content) {
  const el = resolve(element);
  if (!el) return;

  if (typeof content === 'string') {
    el.innerHTML = content;
  } else {
    el.innerHTML = '';
    el.appendChild(content);
  }
}

export function clear(element) {
  const el = resolve(element);
  if (!el) return;
  el.innerHTML = '';
}

export default {
  show,
  hide,
  toggle,
  enable,
  disable,
  addClass,
  removeClass,
  toggleClass,
  setAttributes,
  setData,
  createElement,
  createElements,
  insert,
  setContent,
  clear,
};
