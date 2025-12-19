/**
 * オーバーレイ描画の細部処理。
 */

import { getDisplayName } from '../../data/formats/catalog.js';
import { COLORS, HOLD_DURATION_MS, FADE_DURATION_MS } from './constants.js';

export function drawEntries(state, now) {
  const fadeDuration = state.reduceMotion ? 0 : FADE_DURATION_MS;
  const entries = Array.from(state.entries.values()).sort((a, b) => a.labelIndex - b.labelIndex);

  entries.forEach((entry) => {
    const age = now - entry.lastSeen;
    if (age > HOLD_DURATION_MS + fadeDuration) {
      state.entries.delete(entry.id);
      return;
    }

    if (age > HOLD_DURATION_MS && entry.fadeStart === null) {
      entry.fadeStart = now;
    }

    const opacity = computeOpacity(entry, now, fadeDuration);
    if (opacity <= 0) {
      state.entries.delete(entry.id);
      return;
    }

    drawEntry(state, entry, opacity);
  });
}

export function pickNextColor(state) {
  const color = COLORS[state.colorIndex % COLORS.length];
  state.colorIndex = (state.colorIndex + 1) % COLORS.length;
  return color;
}

export function prepareEntry(state, detection, now, geometry) {
  const key = geometry.id;
  let entry = state.entries.get(key);

  if (!entry) {
    entry = {
      id: key,
      labelIndex: state.sequence++,
      color: pickNextColor(state),
      fadeStart: null,
      geometry: null,
      lastSeen: now,
    };
    state.entries.set(key, entry);
  }

  entry.geometry = geometry;
  entry.displayFormat = getDisplayName(detection.format || 'unknown');
  entry.displayText = truncate(detection.text || detection.rawValue || '', 16);
  entry.lastSeen = now;
  entry.fadeStart = null;

  return entry;
}

function drawEntry(state, entry, opacity) {
  if (!entry.geometry || !state.ctx) {
    return;
  }

  const ctx = state.ctx;
  const { x, y, width, height, points } = entry.geometry;
  const strokeColor = colorWithOpacity(entry.color, opacity);
  const fillColor = colorWithOpacity(entry.color, Math.min(opacity * 0.2 + 0.1, 0.45));

  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, x, y, width, height, Math.min(Math.min(width, height) * 0.08, 12));
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
  ctx.restore();

  const label = buildLabel(entry);
  const paddingX = 8;
  const labelHeight = 24;
  ctx.font = '600 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const metrics = ctx.measureText(label);
  const labelWidth = metrics.width + paddingX * 2;
  const canvasWidth = state.canvas.width;
  const labelX = clamp(x, 0, Math.max(0, canvasWidth - labelWidth));
  const labelY = Math.max(y - labelHeight - 4, 0);

  ctx.save();
  ctx.fillStyle = colorWithOpacity('#111827', Math.min(opacity * 0.75 + 0.2, 0.85));
  drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 8);
  ctx.fill();

  ctx.fillStyle = colorWithOpacity('#f9fafb', Math.min(opacity * 0.9 + 0.1, 1));
  ctx.textBaseline = 'middle';
  ctx.fillText(label, labelX + paddingX, labelY + labelHeight / 2);
  ctx.restore();

  if (points && points.length >= 3) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = colorWithOpacity(entry.color, opacity * 0.7 + 0.3);
    ctx.stroke();
    ctx.restore();
  }
}

function computeOpacity(entry, now, fadeDuration) {
  if (entry.fadeStart === null || fadeDuration === 0) {
    return 1;
  }
  const elapsed = now - entry.fadeStart;
  if (elapsed >= fadeDuration) {
    return 0;
  }
  return Math.max(0, 1 - elapsed / fadeDuration);
}

function buildLabel(entry) {
  const label = `#${entry.labelIndex} ${entry.displayFormat || 'Unknown'}`;
  if (entry.displayText) {
    return `${label} · ${entry.displayText}`;
  }
  return label;
}

function truncate(text, length = 16) {
  const str = String(text);
  if (str.length <= length) {
    return str;
  }
  return `${str.slice(0, length)}…`;
}

function colorWithOpacity(hex, alpha) {
  const normalized = normalizeHex(hex) ?? '#0ea5e9';
  const clampedAlpha = clamp(alpha, 0, 1);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

function normalizeHex(hex) {
  if (typeof hex !== 'string') {
    return null;
  }
  const match = hex.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) {
    return null;
  }
  let value = match[1];
  if (value.length === 3) {
    value = value.split('').map((char) => `${char}${char}`).join('');
  }
  return `#${value.toLowerCase()}`;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
