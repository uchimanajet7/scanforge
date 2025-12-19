import { createResumeProgressState } from './resume-progress/state.js';
import { createResumeProgressView } from './resume-progress/view.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatSeconds(ms) {
  return Math.max(0.1, Math.ceil(ms / 100) / 10).toFixed(1);
}

export default function createResumeProgressModule(context, dependencies = {}) {
  const { elements } = context;
  const stateFactory = dependencies.stateFactory || createResumeProgressState;
  const viewFactory = dependencies.viewFactory || createResumeProgressView;
  const state = stateFactory();
  const view = viewFactory({
    progressEl: elements.resumeProgress,
    labelEl: elements.resumeProgressLabel,
  });

  function init() {
    view.observeReduceMotion(() => {
      if (state.isActive()) {
        restartResumeProgress();
      }
    });
  }

  function destroy() {
    stopResumeProgress();
    view.disconnectReduceMotion();
  }

  function handleAutoResumeState(autoResume) {
    if (!elements.resumeProgress) {
      return;
    }
    const active = !!autoResume?.active;
    if (
      active &&
      Number(autoResume?.totalMs) > 0 &&
      Number(autoResume?.startedAt) > 0
    ) {
      startResumeProgress(autoResume);
      return;
    }
    stopResumeProgress();
  }

  function handleStatusChange(status) {
    if (status !== 'autoResume') {
      stopResumeProgress();
    }
  }

  function startResumeProgress(autoResume) {
    if (!elements.resumeProgress) {
      return;
    }
    stopResumeProgress();
    const totalMs = Math.max(0, Number(autoResume?.totalMs) || 0);
    if (totalMs <= 0) {
      return;
    }
    const startedAtRaw = Number(autoResume?.startedAt) || Date.now();
    const remainingMsRaw = Number(autoResume?.remainingMs);
    const remainingMs = Number.isFinite(remainingMsRaw) ? clamp(remainingMsRaw, 0, totalMs) : totalMs;
    const elapsedMs = totalMs - remainingMs;
    state.start({
      totalMs,
      startedAt: startedAtRaw - elapsedMs,
    });
    updateResumeProgressVisual();
  }

  function stopResumeProgress(complete = false) {
    cancelResumeProgressUpdate();
    state.stop();
    view.hide({ complete });
  }

  function restartResumeProgress() {
    if (!state.isActive()) {
      return;
    }
    cancelResumeProgressUpdate();
    updateResumeProgressVisual();
  }

  function updateResumeProgressVisual() {
    if (!state.isActive()) {
      return;
    }
    const snapshot = state.getSnapshot();
    const now = Date.now();
    const elapsed = clamp(now - snapshot.startedAt, 0, snapshot.totalMs);
    const ratio = snapshot.totalMs > 0 ? elapsed / snapshot.totalMs : 1;
    const remaining = Math.max(0, snapshot.totalMs - elapsed);
    const label = remaining <= 0 ? 'スキャンを再開しています' : `再開まであと ${formatSeconds(remaining)} 秒`;
    view.showActive({
      ratio,
      totalMs: snapshot.totalMs,
      elapsedMs: elapsed,
      labelText: label,
    });

    if (ratio >= 1) {
      stopResumeProgress(true);
      return;
    }

    scheduleResumeProgressUpdate();
  }

  function scheduleResumeProgressUpdate() {
    cancelResumeProgressUpdate();
    if (view.prefersReducedMotion()) {
      const timeoutId = window.setTimeout(() => {
        updateResumeProgressVisual();
      }, 120);
      state.setTimeoutId(timeoutId);
    } else {
      const frameId = window.requestAnimationFrame(() => {
        updateResumeProgressVisual();
      });
      state.setAnimationFrameId(frameId);
    }
  }

  function cancelResumeProgressUpdate() {
    const frameId = state.getAnimationFrameId();
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      state.clearAnimationFrameId();
    }
    const timeoutId = state.getTimeoutId();
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      state.clearTimeoutId();
    }
  }

  return {
    init,
    destroy,
    handleAutoResumeState,
    handleStatusChange,
  };
}
