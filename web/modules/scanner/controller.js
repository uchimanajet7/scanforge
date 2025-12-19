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
  pauseScan,
  resumeScan,
  startScan,
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
  isCameraActive,
  isScanning,
} from './status.js';
import { resetContext } from './context.js';

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
  cancelImageJob,
  clearImageJobsByStatus,
  cleanup,
  enqueueImageFiles,
  getDebugInfo,
  initScanner,
  isCameraActive,
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
  stopScan,
  switchCamera,
  switchToNextCamera,
};

export default {
  initScanner,
  startScan,
  stopScan,
  pauseScan,
  resumeScan,
  scanCurrentFrame,
  switchCamera,
  switchToNextCamera,
  refreshDeviceList,
  isScanning,
  isCameraActive,
  getDebugInfo,
  cleanup,
  enqueueImageFiles,
  cancelImageJob,
  retryImageJob,
  retryFailedImageJobs,
  clearImageJobsByStatus,
  removeImageJob,
  resetImageQueue,
  stopImageProcessing,
};
