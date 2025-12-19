/**
 * 画像キュー状態の生成とクローン処理を集約する。
 */

export function createDefaultImageState() {
  return {
    status: 'idle',
    queue: [],
    activeTaskIds: [],
    overall: {
      totalBytes: 0,
      processedBytes: 0,
      completed: 0,
      failed: 0,
      canceled: 0,
    },
    objectUrlPool: [],
    lastProcessedAt: null,
    lastError: null,
  };
}

export function cloneImageJobResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const cloned = {
    ...result,
    results: Array.isArray(result.results)
      ? result.results.map(item => ({
          ...item,
          boundingBox: item?.boundingBox ? { ...item.boundingBox } : null,
          cornerPoints: Array.isArray(item?.cornerPoints)
            ? item.cornerPoints.map(point => ({ ...point }))
            : [],
        }))
      : [],
  };

  if (cloned.boundingBox) {
    cloned.boundingBox = { ...cloned.boundingBox };
  }

  return cloned;
}

export function cloneImageJob(job) {
  if (!job || typeof job !== 'object') {
    return null;
  }

  return {
    ...job,
    progress: job.progress ? { ...job.progress } : null,
    result: cloneImageJobResult(job.result),
    error: job.error ?? null,
    objectUrl: job.objectUrl ?? null,
  };
}

export function cloneImageState(source = createDefaultImageState()) {
  return {
    status: source.status ?? 'idle',
    queue: Array.isArray(source.queue) ? source.queue.map(cloneImageJob).filter(Boolean) : [],
    activeTaskIds: Array.isArray(source.activeTaskIds) ? [...source.activeTaskIds] : [],
    overall: {
      totalBytes: source.overall?.totalBytes || 0,
      processedBytes: source.overall?.processedBytes || 0,
      completed: source.overall?.completed || 0,
      failed: source.overall?.failed || 0,
      canceled: source.overall?.canceled || 0,
    },
    objectUrlPool: Array.isArray(source.objectUrlPool) ? [...source.objectUrlPool] : [],
    lastProcessedAt: source.lastProcessedAt ?? null,
    lastError: source.lastError ?? null,
  };
}
