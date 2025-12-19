/**
 * オーバーレイ描画モジュール公開 API。
 */

import { logger } from '../../core/logger.js';
import { getOverlayState, resetOverlayState } from './state.js';
import { updateReduceMotionPreference, detachReduceMotionListener } from './preferences.js';
import { setupResizeObserver, detachResizeObserver } from './resize.js';
import { scheduleRender } from './render-loop.js';
import { prepareEntry } from './rendering.js';
import { toOverlayGeometry } from './geometry.js';

export function attach({ canvas, video } = {}) {
  const state = getOverlayState();

  detachResizeObserver(state);
  detachReduceMotionListener(state);

  state.canvas = canvas || document.getElementById('scanOverlay');
  state.video = video || null;
  state.ctx = state.canvas?.getContext('2d') || null;
  state.entries.clear();
  state.colorIndex = 0;
  state.sequence = 1;

  if (!state.canvas || !state.ctx) {
    logger.warn('オーバーレイキャンバスを初期化できません');
    return;
  }

  syncCanvasSize();
  updateReduceMotionPreference(state);
  setupResizeObserver(state, syncCanvasSize);
  logger.debug('オーバーレイを初期化しました');
}

export function setVideo(video) {
  const state = getOverlayState();
  detachResizeObserver(state);
  state.video = video || null;
  syncCanvasSize();
  setupResizeObserver(state, syncCanvasSize);
}

export function updateDetections(detections = []) {
  const state = getOverlayState();
  if (!state.ctx || !Array.isArray(detections) || detections.length === 0) {
    return;
  }

  const now = performance.now();

  detections.forEach((detection) => {
    const geometry = toOverlayGeometry(detection);
    if (!geometry) {
      return;
    }
    prepareEntry(state, detection, now, geometry);
  });

  scheduleRender(state, syncCanvasSize);
}

export function clear() {
  const state = getOverlayState();

  if (state.frameHandle !== null) {
    cancelAnimationFrame(state.frameHandle);
    state.frameHandle = null;
  }

  state.entries.clear();

  if (state.ctx && state.canvas) {
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  }
}

export function destroy() {
  clear();
  const state = getOverlayState();
  detachResizeObserver(state);
  detachReduceMotionListener(state);
  resetOverlayState();
}

export function setMirrored(_mirrored) {
  // CSS 側で処理するため本体では何もしない
}

export function syncCanvasSize() {
  const state = getOverlayState();
  if (!state.canvas || !state.ctx) {
    return;
  }

  const video = state.video;
  const width = video?.videoWidth || state.canvas.width;
  const height = video?.videoHeight || state.canvas.height;

  if (!width || !height) {
    return;
  }

  if (state.canvas.width !== width || state.canvas.height !== height) {
    state.canvas.width = width;
    state.canvas.height = height;
  }
}

export default {
  attach,
  setVideo,
  updateDetections,
  clear,
  destroy,
  setMirrored,
  syncCanvasSize,
};
