/**
 * ロゴオーバーレイ状態の管理。
 */

import { logger } from '../../logger.js';
import { getState, setState } from '../base.js';
import { createDefaultGeneratorOverlayState } from './overlay/defaults.js';
import { cloneGeneratorOverlayState } from './overlay/normalizers.js';

export { createDefaultGeneratorOverlayState } from './overlay/defaults.js';

export function getGeneratorOverlayState() {
  return cloneGeneratorOverlayState(getState('generator.overlay'));
}

export function updateGeneratorOverlayState(updates) {
  const current = cloneGeneratorOverlayState(getState('generator.overlay'));
  const draft = typeof updates === 'function'
    ? updates({ ...current }) || current
    : { ...current, ...updates };
  const next = cloneGeneratorOverlayState(draft);
  setState('generator.overlay', next);
  logger.debug('state:generator:overlay:update', {
    enabled: next.enabled,
    hasAsset: next.hasAsset,
    sizePercent: next.sizePercent,
    useBadge: next.useBadge,
  });
  return next;
}

export function resetGeneratorOverlayState() {
  const next = createDefaultGeneratorOverlayState();
  setState('generator.overlay', next);
  logger.debug('state:generator:overlay:reset');
  return cloneGeneratorOverlayState(next);
}

export function updateGeneratorOverlayValidation(updates) {
  return updateGeneratorOverlayState(current => {
    const validation = current.validation || {};
    const nextValidation = typeof updates === 'function'
      ? updates({ ...validation }) || validation
      : { ...validation, ...updates };
    const normalized = cloneGeneratorOverlayState({ ...current, validation: nextValidation });
    return normalized;
  }).validation;
}

export function updateGeneratorOverlayVerification(payload = {}) {
  return updateGeneratorOverlayState(current => ({
    ...current,
    verification: {
      lastStatus: ['idle', 'pending', 'passed', 'failed'].includes(payload.lastStatus)
        ? payload.lastStatus
        : current.verification.lastStatus,
      timestamp: Number.isFinite(payload.timestamp)
        ? Number(payload.timestamp)
        : (payload.lastStatus ? Date.now() : current.verification.timestamp),
      reader: typeof payload.reader === 'string' ? payload.reader : current.verification.reader,
      details: payload.details !== undefined ? payload.details : current.verification.details,
    },
  })).verification;
}
