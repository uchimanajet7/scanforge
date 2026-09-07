/**
 * ライブスキャン開始・終了の制御。
 */

import { logger } from '../../core/logger.js';
import { getState } from '../../core/state/base.js';
import { setScannerStatus } from '../../core/state/scanner/status.js';
import toast from '../../ui/toast/manager.js';
import { get as getElement } from '../../ui/core/dom/query.js';
import { APP_CONFIG } from '../../core/config/app-settings.js';
import camera from '../camera/controller.js';
import detector from '../detector/controller.js';
import zxing from '../detector/zxing-adapter.js';
import overlay from '../overlay/manager.js';
import {
  getCurrentEngine,
  getScanMode,
} from '../context.js';
import {
  resetDetectionTracking,
} from '../detection-cache.js';
import { clearResumeTimer } from './timers.js';
import { handleDetection, registerResumeHandler } from './detection-handler.js';

export class CameraStartStoppedError extends Error {
  constructor() {
    super('カメラの開始は停止要求により取り消されました');
    this.name = 'CameraStartStoppedError';
  }
}

let activeStartController = null;

function stopContinuousDetection(engine) {
  if (engine === detector) {
    detector.stopContinuousDetection();
  } else if (engine === zxing) {
    zxing.stopContinuousDetection();
  }
}

async function cleanupStartAttempt(engine) {
  try {
    stopContinuousDetection(engine);
  } catch (error) {
    logger.debug('scanner:start:detector-cleanup-failed', { error });
  }

  try {
    await camera.stop();
  } catch (error) {
    logger.debug('scanner:start:camera-cleanup-failed', { error });
  }

  clearResumeTimer();
  resetDetectionTracking();
  overlay.clear();
}

export async function startScan(videoElement, options = {}) {
  const { deviceId = null, formats = null, signal } = options;
  const engine = getCurrentEngine();
  const previousStatus = getState('scanner.status');

  signal?.throwIfAborted();

  const resolvedVideo = videoElement instanceof HTMLVideoElement
    ? videoElement
    : document.querySelector('#scanVideo');

  if (!(resolvedVideo instanceof HTMLVideoElement)) {
    logger.error('カメラ起動エラー: ビデオ要素が見つかりません');
    throw new camera.CameraNotFoundError('カメラ表示用のビデオ要素が見つかりません');
  }

  try {
    clearResumeTimer();
    resetDetectionTracking();
    setScannerStatus('initializing');

    const permissionState = await camera.getPermissionState();
    signal?.throwIfAborted();
    if (permissionState === 'denied') {
      throw new camera.CameraPermissionError('カメラへのアクセスが許可されていません');
    }

    await camera.start(resolvedVideo, { deviceId, signal });
    signal?.throwIfAborted();
    const overlayCanvas = getElement('#scanOverlay');
    overlay.attach({
      canvas: overlayCanvas,
      video: resolvedVideo,
    });
    overlay.clear();
    signal?.throwIfAborted();

    if (engine === detector) {
      await detector.initialize(formats);
    } else if (engine === zxing) {
      await zxing.initialize(formats);
    }
    signal?.throwIfAborted();

    if (engine === detector) {
      detector.startContinuousDetection(
        resolvedVideo,
        (results) => handleDetection(results, { source: 'live' }),
        {
          throttleMs: 100,
          cacheMs: APP_CONFIG.DETECTION_CACHE_TTL_MS,
          enableNMS: true,
        },
      );
    } else if (engine === zxing) {
      await zxing.startContinuousDetection(
        resolvedVideo,
        (results) => handleDetection(results, { source: 'live' }),
        {
          deviceId,
          throttleMs: 500,
          signal,
        },
      );
    }

    signal?.throwIfAborted();
    setScannerStatus('scanning');
    logger.debug('scanner:start:complete');
  } catch (error) {
    await cleanupStartAttempt(engine);

    if (signal?.aborted) {
      if (!(signal.reason instanceof CameraStartStoppedError)) {
        setScannerStatus(previousStatus || 'idle');
      }
      throw signal.reason;
    }

    if (error instanceof camera.CameraPermissionError) {
      logger.info('scanner:permission-required');
      setScannerStatus('permissionDenied');
      toast.notifyPermissionRequired();
    } else if (error instanceof camera.CameraNotFoundError) {
      logger.error('スキャン開始エラー', error);
      setScannerStatus('cameraNotFound');
      toast.error('カメラが見つかりません');
    } else if (error instanceof camera.CameraInUseError) {
      logger.error('スキャン開始エラー', error);
      setScannerStatus('cameraInUse');
      toast.error('カメラが他のアプリで使用中です');
    } else {
      logger.error('スキャン開始エラー', error);
      setScannerStatus('startFailed');
      toast.error('カメラの起動に失敗しました');
    }

    throw error;
  }
}

