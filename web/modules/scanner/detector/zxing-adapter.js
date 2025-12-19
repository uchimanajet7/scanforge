/**
 * ZXing フォールバックの公開インターフェース。
 */

import { loadLibrary } from './zxing/loader.js';
import {
  initialize,
  detect,
  startContinuousDetection,
  stopContinuousDetection,
  listCameras,
  getDebugInfo,
  cleanup,
} from './zxing/detection.js';
import { resolveBarcodeFormatName } from './zxing/utils.js';
import { getIsScanning } from './zxing/state.js';

export {
  loadLibrary,
  initialize,
  detect,
  startContinuousDetection,
  stopContinuousDetection,
  listCameras,
  getDebugInfo,
  cleanup,
  resolveBarcodeFormatName,
  getIsScanning,
};

export default {
  loadLibrary,
  initialize,
  detect,
  startContinuousDetection,
  stopContinuousDetection,
  listCameras,
  isScanning: getIsScanning,
  getDebugInfo,
  cleanup,
  resolveBarcodeFormatName,
};
