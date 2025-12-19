/**
 * カメラフレームのキャプチャ処理。
 */

import { getState } from '../../core/state/base.js';
import { getVideoElement as getVideoElementState } from './state.js';

export function captureFrame(options = {}) {
  const {
    format = 'imageData',
    quality = 0.9,
    mirror = true,
  } = options;

  const videoElement = getVideoElementState();
  if (!videoElement) {
    throw new Error('ビデオ要素がありません');
  }

  const width = videoElement.videoWidth;
  const height = videoElement.videoHeight;

  if (!width || !height) {
    throw new Error('ビデオのサイズが取得できません');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('キャンバスコンテキストを取得できません');
  }

  const isMirrored = mirror && getState('scanner.isMirrored');
  if (isMirrored) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoElement, 0, 0, width, height);

  if (format === 'imageData') {
    return ctx.getImageData(0, 0, width, height);
  }

  if (format === 'dataURL') {
    return canvas.toDataURL('image/jpeg', quality);
  }

  if (format === 'blob') {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
  }

  if (format === 'canvas') {
    return canvas;
  }

  throw new Error(`不明なフォーマット: ${format}`);
}
