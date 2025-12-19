import { logger } from '../../core/logger.js';
import { getState, setState, subscribe } from '../../core/state/base.js';
import { loadHistory, saveHistory } from './persistence.js';

export function initHistory() {
  loadHistory();

  subscribe('history.maxItems', (maxItems) => {
    const items = getState('history.items');
    if (items.length > maxItems) {
      items.length = maxItems;
      setState('history.items', items);
      saveHistory();
      logger.debug('history:trimmed', { maxItems });
    }
  });

  logger.debug('history:init');
}
