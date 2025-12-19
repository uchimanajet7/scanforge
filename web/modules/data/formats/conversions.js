/**
 * フォーマット名の変換ユーティリティ。
 */

import { SUPPORTED_FORMATS } from './definitions.js';
import { ZXING_FORMAT_MAP } from '../../core/config/detector-formats.js';

export function toBarcodeDetectorFormat(format) {
  const def = SUPPORTED_FORMATS[format];
  return def?.barcodeDetector || format;
}

export function toZXingFormat(format) {
  const def = SUPPORTED_FORMATS[format];
  return def?.zxing || ZXING_FORMAT_MAP[format] || format.toUpperCase();
}

export function toBwipFormat(format) {
  const def = SUPPORTED_FORMATS[format];
  return def?.bwip || format.toLowerCase();
}

export function fromExternalFormat(format, source) {
  for (const [key, def] of Object.entries(SUPPORTED_FORMATS)) {
    if (source === 'barcodeDetector' && def.barcodeDetector === format) {
      return key;
    }
    if (source === 'zxing' && def.zxing === format) {
      return key;
    }
    if (source === 'bwip' && def.bwip === format) {
      return key;
    }
  }

  return format.toLowerCase().replace(/[^a-z0-9]/g, '_');
}
