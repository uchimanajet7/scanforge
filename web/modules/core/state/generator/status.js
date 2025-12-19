/**
 * ジェネレーター状態のステータス管理。
 */

import { logger } from '../../logger.js';
import { getState, setState } from '../base.js';

export function setGeneratorStatus(status) {
  const oldStatus = getState('generator.status');
  setState('generator.status', status);
  logger.debug('state:generator:transition', { from: oldStatus, to: status });
}
