/**
 * ZXing を利用した画像解析。
 */

import { getAllFormats, toZXingFormat, fromExternalFormat } from '../../../data/formats/catalog.js';
import { loadLibrary as loadZXingLibrary, resolveBarcodeFormatName } from '../../detector/zxing-adapter.js';
import { canvasToImage, buildBoundingBox } from '../canvas.js';
import { ImageScanError } from '../errors.js';
import { normalizeFormats, throwIfAborted } from '../utils.js';

export async function scanWithZXing(canvas, targetFormats, signal) {
  await loadZXingLibrary();

  if (!window.ZXing) {
    throw new ImageScanError('ZXing ライブラリのロードに失敗しました。', 'zxing-not-loaded');
  }

  const { ZXing } = window;
  const reader = new ZXing.BrowserMultiFormatReader();
  const hints = new Map();

  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

  const preferred = normalizeFormats(targetFormats);
  const formatsForZXing = (preferred || getAllFormats())
    .map(format => ZXing.BarcodeFormat[toZXingFormat(format)])
    .filter(Boolean);

  if (formatsForZXing.length > 0) {
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formatsForZXing);
  }

  reader.hints = hints;

  const imageElement = await canvasToImage(canvas);

  try {
    const result = await decodeWithAbort(reader.decodeFromImageElement(imageElement), signal);
    throwIfAborted(signal);

    if (!result) {
      return { engine: 'zxing', results: [] };
    }

    const formatValue = typeof result.getBarcodeFormat === 'function'
      ? result.getBarcodeFormat()
      : null;
    const rawFormat = resolveBarcodeFormatName(formatValue);
    const points = result.getResultPoints ? result.getResultPoints() : [];

    const detection = {
      format: fromExternalFormat(rawFormat, 'zxing'),
      text: typeof result.getText === 'function' ? result.getText() : '',
      timestamp: Date.now(),
      boundingBox: buildBoundingBox(points, canvas),
      cornerPoints: Array.isArray(points)
        ? points.map(point => ({ x: point.x, y: point.y }))
        : [],
    };

    return { engine: 'zxing', results: [detection] };
  } catch (error) {
    if (error instanceof ImageScanError && error.code === 'canceled') {
      throw error;
    }
    if (error?.name === 'NotFoundException') {
      return { engine: 'zxing', results: [] };
    }
    throw new ImageScanError('ZXing での解析に失敗しました。', 'zxing-error', { cause: error });
  } finally {
    reader.reset();
  }
}

function decodeWithAbort(promise, signal) {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(new ImageScanError('解析をキャンセルしました。', 'canceled'));
  }

  return new Promise((resolve, reject) => {
    const handleAbort = () => {
      reject(new ImageScanError('解析をキャンセルしました。', 'canceled'));
    };

    signal.addEventListener('abort', handleAbort, { once: true });

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        signal.removeEventListener('abort', handleAbort);
      });
  });
}
