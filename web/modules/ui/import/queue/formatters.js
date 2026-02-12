/**
 * UI 表示用の文字列整形を担当するユーティリティ。
 * DOM 操作は行わない。
 */

export function truncate(text, limit) {
  if (!text) {
    return '';
  }
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatBatchTime(timestamp, formatDateTime, logger) {
  try {
    return formatDateTime(timestamp);
  } catch (error) {
    logger?.debug?.('scan-import:batch:timestamp-format-error', { error });
    return '時刻不明';
  }
}

export function formatRetryLabel(job) {
  if (job.retryAt) {
    const remaining = job.retryAt - Date.now();
    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000);
      return `再試行準備中。再試行まで約 ${seconds} 秒です。`;
    }
  }
  return '再試行を準備しています…';
}

export function formatJobStatusLabel(job) {
  switch (job.status) {
    case 'queued':
      return '待機中';
    case 'preparing':
      return '準備中…';
    case 'scanning':
      return '解析中…';
    case 'retrying':
      return formatRetryLabel(job);
    case 'success':
      return '解析完了';
    case 'failed':
      return '解析に失敗しました';
    case 'canceled':
      return 'キャンセル済み';
    default:
      return '処理中';
  }
}

export function formatJobDetail(job, formats, truncateFn) {
  if (job.status === 'success' && job.result?.results?.length) {
    const count = job.result.results.length;
    const first = job.result.results[0];
    const formatName = formats.getDisplayName(first.format);
    const snippet = truncateFn(first.text || '', 48);
    return count > 1
      ? `${count} 件検出。先頭は ${formatName} / ${snippet}。`
      : `${formatName} を検出しました: ${snippet}`;
  }

  if (job.status === 'failed' && job.error) {
    return job.error;
  }

  if (job.status === 'canceled') {
    return job.error || 'ユーザー操作によりキャンセルされました。';
  }

  if (job.status === 'retrying') {
    return job.error || '自動再試行を待機しています。';
  }

  if (job.status === 'queued' && job.attempts > 0) {
    return `再試行待機中。試行は ${job.attempts} 回目です。`;
  }

  return '';
}
