/**
 * フォーマットのメタ情報取得。
 */

import { SUPPORTED_FORMATS } from './definitions.js';
import {
  FORMAT_DISPLAY_NAMES,
  formatDisplayName as configFormatDisplayName,
} from '../../core/config/format-guides.js';

export function getDisplayName(format) {
  const raw = typeof format === 'string' ? format.trim() : '';
  const normalized = raw.toLowerCase();

  if (!normalized) {
    return '不明フォーマット';
  }

  const def = SUPPORTED_FORMATS[normalized];
  if (def) {
    return def.name;
  }

  const mapped = FORMAT_DISPLAY_NAMES[normalized];
  if (mapped) {
    return mapped;
  }

  const fallback = configFormatDisplayName(raw || normalized);
  if (!fallback || fallback.toLowerCase() === 'unknown') {
    return '不明フォーマット';
  }

  return fallback;
}

export function getDescription(format) {
  const def = SUPPORTED_FORMATS[format];
  return def?.description || getDisplayName(format);
}

export function getType(format) {
  const def = SUPPORTED_FORMATS[format];
  return def?.type || '1d';
}

export function getCategory(format) {
  const def = SUPPORTED_FORMATS[format];
  return def?.category || 'linear';
}

export function getRecommendedSettings(format) {
  const def = SUPPORTED_FORMATS[format];

  if (!def) {
    return {};
  }

  const settings = {
    format,
    type: def.type,
    category: def.category,
  };

  if (format === 'qr_code') {
    settings.errorCorrection = 'M';
    settings.version = 'auto';
  }

  if (def.type === '1d') {
    settings.includeText = true;
    settings.textAlign = 'center';
    settings.textPosition = 'bottom';
  }

  if (def.category === 'matrix') {
    settings.moduleSize = 3;
    settings.quietZone = 4;
  } else if (def.category === 'linear') {
    settings.barWidth = 2;
    settings.barHeight = 50;
    settings.quietZone = 10;
  }

  return settings;
}
