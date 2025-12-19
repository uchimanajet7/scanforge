import { generateId } from '../../core/utils.js';
import {
  IMAGE_JOB_ACTIVE_STATUSES,
  getImageJobStore,
} from '../context.js';
import * as imageScanner from '../image/pipeline.js';
import {
  createImageJobContext,
  getFileFingerprint,
  toFriendlyImageError,
} from './utils.js';

function isActiveDuplicate(fingerprint, queue, pendingJobs) {
  if (!fingerprint) {
    return false;
  }
  const matchesActive = job =>
    job.fingerprint === fingerprint && IMAGE_JOB_ACTIVE_STATUSES.has(job.status);
  return queue.some(matchesActive) || pendingJobs.some(matchesActive);
}

export async function buildImageQueueJobs(files, {
  queue,
  now,
  batchId,
  batchCreatedAt,
} = {}) {
  const store = getImageJobStore();
  const jobs = [];
  const duplicates = [];
  const validationErrors = [];

  for (const file of files) {
    if (!(file instanceof File)) {
      continue;
    }

    let fingerprint = '';
    try {
      fingerprint = await getFileFingerprint(file);
    } catch (error) {
      fingerprint = '';
    }

    if (isActiveDuplicate(fingerprint, queue, jobs)) {
      duplicates.push({ file, reason: 'duplicate', fingerprint });
      continue;
    }

    const id = generateId();
    const objectUrl = URL.createObjectURL(file);
    const job = {
      id,
      fileName: file.name || '未命名ファイル',
      fileSize: file.size || 0,
      mime: (file.type || '').toLowerCase(),
      objectUrl,
      status: 'queued',
      progress: null,
      error: null,
      result: null,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      fingerprint: fingerprint || null,
      retryAt: null,
      batchId,
      batchCreatedAt,
    };

    const context = createImageJobContext({
      id,
      file,
      objectUrl,
      fingerprint: fingerprint || null,
      batchId,
      batchCreatedAt,
    });

    store.set(id, context);

    try {
      imageScanner.validateImageFile(file);
    } catch (validationError) {
      const message = toFriendlyImageError(validationError);
      job.status = 'failed';
      job.error = message;
      validationErrors.push(message);
    }

    jobs.push(job);
  }

  return {
    jobs,
    duplicates,
    validationErrors,
  };
}
