/**
 * ZXing ラッパーの検出ロジック。
 */

import { logger } from '../../../core/logger.js';
import { toZXingFormat, fromExternalFormat } from '../../../data/formats/catalog.js';
import {
  getCodeReader,
  setCodeReader,
  clearCodeReader,
  getIsScanning,
  setIsScanning,
  getCurrentDecodeControl,
  setCurrentDecodeControl,
  clearDecodeControl,
} from './state.js';
import { loadLibrary } from './loader.js';
import { resolveBarcodeFormatName, calculateBoundingBox } from './utils.js';

function getAbortReason(signal) {
  if (signal?.reason !== undefined) {
    return signal.reason;
  }
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

async function waitForDecodeControl(decodePromise, signal) {
  if (!signal) {
    return decodePromise;
  }

  signal.throwIfAborted();
  let abortHandler = null;
  const abortPromise = new Promise((_, reject) => {
    abortHandler = () => reject(getAbortReason(signal));
    if (signal.aborted) {
      abortHandler();
      return;
    }
    signal.addEventListener('abort', abortHandler, { once: true });
  });

  try {
    const control = await Promise.race([decodePromise, abortPromise]);
    signal.throwIfAborted();
    return control;
  } catch (error) {
    if (signal.aborted) {
      decodePromise.then(control => control?.stop?.()).catch(() => {});
      throw getAbortReason(signal);
    }
    throw error;
  } finally {
    if (abortHandler) {
      signal.removeEventListener('abort', abortHandler);
    }
  }
}

export async function initialize(targetFormats = null) {
  if (!getCodeReader()) {
    await loadLibrary();
  }

  try {
    const reader = new window.ZXing.BrowserMultiFormatReader();
    const hints = new Map();

    if (targetFormats && targetFormats.length > 0) {
      const zxingFormats = targetFormats.map((formatKey) => {
        const format = toZXingFormat(formatKey);
        return window.ZXing.BarcodeFormat[format];
      }).filter(Boolean);

      if (zxingFormats.length > 0) {
        hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, zxingFormats);
      }
    }

    hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);

    reader.hints = hints;
    setCodeReader(reader);

    logger.debug('zxing:initialize:complete', { formats: targetFormats });
    return true;
  } catch (error) {
    logger.error('ZXing 初期化エラー', error);
    return false;
  }
}

export async function detect(image) {
  const reader = getCodeReader();
  if (!reader) {
    throw new Error('ZXing リーダーが初期化されていません');
  }

  try {
    const result = await reader.decodeFromImageElement(image);
    if (!result) {
      return [];
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
    };

    if (points && points.length > 0) {
      detection.boundingBox = calculateBoundingBox(points, image);
      detection.cornerPoints = points.map(p => ({ x: p.x, y: p.y }));
    }

    logger.debug('ZXing バーコード検出', {
      format: detection.format,
      textLength: detection.text.length,
    });

    return [detection];
  } catch (error) {
    if (error.name !== 'NotFoundException') {
      logger.error('ZXing 検出エラー', error);
    }
    return [];
  }
}

export async function startContinuousDetection(video, onDetection, options = {}) {
  const {
    deviceId = null,
    throttleMs = 500,
    signal,
  } = options;

  signal?.throwIfAborted();

  if (getIsScanning()) {
    logger.warn('すでにスキャン中です');
    return;
  }

  if (!getCodeReader()) {
    await initialize();
  }
  signal?.throwIfAborted();

  setIsScanning(true);
  logger.debug('zxing:continuous:start');

  try {
    const constraints = deviceId
      ? { deviceId: { exact: deviceId } }
      : true;

    const decodePromise = getCodeReader().decodeFromVideoDevice(
      constraints,
      video,
      (result) => {
        if (!result || !getIsScanning()) {
          return;
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
        };

        if (points && points.length > 0) {
          detection.boundingBox = calculateBoundingBox(points, video);
          detection.cornerPoints = points.map(p => ({ x: p.x, y: p.y }));
        }

        onDetection([detection]);
      }
    );
    const control = await waitForDecodeControl(decodePromise, signal);

    setCurrentDecodeControl(control);
  } catch (error) {
    if (signal?.aborted) {
      getCodeReader()?.reset?.();
      setIsScanning(false);
      throw getAbortReason(signal);
    }

    logger.error('ZXing 連続検出エラー', error);
    setIsScanning(false);
    throw error;
  }
}

export function stopContinuousDetection() {
  if (!getIsScanning()) {
    return;
  }

  const control = getCurrentDecodeControl();
  if (control) {
    control.stop();
    clearDecodeControl();
  }

  const reader = getCodeReader();
  if (reader) {
    reader.reset();
  }

  setIsScanning(false);
  logger.debug('zxing:continuous:stop');
}

export async function listCameras() {
  if (!getCodeReader()) {
    await initialize();
  }

  try {
    const devices = await getCodeReader().listVideoInputDevices();
    return devices.map(device => ({
      deviceId: device.deviceId,
      label: device.label || `カメラ ${device.deviceId.slice(0, 8)}`,
    }));
  } catch (error) {
    logger.error('カメラリスト取得エラー', error);
    return [];
  }
}

export function getDebugInfo() {
  return {
    isInitialized: !!getCodeReader(),
    isScanning: getIsScanning(),
    hasDecodeControl: getCurrentDecodeControl() !== null,
  };
}

export function cleanup() {
  stopContinuousDetection();

  const reader = getCodeReader();
  if (reader) {
    reader.reset();
  }

  clearCodeReader();
  clearDecodeControl();
  setIsScanning(false);

  logger.debug('zxing:cleanup:complete');
}
