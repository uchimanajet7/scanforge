import { logger } from '../../core/logger.js';
import { set, get, has, remove } from './operations.js';

export function migrateStorage(migrations) {
  const results = {};

  Object.entries(migrations).forEach(([oldKey, newKey]) => {
    try {
      if (has(oldKey) && !has(newKey)) {
        const value = get(oldKey, { deserialize: false });
        if (value !== null) {
          const parsed = (() => {
            try {
              return JSON.parse(value);
            } catch {
              // JSON でなければ文字列のまま移す（ローカルストレージには JSON 以外も入り得る）。
              return value;
            }
          })();
          set(newKey, parsed);
          remove(oldKey);
          results[oldKey] = { success: true, newKey };
          logger.debug('storage:migrate:key', { oldKey, newKey });
        }
      }
    } catch (error) {
      logger.error('storage:migrate:error', { oldKey, newKey, error });
      results[oldKey] = { success: false, error: error.message };
    }
  });

  return results;
}
