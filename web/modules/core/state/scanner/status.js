/**
 * スキャナーステータスとミラー設定の更新を専任化するモジュール。
 */

import { logger } from '../../logger.js';
import { getState, setState } from '../base.js';

export function setGlobalMirrorPreference(enabled) {
  const value = !!enabled;
  setState('scanner.isMirrored', value);
  logger.debug('鏡像設定更新', { enabled: value });
  return value;
}

export function setScannerStatus(status) {
  const previous = getState('scanner.status');
  setState('scanner.status', status);
  logger.debug('state:scanner:transition', { from: previous, to: status });
}
