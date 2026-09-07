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

async function scanCurrentFrame(options = {}) {
  const { signal } = options;
  const videoElement = camera.getVideoElement();
  if (!videoElement) {
    throw new Error('ビデオ要素がありません');
  }

  const engine = getCurrentEngine();

  try {
    logger.debug('scanner:manual:start');
    signal?.throwIfAborted();
    const canvas = camera.captureFrame({ format: 'canvas', mirror: false });

    let results = [];
    if (engine === detector) {
      results = await detector.detect(canvas);
    } else if (engine === zxing) {
      results = await zxing.detect(canvas);
    }

    signal?.throwIfAborted();

    let accepted = [];
    if (results.length > 0) {
      accepted = handleDetection(results, { force: true, source: 'manual' });
    } else {
      toast.info('コードが検出されませんでした');
    }

    logger.debug('scanner:manual:complete', { count: results.length });
    return accepted;
  } catch (error) {
    if (signal?.aborted) {
      throw signal.reason;
    }

    logger.error('手動スキャンエラー', error);
    toast.error('スキャンに失敗しました');
    throw error;
  }
}

export { scanCurrentFrame };
