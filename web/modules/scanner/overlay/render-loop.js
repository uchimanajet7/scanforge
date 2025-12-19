/**
 * オーバーレイ描画ループ制御。
 */

import { drawEntries } from './rendering.js';

export function scheduleRender(state, syncCanvasSize) {
  if (state.frameHandle !== null) {
    return;
  }
  state.frameHandle = requestAnimationFrame(() => renderFrame(state, syncCanvasSize));
}

export function renderFrame(state, syncCanvasSize) {
  state.frameHandle = null;

  if (!state.ctx || !state.canvas) {
    return;
  }

  syncCanvasSize();

  const { width, height } = state.canvas;
  state.ctx.clearRect(0, 0, width, height);

  const now = performance.now();
  drawEntries(state, now);

  if (state.entries.size) {
    state.frameHandle = requestAnimationFrame(() => renderFrame(state, syncCanvasSize));
  }
}
