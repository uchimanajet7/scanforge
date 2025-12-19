/**
 * カメラモジュール公開インターフェース。
 */

import {
  start,
  stop,
  pause,
  resume,
  isActive,
  getStream,
  getVideoElement,
  getCurrentDeviceId,
  getDeviceList,
} from './stream.js';
import {
  enumerateDevices,
  switchDevice,
  switchToNextCamera,
  init,
} from './devices.js';
import {
  setTorch,
  setZoom,
} from './controls.js';
import { captureFrame } from './capture.js';
import {
  CameraPermissionError,
  CameraNotFoundError,
  CameraInUseError,
} from './errors.js';

export {
  start,
  stop,
  pause,
  resume,
  isActive,
  getStream,
  getVideoElement,
  getCurrentDeviceId,
  getDeviceList,
  enumerateDevices,
  switchDevice,
  switchToNextCamera,
  init,
  setTorch,
  setZoom,
  captureFrame,
  CameraPermissionError,
  CameraNotFoundError,
  CameraInUseError,
};

export default {
  start,
  stop,
  pause,
  resume,
  enumerateDevices,
  switchDevice,
  switchToNextCamera,
  setTorch,
  setZoom,
  captureFrame,
  isActive,
  getStream,
  getVideoElement,
  getCurrentDeviceId,
  getDeviceList,
  init,
  CameraPermissionError,
  CameraNotFoundError,
  CameraInUseError,
};
