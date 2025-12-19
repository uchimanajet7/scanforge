/**
 * 画像読み取りキューの公開関数を提供するモジュール。
 */

import { getState } from '../../core/state/base.js';
import { addImageQueueJobs } from '../../core/state/scanner/image-queue/mutations.js';
import { generateId } from '../../core/utils.js';
import toast from '../../ui/toast/manager.js';
import { scheduleImageQueue } from './runner.js';
import { normalizeFileInput } from './utils.js';
import { buildImageQueueJobs } from './job-factory.js';
export {
  cancelImageJob,
  clearImageJobsByStatus,
  removeImageJob,
  resetImageQueue,
  retryFailedImageJobs,
  retryImageJob,
  stopImageProcessing,
} from './job-commands.js';

async function enqueueImageFiles(input) {
  const files = normalizeFileInput(input);
  if (!files.length) {
    return { added: [], duplicates: [] };
  }

  const queue = getState('scanner.image.queue') || [];
  const now = Date.now();
  const batchId = generateId();

  const {
    jobs,
    duplicates,
    validationErrors,
  } = await buildImageQueueJobs(files, {
    queue,
    now,
    batchId,
    batchCreatedAt: now,
  });

  validationErrors.forEach(message => {
    toast.error(message);
  });

  if (duplicates.length) {
    toast.info('同じファイル内容が処理中です。完了後に再度追加してください。');
  }

  const addedJobs = addImageQueueJobs(jobs);

  if (addedJobs.length) {
    scheduleImageQueue();
  }

  return {
    added: addedJobs,
    duplicates,
  };
}

export {
  enqueueImageFiles,
};