export async function startScanFromCurrentState(options = {}) {
  const { videoElement = null, signal } = options;
  signal?.throwIfAborted();

  const deviceId = getState('scanner.selectedDevice') || null;
  const formatsMode = getState('settings.scanFormatsMode');
  const manualFormats = getState('settings.scanFormatsManual');
  const formats = formatsMode === 'manual' && Array.isArray(manualFormats) && manualFormats.length > 0
    ? manualFormats.slice()
    : null;

  const controller = new AbortController();
  const handleExternalAbort = () => controller.abort(signal?.reason);
  if (signal) {
    signal.addEventListener('abort', handleExternalAbort, { once: true });
    if (signal.aborted) {
      handleExternalAbort();
    }
  }
  activeStartController = controller;

  try {
    return await startScan(videoElement, {
      deviceId,
      formats,
      signal: controller.signal,
    });
  } finally {
    signal?.removeEventListener('abort', handleExternalAbort);
    if (activeStartController === controller) {
      activeStartController = null;
    }
  }
}

export async function stopScan() {
  const engine = getCurrentEngine();
  const wasActive = camera.isActive();
  const cancelledStart = isCameraStartPending();
  if (cancelledStart) {
    activeStartController.abort(new CameraStartStoppedError());
  }

  try {
    stopContinuousDetection(engine);
    await camera.stop();
    clearResumeTimer();
    resetDetectionTracking();
    overlay.clear();
    setScannerStatus('stopped');
    logger.debug('scanner:stop:complete');
    return { wasActive, cancelledStart };
  } catch (error) {
    logger.error('スキャン停止エラー', error);
    throw error;
  }
}

export function isCameraStartPending() {
  return Boolean(activeStartController && !activeStartController.signal.aborted);
}

export function pauseScan() {
  const engine = getCurrentEngine();
  if (engine === detector) {
    detector.stopContinuousDetection();
  } else if (engine === zxing) {
    zxing.stopContinuousDetection();
  }
  clearResumeTimer();
  setScannerStatus('pausedManual');
  logger.debug('scanner:paused');
}

export async function resumeScan() {
  const videoElement = camera.getVideoElement();
  const engine = getCurrentEngine();

  if (!videoElement) {
    logger.warn('ビデオ要素がありません');
    return;
  }

  try {
    clearResumeTimer();
    overlay.setVideo(videoElement);

    if (engine === detector) {
      detector.startContinuousDetection(
        videoElement,
        (results) => handleDetection(results, { source: 'live' }),
        {
          throttleMs: 100,
          cacheMs: APP_CONFIG.DETECTION_CACHE_TTL_MS,
          enableNMS: true,
        },
      );
    } else if (engine === zxing) {
      await zxing.startContinuousDetection(
        videoElement,
        (results) => handleDetection(results, { source: 'live' }),
        {
          throttleMs: 500,
        },
      );
    }

    setScannerStatus('scanning');
    logger.debug('scanner:resumed');
  } catch (error) {
    logger.error('スキャン再開エラー', error);
    throw error;
  }
}

export function getCurrentScanMode() {
  return getScanMode();
}

registerResumeHandler(resumeScan);

export { handleDetection };
