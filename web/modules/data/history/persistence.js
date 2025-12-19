import { logger } from '../../core/logger.js';
import { getState } from '../../core/state/base.js';
import { persistState, restoreState } from '../../core/state/persistence.js';

export function saveHistory() {
  try {
    persistState();
    const items = getState('history.items') || [];
    logger.debug('history:save', { count: items.length });
  } catch (error) {
    logger.error('history:save:error', error);
  }
}

export function loadHistory() {
  try {
    restoreState();
    const items = getState('history.items') || [];
    if (items.length === 0) {
      logger.debug('history:load-empty');
    } else {
      logger.debug('history:load', { count: items.length });
    }
  } catch (error) {
    logger.error('history:load:error', error);
  }
}
