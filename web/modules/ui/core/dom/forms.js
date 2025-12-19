/**
 * フォーム操作ユーティリティ
 */

import { get } from './query.js';

function resolve(element) {
  return typeof element === 'string' ? get(element) : element;
}

export function getValue(element) {
  const el = resolve(element);
  if (!el) return null;

  if (el.type === 'checkbox') {
    return el.checked;
  }
  if (el.type === 'radio') {
    const checked = el.form?.querySelector(`input[name="${el.name}"]:checked`);
    return checked?.value || null;
  }
  if (el.tagName === 'SELECT' && el.multiple) {
    return Array.from(el.selectedOptions).map(opt => opt.value);
  }
  return el.value;
}

export function setValue(element, value) {
  const el = resolve(element);
  if (!el) return;

  if (el.type === 'checkbox') {
    el.checked = !!value;
    return;
  }
  if (el.type === 'radio') {
    const radio = el.form?.querySelector(`input[name="${el.name}"][value="${value}"]`);
    if (radio) {
      radio.checked = true;
    }
    return;
  }
  if (el.tagName === 'SELECT' && el.multiple) {
    const values = Array.isArray(value) ? value : [value];
    Array.from(el.options).forEach(opt => {
      opt.selected = values.includes(opt.value);
    });
    return;
  }
  el.value = value;
}

export function getFormData(form) {
  const formEl = resolve(form);
  if (!formEl) return {};

  const formData = new FormData(formEl);
  const result = {};

  for (const [key, value] of formData.entries()) {
    if (result[key]) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

export default {
  getValue,
  setValue,
  getFormData,
};
