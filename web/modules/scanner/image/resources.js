/**
 * 画像リソースの読み込みと前処理。
 */

import { ImageScanError } from './errors.js';
import { throwIfAborted } from './utils.js';
import { createScaledCanvas, drawSourceToCanvas } from './canvas.js';
import {
  isSvgFile,
  readSvgMetadata,
} from './svg.js';

export async function prepareImageResources(file, signal) {
  let bitmap = null;
  let revokeObjectUrl = () => {};
  const svgFile = isSvgFile(file);
  let svgMetadata = null;

  try {
    throwIfAborted(signal);

    if (svgFile) {
      svgMetadata = await readSvgMetadata(file, signal);
      throwIfAborted(signal);
    }

    if (!svgFile && typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      throwIfAborted(signal);
    } else {
      const { image, revoke } = await loadImageFromFile(file, signal);
      bitmap = image;
      revokeObjectUrl = revoke;
    }

    const canvasOptions = svgMetadata
      ? {
          preferredWidth: svgMetadata.width,
          preferredHeight: svgMetadata.height,
          maxSide: svgMetadata.maxSide,
        }
      : {};

    const { canvas, context } = createScaledCanvas(bitmap, canvasOptions);
    drawSourceToCanvas(bitmap, context, canvas);

    return {
      bitmapForDetector: svgFile ? canvas : (bitmap instanceof ImageBitmap ? bitmap : canvas),
      canvas,
      cleanup: () => {
        if (bitmap instanceof ImageBitmap && typeof bitmap.close === 'function') {
          bitmap.close();
        }
        revokeObjectUrl();
      },
    };
  } catch (error) {
    if (bitmap instanceof ImageBitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }
    revokeObjectUrl();
    throw error instanceof ImageScanError
      ? error
      : new ImageScanError('画像の準備に失敗しました。', 'prepare-failed', { cause: error });
  }
}

export function loadImageFromFile(file, signal) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';

    const revokeUrl = () => URL.revokeObjectURL(objectUrl);

    const cleanup = (shouldRevoke = false) => {
      image.onload = null;
      image.onerror = null;
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
      if (shouldRevoke) {
        revokeUrl();
      }
    };

    const handleAbort = () => {
      cleanup(true);
      reject(new ImageScanError('画像の読み込みがキャンセルされました。', 'canceled'));
    };

    image.onload = () => {
      cleanup(false);
      resolve({
        image,
        revoke: revokeUrl,
      });
    };

    image.onerror = () => {
      cleanup(true);
      reject(new ImageScanError('画像の読み込みに失敗しました。', 'load-failed'));
    };

    if (signal) {
      if (signal.aborted) {
        handleAbort();
        return;
      }
      signal.addEventListener('abort', handleAbort, { once: true });
    }

    image.src = objectUrl;
  });
}
