/**
 * スキャナー状態に対する読み取り系のユーティリティ。
 */

import { APP_CONFIG } from '../../config/app-settings.js';
import { getState } from '../base.js';
import { cloneImageJob } from './initial-state.js';

export function getGlobalMirrorPreference() {
  const mirrored = getState('scanner.isMirrored');
  if (typeof mirrored === 'boolean') {
    return mirrored;
  }
  return APP_CONFIG.MIRROR_DEFAULT;
}

export function getImageQueueJob(jobId) {
  if (!jobId) {
    return null;
  }
  const queue = getState('scanner.image.queue');
  if (!Array.isArray(queue)) {
    return null;
  }
  const found = queue.find(job => job?.id === jobId);
  return found ? cloneImageJob(found) : null;
}

export function getImageQueueJobsByStatus(status) {
  const queue = getState('scanner.image.queue');
  if (!Array.isArray(queue)) {
    return [];
  }
  return queue
    .filter(job => job?.status === status)
    .map(cloneImageJob)
    .filter(Boolean);
}
