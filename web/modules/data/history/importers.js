import { logger } from '../../core/logger.js';
import { generateId } from '../../core/utils.js';
import { getState, setState } from '../../core/state/base.js';
import { saveHistory } from './persistence.js';

export function importHistoryFromJson(json, options = {}) {
  const {
    merge = false,
    validate = true,
  } = options;

  try {
    const data = JSON.parse(json);

    if (validate) {
      if (!data || !Array.isArray(data.items)) {
        throw new Error('履歴データが不正です');
      }

      data.items.forEach((item, index) => {
        if (!item.text || !item.format || !item.timestamp) {
          throw new Error(`項目 ${index + 1} が不正です`);
        }
      });
    }

    const items = (data.items || []).map((item) => ({
      ...item,
      id: generateId(),
    }));

    if (merge) {
      const existing = getState('history.items');
      const merged = [...existing, ...items];
      const maxItems = getState('history.maxItems');
      if (merged.length > maxItems) {
        merged.length = maxItems;
      }
      setState('history.items', merged);
    } else {
      setState('history.items', items);
    }

    saveHistory();

    logger.debug('history:import', { count: items.length, merge });

    return {
      success: true,
      count: items.length,
    };
  } catch (error) {
    logger.error('history:import:error', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
