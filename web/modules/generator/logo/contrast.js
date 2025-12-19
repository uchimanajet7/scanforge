/**
 * ロゴカラーのコントラスト計算ユーティリティ。
 */

import { LOGO_DEFAULT_COLOR } from '../context.js';

export function toHex(value) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
}

export function formatHex(value) {
  if (typeof value !== 'string') {
    return LOGO_DEFAULT_COLOR;
  }
  const hex = value.trim().replace(/^#/, '').slice(0, 6);
  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) {
    return LOGO_DEFAULT_COLOR;
  }
  return `#${hex.toUpperCase()}`;
}

export function sanitizeHex(hex) {
  return formatHex(hex).replace('#', '');
}

export function hexToRgb(hex) {
  const normalized = formatHex(hex);
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex(r, g, b) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function blendTowards(rgb, target, ratio) {
  const bounded = Math.max(0, Math.min(1, ratio));
  const r = Math.round(rgb.r * (1 - bounded));
  const g = Math.round(rgb.g * (1 - bounded));
  const b = Math.round(rgb.b * (1 - bounded));
  return {
    r: Math.max(0, Math.min(255, r + Math.round(target.r * bounded))),
    g: Math.max(0, Math.min(255, g + Math.round(target.g * bounded))),
    b: Math.max(0, Math.min(255, b + Math.round(target.b * bounded))),
  };
}

export function computeRelativeLuminance(hex) {
  const normalized = formatHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const rl = linearizeChannel(r);
  const gl = linearizeChannel(g);
  const bl = linearizeChannel(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function linearizeChannel(value) {
  if (value <= 0.03928) {
    return value / 12.92;
  }
  return ((value + 0.055) / 1.055) ** 2.4;
}

export function computeContrast(foreground, background) {
  const lighter = Math.max(foreground, background);
  const darker = Math.min(foreground, background);
  if (!Number.isFinite(lighter) || !Number.isFinite(darker)) {
    return 0;
  }
  return (lighter + 0.05) / (darker + 0.05);
}
