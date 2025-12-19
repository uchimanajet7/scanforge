/**
 * 手動スキャン処理を提供するモジュール。
 */

import { logger } from '../core/logger.js';
import toast from '../ui/toast/manager.js';
import camera from './camera/controller.js';
import detector from './detector/controller.js';
import zxing from './detector/zxing-adapter.js';
import { getCurrentEngine } from './context.js';
import { handleDetection } from './live/controller.js';

async function scanCurrentFrame() {
  const videoElement = camera.getVideoElement();
  if (!videoElement) {
    throw new Error('ビデオ要素がありません');
  }

  const engine = getCurrentEngine();

  try {
    logger.debug('scanner:manual:start');
    const canvas = camera.captureFrame({ format: 'canvas', mirror: false });

    let results = [];
    if (engine === detector) {
      results = await detector.detect(canvas);
    } else if (engine === zxing) {
      results = await zxing.detect(canvas);
    }

    if (results.length > 0) {
      handleDetection(results, { force: true, source: 'manual' });
    } else {
      toast.info('コードが検出されませんでした');
    }

    logger.debug('scanner:manual:complete', { count: results.length });
    return results;
  } catch (error) {
    logger.error('手動スキャンエラー', error);
    toast.error('スキャンに失敗しました');
    throw error;
  }
}

export { scanCurrentFrame };
