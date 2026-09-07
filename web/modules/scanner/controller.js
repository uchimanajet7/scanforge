/**
 * スキャナーモジュール エントリーポイント
 *
 * 各サブモジュールを統合し、既存の公開 API を提供する。
 */

import { logger } from '../core/logger.js';
import camera from './camera/controller.js';
import detector from './detector/controller.js';
import zxing from './detector/zxing-adapter.js';
import * as overlay from './overlay/manager.js';
import {
  determineScanMode,
  getScanMode,
  setupStateListeners,
} from './engine-manager.js';
import {
  cancelImageJob,
  clearImageJobsByStatus,
  enqueueImageFiles,
  removeImageJob,
  resetImageQueue,
  retryFailedImageJobs,
  retryImageJob,
  stopImageProcessing,
} from './queue/controller.js';
import {
  CameraStartStoppedError,
  isCameraStartPending,
  pauseScan,
  resumeScan,
  startScan,
  startScanFromCurrentState,
  stopScan,
} from './live/controller.js';
import { scanCurrentFrame } from './manual-scan.js';
import {
  refreshDeviceList,
  switchCamera,
  switchToNextCamera,
} from './device-manager.js';
import {
  getDebugInfo,
  getScannerStatus,
  isCameraActive,
  isScanning,
} from './status.js';
import { resetContext } from './context.js';
import {
  CameraInUseError,
  CameraNotFoundError,
  CameraPermissionError,
} from './camera/errors.js';

async function initScanner() {
  logger.debug('scanner:init:start');
  try {
    await camera.init();
    await determineScanMode();
    setupStateListeners();
    logger.debug('scanner:init:complete', { mode: getScanMode() });
  } catch (error) {
    logger.error('スキャナー初期化エラー', error);
    throw error;
  }
}

async function cleanup() {
  try {
    await stopScan();
    if (detector?.cleanup) {
      detector.cleanup();
    }
    if (zxing?.cleanup) {
      zxing.cleanup();
    }
    overlay.destroy();
    resetImageQueue();
    resetContext();
    logger.debug('scanner:cleanup:complete');
  } catch (error) {
    logger.error('スキャナークリーンアップエラー', error);
  }
}

export {
  CameraStartStoppedError,
  CameraInUseError,
  CameraNotFoundError,
  CameraPermissionError,
  cancelImageJob,
  clearImageJobsByStatus,
  cleanup,
  enqueueImageFiles,
  getDebugInfo,
  getScannerStatus,
  initScanner,
  isCameraActive,
  isCameraStartPending,
  isScanning,
  pauseScan,
  refreshDeviceList,
  removeImageJob,
  resetImageQueue,
  resumeScan,
  retryFailedImageJobs,
  retryImageJob,
  stopImageProcessing,
  scanCurrentFrame,
  startScan,
  startScanFromCurrentState,
  stopScan,
  switchCamera,
  switchToNextCamera,
};

export default {
  CameraStartStoppedError,
  initScanner,
  startScan,
  startScanFromCurrentState,
  stopScan,
  pauseScan,
  resumeScan,
  scanCurrentFrame,
  switchCamera,
  switchToNextCamera,
  refreshDeviceList,
  isScanning,
  isCameraActive,
  isCameraStartPending,
  getDebugInfo,
  getScannerStatus,
  cleanup,
  enqueueImageFiles,
  cancelImageJob,
  retryImageJob,
  retryFailedImageJobs,
  clearImageJobsByStatus,
  removeImageJob,
  resetImageQueue,
  stopImageProcessing,
  CameraInUseError,
  CameraNotFoundError,
  CameraPermissionError,
};
