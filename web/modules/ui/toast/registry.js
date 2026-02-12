/**
 * トーストのタイマーとクリーンアップ関数を管理するレジストリ。
 */

const timers = new Map();
const elementCleanups = new Map();

export function setTimer(id, timerId) {
  timers.set(id, timerId);
}

export function pullTimer(id) {
  if (!timers.has(id)) {
    return null;
  }
  const timerId = timers.get(id);
  timers.delete(id);
  return timerId;
}

export function setCleanup(id, cleanup) {
  if (typeof cleanup === 'function') {
    elementCleanups.set(id, cleanup);
  }
}

export function pullCleanup(id) {
  if (!elementCleanups.has(id)) {
    return null;
  }
  const cleanup = elementCleanups.get(id);
  elementCleanups.delete(id);
  return cleanup;
}

export function resetRegistry() {
  Array.from(timers.values()).forEach(timerId => {
    clearTimeout(timerId);
  });
  timers.clear();

  Array.from(elementCleanups.values()).forEach(cleanup => {
    try {
      cleanup();
    } catch {
      // cleanup は任意の後処理であり、ベストエフォートとして一部の失敗で全体のリセットが中断しないよう無視する。
    }
  });
  elementCleanups.clear();
}
