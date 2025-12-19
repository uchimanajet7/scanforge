/**
 * パフォーマンス計測ユーティリティ。
 */

import { logger } from './logger.js';

export class PerformanceMonitor {
  constructor(label) {
    this.label = label;
    this.marks = new Map();
  }

  mark(name) {
    const key = `${this.label}-${name}`;
    performance.mark(key);
    this.marks.set(name, key);
  }

  measure(startName, endName = null) {
    const startKey = this.marks.get(startName);
    if (!startKey) {
      logger.warn(`計測マークが見つかりません: ${startName}`);
      return 0;
    }

    const measureName = endName
      ? `${this.label}: ${startName} → ${endName}`
      : `${this.label}: ${startName}`;

    if (endName) {
      const endKey = this.marks.get(endName);
      if (!endKey) {
        logger.warn(`計測マークが見つかりません: ${endName}`);
        return 0;
      }
      performance.measure(measureName, startKey, endKey);
    } else {
      performance.measure(measureName, startKey);
    }

    const entries = performance.getEntriesByName(measureName);
    const duration = entries[entries.length - 1]?.duration || 0;

    logger.debug(`${measureName}: ${duration.toFixed(2)}ms`);

    performance.clearMarks(startKey);
    performance.clearMeasures(measureName);

    return duration;
  }

  clear() {
    this.marks.forEach(key => {
      performance.clearMarks(key);
    });
    this.marks.clear();
  }
}
