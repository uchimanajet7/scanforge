export function createResumeProgressState() {
  const snapshot = {
    active: false,
    totalMs: 0,
    startedAt: 0,
  };

  let animationFrameId = null;
  let timeoutId = null;

  function start({ totalMs, startedAt }) {
    snapshot.active = true;
    snapshot.totalMs = totalMs;
    snapshot.startedAt = startedAt;
  }

  function stop() {
    snapshot.active = false;
    snapshot.totalMs = 0;
    snapshot.startedAt = 0;
    animationFrameId = null;
    timeoutId = null;
  }

  function setAnimationFrameId(id) {
    animationFrameId = id;
  }

  function clearAnimationFrameId() {
    animationFrameId = null;
  }

  function setTimeoutId(id) {
    timeoutId = id;
  }

  function clearTimeoutId() {
    timeoutId = null;
  }

  return {
    start,
    stop,
    isActive: () => snapshot.active,
    getSnapshot: () => ({ ...snapshot }),
    getAnimationFrameId: () => animationFrameId,
    setAnimationFrameId,
    clearAnimationFrameId,
    getTimeoutId: () => timeoutId,
    setTimeoutId,
    clearTimeoutId,
  };
}
