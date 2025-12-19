/**
 * リサイズ監視ユーティリティ。
 */

export function setupResizeObserver(state, syncCanvasSize) {
  if (!state.video || typeof ResizeObserver !== 'function') {
    return;
  }
  const observer = new ResizeObserver(() => {
    syncCanvasSize();
  });
  observer.observe(state.video);
  state.resizeObserver = observer;
}

export function detachResizeObserver(state) {
  if (state.resizeObserver) {
    state.resizeObserver.disconnect();
    state.resizeObserver = null;
  }
}
