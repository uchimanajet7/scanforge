/**
 * 画像ファイルの解析エントリーポイント。
 */

import { logger } from '../../core/logger.js';
import { ImageScanError } from './errors.js';
import {
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_EXTENSIONS,
} from './constants.js';
import { validateImageFile } from './validators.js';
import { normalizeFormats, throwIfAborted } from './utils.js';
import { prepareImageResources } from './resources.js';
import {
  isBarcodeDetectorAvailable,
  scanWithBarcodeDetector,
} from './engines/barcode-detector.js';
import { scanWithZXing } from './engines/zxing.js';

export async function scanFile(file, options = {}) {
  validateImageFile(file);

  const { signal } = options;
  throwIfAborted(signal);

  const targetFormats = normalizeFormats(options.formats);
  const resources = await prepareImageResources(file, signal);

  try {
    let engine = 'barcodeDetector';
    let results = [];

    if (isBarcodeDetectorAvailable()) {
      throwIfAborted(signal);
      try {
        const detectorResults = await scanWithBarcodeDetector(
          resources.bitmapForDetector,
          targetFormats,
          signal
        );
        results = detectorResults.results;
        engine = detectorResults.engine;
      } catch (error) {
        logger.warn('BarcodeDetector 解析エラー、ZXing へフォールバック', error);
      }
    }

    if (!results.length) {
      throwIfAborted(signal);
      const fallbackResults = await scanWithZXing(resources.canvas, targetFormats, signal);
      results = fallbackResults.results;
      engine = fallbackResults.engine;
    }

    return {
      engine,
      results,
      width: resources.canvas.width,
      height: resources.canvas.height,
    };
  } finally {
    resources.cleanup();
  }
}

export {
  ImageScanError,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_EXTENSIONS,
  validateImageFile,
};

export default {
  scanFile,
  validateImageFile,
  ImageScanError,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_EXTENSIONS,
};
