/**
 * スキャンエンジンの選択と状態監視を担当するモジュール。
 */

import { logger } from '../core/logger.js';
import { getState, subscribe } from '../core/state/base.js';
import detector from './detector/controller.js';
import zxing from './detector/zxing-adapter.js';
import {
  getCurrentEngine,
  getScanMode,
  setCurrentEngine,
  setScanMode,
} from './context.js';

async function determineScanMode() {
  const userMode = getState('settings.scanMode');

  if (userMode === 'barcodeDetector') {
    if (detector.isSupported()) {
      setScanMode('barcodeDetector');
      setCurrentEngine(detector);
    } else {
      logger.warn('BarcodeDetector は利用できません。ZXing を使用します');
      setScanMode('zxing');
      setCurrentEngine(zxing);
    }
  } else if (userMode === 'zxing') {
    setScanMode('zxing');
    setCurrentEngine(zxing);
  } else {
    if (detector.isSupported()) {
      setScanMode('barcodeDetector');
      setCurrentEngine(detector);
    } else {
      setScanMode('zxing');
      setCurrentEngine(zxing);
    }
  }

  logger.debug('scanner:mode:resolved', { mode: getScanMode() });
  return getCurrentEngine();
}

function setupStateListeners() {
  subscribe('settings.scanMode', async () => {
    await determineScanMode();
    logger.debug('scanner:mode:changed', { mode: getScanMode() });
  });

  subscribe('settings.continuousScan', (enabled) => {
    logger.debug('scanner:continuous-scan:changed', { enabled });
  });
}

export { determineScanMode, getCurrentEngine, getScanMode, setupStateListeners };
