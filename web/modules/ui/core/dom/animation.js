/**
 * DOMアニメーションユーティリティ
 */

import { get } from './query.js';

function resolve(element) {
  return typeof element === 'string' ? get(element) : element;
}

export async function fadeIn(element, duration = 200) {
  const el = resolve(element);
  if (!el) return;

  el.style.opacity = '0';
  el.style.display = '';
  el.style.transition = `opacity ${duration}ms ease`;

  await new Promise(resolveFn => requestAnimationFrame(resolveFn));
  el.style.opacity = '1';

  await new Promise(resolveFn => setTimeout(resolveFn, duration));
  el.style.transition = '';
}

export async function fadeOut(element, duration = 200) {
  const el = resolve(element);
  if (!el) return;

  el.style.transition = `opacity ${duration}ms ease`;
  el.style.opacity = '0';

  await new Promise(resolveFn => setTimeout(resolveFn, duration));
  el.style.display = 'none';
  el.style.transition = '';
}

export default {
  fadeIn,
  fadeOut,
};
