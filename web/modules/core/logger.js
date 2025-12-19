/**
 * ロギングエントリーポイント。
 */

import { Logger } from './logger/logger-class.js';
import { createError, formatError } from './logger/helpers.js';

export const logger = new Logger();
export default logger;
export { Logger, createError, formatError };

export async function measureTime(fn, label) {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.debug(`${label}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`${label}: failed after ${duration.toFixed(2)}ms`, formatError(error));
    throw error;
  }
}
