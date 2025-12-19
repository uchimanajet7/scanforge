/**
 * ZXing アダプタ共通ユーティリティ。
 */

import { logger } from '../../../core/logger.js';

export function resolveBarcodeFormatName(value) {
  try {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' && window.ZXing?.BarcodeFormat) {
      const mapped = window.ZXing.BarcodeFormat[value];
      if (typeof mapped === 'string') {
        return mapped;
      }
    }

    if (value && typeof value.name === 'string') {
      return value.name;
    }

    if (value != null && typeof value.toString === 'function') {
      const stringified = value.toString();
      if (stringified && stringified !== '[object Object]') {
        return stringified;
      }
    }
  } catch (error) {
    logger.debug('ZXing フォーマット正規化に失敗', { error });
  }

  return '';
}

export function calculateBoundingBox(points, element) {
  if (!points || points.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  const intrinsicWidth = element.videoWidth || element.naturalWidth || element.width;
  const intrinsicHeight = element.videoHeight || element.naturalHeight || element.height;

  if (!intrinsicWidth || !intrinsicHeight) {
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  const displayWidth = element.clientWidth || element.offsetWidth || intrinsicWidth;
  const displayHeight = element.clientHeight || element.offsetHeight || intrinsicHeight;
  const scaleX = displayWidth / intrinsicWidth;
  const scaleY = displayHeight / intrinsicHeight;

  if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) {
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  return {
    x: minX * scaleX,
    y: minY * scaleY,
    width: (maxX - minX) * scaleX,
    height: (maxY - minY) * scaleY,
  };
}
