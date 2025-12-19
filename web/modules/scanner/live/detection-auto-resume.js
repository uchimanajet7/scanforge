/**
 * 自動再開タイマーと一時停止制御を司るモジュール。
 */

let resumeHandler = null;

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export function registerResumeHandler(handler) {
  resumeHandler = typeof handler === 'function' ? handler : null;
}

export function pauseAfterDetection({
  engine,
  status,
  detector,
  zxing,
  clearResumeTimer,
  setScannerStatus,
  logger,
}) {
  if (status !== 'scanning' && status !== 'autoResume') {
    return;
  }

  if (engine === detector) {
    detector.stopContinuousDetection();
  } else if (engine === zxing) {
    zxing.stopContinuousDetection();
  }

  clearResumeTimer();
  setScannerStatus('pausedDetection');
  logger.debug('scanner:post-detect-pause');
}

export function scheduleAutoResume({
  getState,
  setState,
  setScannerStatus,
  setAutoResumeState,
  clearAutoResumeState,
  setResumeTimer,
  clearResumeTimer,
  logger,
  appConfig,
}) {
  clearResumeTimer();

  const rawDelay = Number(getState('settings.autoResumeDelayMs'));
  const delayMs = clamp(
    Number.isFinite(rawDelay) ? rawDelay : appConfig.AUTO_RESUME_DEFAULT_MS,
    appConfig.AUTO_RESUME_MIN_MS,
    appConfig.AUTO_RESUME_MAX_MS,
  );

  if (!resumeHandler) {
    logger.warn('resumeHandler が設定されていないため自動再開をスキップ');
    return;
  }

  if (delayMs <= 0) {
    resumeHandler().catch((error) => {
      logger.error('自動再開エラー', error);
      setScannerStatus('autoResumeFailed');
    });
    return;
  }

  setScannerStatus('autoResume');
  setAutoResumeState({
    active: true,
    totalMs: delayMs,
    remainingMs: delayMs,
    startedAt: Date.now(),
  });

  const timer = setTimeout(async () => {
    setResumeTimer(null);
    setState('scanner.resumeTimer', null);
    clearAutoResumeState();
    try {
      await resumeHandler();
    } catch (error) {
      logger.error('自動再開エラー', error);
      setScannerStatus('autoResumeFailed');
    }
  }, delayMs);

  setResumeTimer(timer);
  setState('scanner.resumeTimer', timer);

  logger.debug('scanner:auto-resume-scheduled', { delayMs });
}
