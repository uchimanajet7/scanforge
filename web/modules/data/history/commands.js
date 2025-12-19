import { logger } from '../../core/logger.js';
import { generateId } from '../../core/utils.js';
import { addHistoryItem, removeHistoryItem, clearHistory as clearHistoryState } from '../../core/state/history.js';
import { getState } from '../../core/state/base.js';
import { saveHistory } from './persistence.js';

export function addHistoryEntry(data) {
  const item = {
    id: generateId(),
    text: data.text || '',
    format: data.format || 'unknown',
    timestamp: new Date().toISOString(),
    metadata: data.metadata || {},
  };

  addHistoryItem(item);
  saveHistory();

  logger.debug('history:add', {
    id: item.id,
    format: item.format,
    textLength: item.text.length,
  });

  return item;
}

export function removeHistoryEntry(id) {
  const items = getState('history.items');
  const exists = items.some((item) => item.id === id);

  if (!exists) {
    logger.warn('history:remove:missing', { id });
    return false;
  }

  removeHistoryItem(id);
  saveHistory();
  logger.debug('history:remove', { id });
  return true;
}

export function clearHistoryEntries() {
  const items = getState('history.items');
  if (!items.length) {
    logger.debug('history:clear:skipped');
    return;
  }

  clearHistoryState();
  saveHistory();
  logger.debug('history:clear', { count: items.length });
}
