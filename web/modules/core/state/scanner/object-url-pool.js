/**
 * 画像キューに紐づく Object URL の管理を担当する。
 */

import { IMAGE_ACTIVE_STATUSES } from './constants.js';

function uniqueStrings(list = []) {
  return Array.from(new Set(list.filter(value => typeof value === 'string' && value.trim() !== '')));
}

export function mergeObjectUrlPool(currentPool = [], queue = []) {
  const urls = [
    ...(Array.isArray(currentPool) ? currentPool : []),
    ...queue.map(job => job?.objectUrl).filter(Boolean),
  ];
  return uniqueStrings(urls);
}

export function filterActiveTaskIds(activeTaskIds = [], queue = []) {
  const allowed = new Set(
    queue
      .filter(job => job && IMAGE_ACTIVE_STATUSES.includes(job.status))
      .map(job => job.id)
      .filter(Boolean)
  );
  return uniqueStrings(
    Array.isArray(activeTaskIds)
      ? activeTaskIds.filter(id => allowed.has(id))
      : []
  );
}

