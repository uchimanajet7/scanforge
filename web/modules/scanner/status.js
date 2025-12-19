/**
 * スキャナーの状態取得 API を提供するモジュール。
 */

import { getState } from '../core/state/base.js';
import camera from './camera/controller.js';
import { getCurrentEngine, getScanMode } from './context.js';

function isScanning() {
  const status = getState('scanner.status');
  return status === 'scanning' || status === 'autoResume';
}

function isCameraActive() {
  return camera.isActive();
}

function getDebugInfo() {
  return {
    scanMode: getScanMode(),
    status: getState('scanner.status'),
    cameraActive: camera.isActive(),
    devices: camera.getDeviceList(),
    currentDevice: camera.getCurrentDeviceId(),
    engineDebug: getCurrentEngine()?.getDebugInfo?.() || {},
  };
}

export { getDebugInfo, getScanMode, isCameraActive, isScanning };
