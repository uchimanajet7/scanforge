import { logger } from '../../core/logger.js';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

export function getStorageSize(options = {}) {
  const { storage = localStorage } = options;

  try {
    let totalSize = 0;
    const details = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const value = storage.getItem(key) || '';
      const size = (key.length + value.length) * 2;
      totalSize += size;
      details.push({
        key,
        size,
        humanSize: formatBytes(size),
      });
    }

    details.sort((a, b) => b.size - a.size);

    return {
      totalSize,
      humanSize: formatBytes(totalSize),
      itemCount: storage.length,
      details,
    };
  } catch (error) {
    logger.error('storage:size:error', error);
    return {
      totalSize: 0,
      humanSize: '0 B',
      itemCount: 0,
      details: [],
    };
  }
}
