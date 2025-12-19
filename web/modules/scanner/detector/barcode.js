/**
 * BarcodeDetector API をラップするユーティリティ。
 */

import { logger } from '../../core/logger.js';
import { fromExternalFormat } from '../../data/formats/catalog.js';
import {
  getDetector,
  setDetector,
} from './state.js';

export function isSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export async function getSupportedFormats() {
  if (!isSupported()) {
    return [];
  }

  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    logger.debug('detector:supported-formats', supported);
    return supported;
  } catch (error) {
    logger.error('フォーマット取得エラー', error);
    return [];
  }
}

export async function initialize(targetFormats = null) {
  if (!isSupported()) {
    logger.warn('BarcodeDetector はサポートされていません');
    return false;
  }

  try {
    const supportedFormats = await getSupportedFormats();
    let useFormats = targetFormats;

    if (!useFormats || useFormats.length === 0) {
      useFormats = supportedFormats;
    } else {
      useFormats = targetFormats.filter(f => supportedFormats.includes(f));
      if (useFormats.length === 0) {
        logger.warn('指定フォーマットはサポートされていません', targetFormats);
        useFormats = supportedFormats;
      }
    }

    const detector = new window.BarcodeDetector({ formats: useFormats });
    setDetector(detector);
    logger.debug('detector:init:complete', { formats: useFormats });
    return true;
  } catch (error) {
    logger.error('BarcodeDetector 初期化エラー', error);
    return false;
  }
}

export async function detect(image) {
  const detector = getDetector();
  if (!detector) {
    throw new Error('BarcodeDetector が初期化されていません');
  }

  try {
    const barcodes = await detector.detect(image);
    const results = barcodes.map(barcode => ({
      format: fromExternalFormat(barcode.format, 'barcodeDetector'),
      text: barcode.rawValue,
      boundingBox: barcode.boundingBox,
      cornerPoints: barcode.cornerPoints,
      timestamp: Date.now(),
    }));

    if (results.length > 0) {
      logger.debug('バーコード検出', {
        count: results.length,
        formats: results.map(r => r.format),
      });
    }

    return results;
  } catch (error) {
    logger.error('検出エラー', error);
    return [];
  }
}
