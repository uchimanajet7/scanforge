/**
 * カメラデバイスの切り替えと列挙を担当するモジュール。
 */

import { logger } from '../core/logger.js';
import camera from './camera/controller.js';
import * as overlay from './overlay/manager.js';
import { resetDetectionTracking } from './detection-cache.js';
import { pauseScan, resumeScan } from './live/controller.js';
import { isScanning } from './status.js';

async function switchCamera(deviceId) {
  const wasScanning = isScanning();

  try {
    if (wasScanning) {
      pauseScan();
    }

    await camera.switchDevice(deviceId);
    resetDetectionTracking();
    overlay.clear();
    overlay.setVideo(camera.getVideoElement());

    if (wasScanning) {
      await resumeScan();
    }

    logger.debug('scanner:camera-switch:complete', { deviceId });
  } catch (error) {
    logger.error('カメラ切り替えエラー', error);
    throw error;
  }
}

async function switchToNextCamera() {
  const wasScanning = isScanning();

  try {
    if (wasScanning) {
      pauseScan();
    }

    await camera.switchToNextCamera();
    resetDetectionTracking();
    overlay.clear();
    overlay.setVideo(camera.getVideoElement());

    if (wasScanning) {
      await resumeScan();
    }

    logger.debug('scanner:camera-switch:next-complete');
  } catch (error) {
    logger.error('カメラ切り替えエラー', error);
    throw error;
  }
}

async function refreshDeviceList() {
  try {
    return await camera.enumerateDevices();
  } catch (error) {
    logger.error('デバイスリスト更新エラー', error);
    throw error;
  }
}

export { refreshDeviceList, switchCamera, switchToNextCamera };
