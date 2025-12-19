/**
 * BarcodeDetector を利用した画像解析。
 */

import { logger } from '../../../core/logger.js';
import { fromExternalFormat, toBarcodeDetectorFormat } from '../../../data/formats/catalog.js';
import { normalizeFormats, throwIfAborted } from '../utils.js';

export function isBarcodeDetectorAvailable() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export async function getSupportedBarcodeFormats() {
  try {
    const formatsList = await window.BarcodeDetector.getSupportedFormats();
    return Array.isArray(formatsList) ? formatsList : [];
  } catch (error) {
    logger.warn('BarcodeDetector サポートフォーマット取得失敗', error);
    return [];
  }
}

export async function scanWithBarcodeDetector(source, targetFormats, signal) {
  throwIfAborted(signal);

  const supportedFormats = await getSupportedBarcodeFormats();
  if (!supportedFormats.length) {
    return { engine: 'barcodeDetector', results: [] };
  }

  const preferred = normalizeFormats(targetFormats);
  const detectorFormats = preferred
    ? filterBarcodeFormats(preferred, supportedFormats)
    : supportedFormats;

  if (!detectorFormats.length) {
    return { engine: 'barcodeDetector', results: [] };
  }

  const detector = new window.BarcodeDetector({ formats: detectorFormats });
  const detections = await detector.detect(source);
  throwIfAborted(signal);

  const results = detections.map(item => ({
    format: fromExternalFormat(item.format, 'barcodeDetector'),
    text: item.rawValue || '',
    timestamp: Date.now(),
    boundingBox: item.boundingBox ? { ...item.boundingBox } : null,
    cornerPoints: Array.isArray(item.cornerPoints)
      ? item.cornerPoints.map(point => ({ x: point.x, y: point.y }))
      : [],
  }));

  return { engine: 'barcodeDetector', results };
}

function filterBarcodeFormats(targetFormats, supported) {
  return targetFormats
    .map(format => toBarcodeDetectorFormat(format))
    .filter(format => supported.includes(format));
}
