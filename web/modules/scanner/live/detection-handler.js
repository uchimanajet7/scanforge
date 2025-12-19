/**
 * 検出結果の処理と自動再開制御。
 */

import { logger } from '../../core/logger.js';
import { getState, setState } from '../../core/state/base.js';
import { setScannerStatus } from '../../core/state/scanner/status.js';
import { setAutoResumeState, clearAutoResumeState } from '../../core/state/scanner/auto-resume.js';
import { addHistoryEntry } from '../../data/history/commands.js';
import toast from '../../ui/toast/manager.js';
import { APP_CONFIG } from '../../core/config/app-settings.js';
import detector from '../detector/controller.js';
import zxing from '../detector/zxing-adapter.js';
import overlay from '../overlay/manager.js';
import {
  getScanMode,
  getCurrentEngine,
} from '../context.js';
import {
  shouldEmitDetection,
} from '../detection-cache.js';
import {
  clearResumeTimer,
  setResumeTimer,
} from './timers.js';
import { normalizeDetectionResult } from './detection-normalizer.js';
import { applyDetectionEffects } from './detection-effects.js';
import {
  pauseAfterDetection,
  scheduleAutoResume,
} from './detection-auto-resume.js';

export { registerResumeHandler } from './detection-auto-resume.js';

export function handleDetection(results, options = {}) {
  const { force = false, source = 'live' } = options;

  if (!Array.isArray(results) || results.length === 0) {
    return [];
  }

  const normalized = results
    .map((result) => normalizeDetectionResult(result, {
      source,
      resolveEngine: () => getScanMode(),
    }))
    .filter(Boolean);

  if (!normalized.length) {
    return [];
  }

  const now = performance.now();
  const accepted = normalized.filter((detection) => shouldEmitDetection(detection, { force, now }));

  if (!accepted.length) {
    logger.debug('検出結果はキャッシュにより抑制', {
      total: normalized.length,
      ignored: normalized.length,
      force,
    });
    return [];
  }

  logger.debug('scanner:detected', {
    count: accepted.length,
    formats: accepted.map(r => r.format),
    source,
  });

  const shouldPause = source === 'live' || source === 'manual';
  if (shouldPause) {
    const engine = getCurrentEngine();
    const status = getState('scanner.status');
    pauseAfterDetection({
      engine,
      status,
      detector,
      zxing,
      clearResumeTimer,
      setScannerStatus,
      logger,
    });
  }

  applyDetectionEffects(accepted, {
    overlay,
    setState,
    addHistoryEntry,
    getState,
    toast,
    logger,
  });

  if (shouldPause && getState('settings.continuousScan')) {
    scheduleAutoResume({
      getState,
      setState,
      setScannerStatus,
      setAutoResumeState,
      clearAutoResumeState,
      setResumeTimer,
      clearResumeTimer,
      logger,
      appConfig: APP_CONFIG,
    });
  }

  return accepted;
}
