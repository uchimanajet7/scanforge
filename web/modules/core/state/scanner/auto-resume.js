/**
 * 自動再開状態の管理ロジックを集約するモジュール。
 */

import { logger } from '../../logger.js';
import { setState } from '../base.js';

export function setAutoResumeState(payload) {
  const next = {
    active: !!payload?.active,
    totalMs: Math.max(0, Number(payload?.totalMs) || 0),
    remainingMs: Math.max(0, Number(payload?.remainingMs) || 0),
    startedAt: Number(payload?.startedAt) || 0,
  };
  setState('scanner.autoResume', next);
  logger.debug('自動再開状態更新', next);
}

export function clearAutoResumeState() {
  setState('scanner.autoResume', {
    active: false,
    totalMs: 0,
    remainingMs: 0,
    startedAt: 0,
  });
  logger.debug('自動再開状態リセット');
}
