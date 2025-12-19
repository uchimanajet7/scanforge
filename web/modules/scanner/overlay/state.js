/**
 * オーバーレイ描画の内部状態。
 */

const overlayState = {
  canvas: null,
  ctx: null,
  video: null,
  entries: new Map(),
  colorIndex: 0,
  sequence: 1,
  frameHandle: null,
  reduceMotion: false,
  reduceMotionListener: null,
  reduceMotionMediaQuery: null,
  resizeObserver: null,
};

export function getOverlayState() {
  return overlayState;
}

export function resetOverlayState() {
  overlayState.canvas = null;
  overlayState.ctx = null;
  overlayState.video = null;
  overlayState.entries.clear();
  overlayState.colorIndex = 0;
  overlayState.sequence = 1;
  overlayState.frameHandle = null;
  overlayState.reduceMotion = false;
  overlayState.reduceMotionListener = null;
  overlayState.reduceMotionMediaQuery = null;
  overlayState.resizeObserver = null;
}
