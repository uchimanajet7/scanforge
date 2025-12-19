/**
 * ライブスキャン開始・終了の制御。
 */

import { logger } from '../../core/logger.js';
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

export async function startScan(videoElement, options = {}) {
  const { deviceId = null, formats = null } = options;
  const engine = getCurrentEngine();

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

    await camera.start(resolvedVideo, { deviceId });
    const overlayCanvas = getElement('#scanOverlay');
    overlay.attach({
      canvas: overlayCanvas,
      video: resolvedVideo,
    });
    overlay.clear();

    if (engine === detector) {
      await detector.initialize(formats);
    } else if (engine === zxing) {
      await zxing.initialize(formats);
    }

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
        },
      );
    }

    setScannerStatus('scanning');
    logger.debug('scanner:start:complete');
  } catch (error) {
    logger.error('スキャン開始エラー', error);

    if (error instanceof camera.CameraPermissionError) {
      setScannerStatus('permissionDenied');
      toast.notifyPermissionError();
    } else if (error instanceof camera.CameraNotFoundError) {
      setScannerStatus('cameraNotFound');
      toast.error('カメラが見つかりません');
    } else if (error instanceof camera.CameraInUseError) {
      setScannerStatus('cameraInUse');
      toast.error('カメラが他のアプリで使用中です');
    } else {
      setScannerStatus('startFailed');
      toast.error('カメラの起動に失敗しました');
    }

    throw error;
  }
}

export async function stopScan() {
  const engine = getCurrentEngine();
  try {
    if (engine === detector) {
      detector.stopContinuousDetection();
    } else if (engine === zxing) {
      zxing.stopContinuousDetection();
    }
    await camera.stop();
    clearResumeTimer();
    resetDetectionTracking();
    overlay.clear();
    setScannerStatus('stopped');
    logger.debug('scanner:stop:complete');
  } catch (error) {
    logger.error('スキャン停止エラー', error);
    throw error;
  }
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
