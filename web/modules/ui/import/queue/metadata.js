/**
 * キューデータのソートとバッチメタ情報生成を担当するユーティリティ。
 * DOM 操作や副作用を含めない純粋関数群とする。
 */

function normalizeTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

export function getBatchKey(job) {
  if (job && typeof job.batchId === 'string' && job.batchId) {
    return job.batchId;
  }
  return job?.id ? `single:${job.id}` : 'single:unknown';
}

export function sortQueueForDisplay(queue) {
  return [...queue].sort((a, b) => {
    const batchA = normalizeTimestamp(a?.batchCreatedAt ?? a?.createdAt);
    const batchB = normalizeTimestamp(b?.batchCreatedAt ?? b?.createdAt);

    const batchAFinite = Number.isFinite(batchA);
    const batchBFinite = Number.isFinite(batchB);

    if (batchAFinite && batchBFinite && batchA !== batchB) {
      return batchB - batchA;
    }
    if (batchAFinite && !batchBFinite) {
      return -1;
    }
    if (!batchAFinite && batchBFinite) {
      return 1;
    }

    const createdA = normalizeTimestamp(a?.createdAt);
    const createdB = normalizeTimestamp(b?.createdAt);
    const createdAFinite = Number.isFinite(createdA);
    const createdBFinite = Number.isFinite(createdB);

    if (createdAFinite && createdBFinite && createdA !== createdB) {
      return createdB - createdA;
    }
    if (createdAFinite && !createdBFinite) {
      return -1;
    }
    if (!createdAFinite && createdBFinite) {
      return 1;
    }

    const idA = String(a?.id || '');
    const idB = String(b?.id || '');
    return idA.localeCompare(idB);
  });
}

export function computeBatchMetadata(queue, formatBatchTime) {
  const map = new Map();

  queue.forEach(job => {
    const key = getBatchKey(job);
    const timestamp = normalizeTimestamp(job?.batchCreatedAt ?? job?.createdAt);

    if (!map.has(key)) {
      map.set(key, {
        id: job?.batchId || null,
        timestamp,
        count: 0,
        firstFileName: job?.fileName || '',
      });
    }

    const meta = map.get(key);
    meta.count += 1;

    if (Number.isFinite(timestamp) && (!Number.isFinite(meta.timestamp) || timestamp < meta.timestamp)) {
      meta.timestamp = timestamp;
    }

    if (!meta.firstFileName && job?.fileName) {
      meta.firstFileName = job.fileName;
    }
  });

  map.forEach((meta, key) => {
    const ts = Number.isFinite(meta.timestamp) ? meta.timestamp : Date.now();
    meta.timestamp = ts;
    meta.label = formatBatchTime(ts);
    meta.key = key;
  });

  return map;
}
