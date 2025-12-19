/**
 * カメラのトーチ・ズーム制御。
 */

import { logger } from '../../core/logger.js';
import { getMediaStream } from './state.js';

export async function setTorch(enable) {
  const stream = getMediaStream();
  if (!stream) {
    logger.warn('カメラが起動していません');
    return false;
  }

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    return false;
  }

  const capabilities = videoTrack.getCapabilities();
  if (!capabilities?.torch) {
    logger.debug('camera:torch-unsupported');
    return false;
  }

  try {
    await videoTrack.applyConstraints({
      advanced: [{ torch: !!enable }],
    });
    logger.debug('camera:torch-control', { enable: !!enable });
    return true;
  } catch (error) {
    logger.error('トーチ制御エラー', error);
    return false;
  }
}

export async function setZoom(zoom) {
  const stream = getMediaStream();
  if (!stream) {
    logger.warn('カメラが起動していません');
    return false;
  }

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    return false;
  }

  const capabilities = videoTrack.getCapabilities();
  if (!capabilities?.zoom) {
    logger.debug('camera:zoom-unsupported');
    return false;
  }

  const minZoom = capabilities.zoom.min || 1;
  const maxZoom = capabilities.zoom.max || 1;
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));

  try {
    await videoTrack.applyConstraints({
      advanced: [{ zoom: clampedZoom }],
    });
    logger.debug('camera:zoom-updated', { zoom: clampedZoom });
    return true;
  } catch (error) {
    logger.error('ズーム設定エラー', error);
    return false;
  }
}
