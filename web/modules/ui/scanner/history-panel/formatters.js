function formatDetectionSourceLabel({ source, metadata = {} }) {
  const origin = metadata.source || source;
  switch (origin) {
    case 'image': {
      const fileName = typeof metadata.fileName === 'string' ? metadata.fileName.trim() : '';
      return fileName || 'ファイル名不明';
    }
    case 'manual':
    case 'live':
      return 'カメラ';
    default:
      return '-';
  }
}

function normalizeHistoryTimestamp(value) {
  const timestamp = Number(value);
  if (Number.isFinite(timestamp)) {
    return timestamp;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatExportSuccessMessage(fileName) {
  return `履歴を書き出しました: ${fileName}`;
}

export function getHistoryDisplayText(item) {
  if (!item) {
    return '検出内容なし';
  }
  const base = typeof item.text === 'string' ? item.text.trim() : '';
  return base || '検出内容なし';
}

export function getHistoryCopyValue(item) {
  if (!item) {
    return '';
  }
  const text = typeof item.text === 'string' ? item.text : '';
  if (text.trim().length > 0) {
    return text;
  }
  const metadataValue =
    typeof item?.metadata?.rawValue === 'string' ? item.metadata.rawValue : '';
  return metadataValue || '';
}

export function getHistoryFormatText(formats, item) {
  const format = typeof item?.format === 'string' ? item.format : '';
  return formats.getDisplayName(format);
}

export function getHistorySourceText(formats, item) {
  const metadata = item?.metadata || {};
  return formatDetectionSourceLabel({
    source: metadata.source || item?.source,
    metadata,
  });
}

export function getHistoryTimestampValue(item) {
  const metadataTs = normalizeHistoryTimestamp(item?.metadata?.timestamp);
  if (metadataTs !== null) {
    return metadataTs;
  }
  const itemTs = normalizeHistoryTimestamp(item?.timestamp);
  if (itemTs !== null) {
    return itemTs;
  }
  return Date.now();
}
