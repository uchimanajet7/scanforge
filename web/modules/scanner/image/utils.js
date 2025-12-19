/**
 * 画像解析モジュールのユーティリティ。
 */

import { ImageScanError } from './errors.js';

export function normalizeFormats(formatsList) {
  if (!Array.isArray(formatsList) || formatsList.length === 0) {
    return null;
  }

  const unique = Array.from(new Set(
    formatsList
      .map(format => String(format).trim().toLowerCase())
      .filter(Boolean)
  ));

  return unique.length > 0 ? unique : null;
}

export function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new ImageScanError('解析をキャンセルしました。', 'canceled');
  }
}
