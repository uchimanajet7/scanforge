/**
 * get-scan-history WebMCP tool adapter。
 */

import { getHistory } from '../../data/history/queries.js';
import {
  normalizeSource,
  normalizeTimestamp,
  truncateText,
  validateHistoryInput,
} from '../validation.js';

const INVALID_INPUT_MESSAGE = '履歴取得の入力値が契約に一致しません。';

function invalidInput() {
  return {
    ok: false,
    status: 'invalid-input',
    message: INVALID_INPUT_MESSAGE,
  };
}

function projectHistoryItem(item) {
  const projectedText = truncateText(item?.text);
  return {
    format: typeof item?.format === 'string' ? item.format : 'unknown',
    text: projectedText.text,
    textTruncated: projectedText.textTruncated,
    source: normalizeSource(item?.metadata?.source ?? item?.source),
    timestamp: normalizeTimestamp(item?.metadata?.timestamp, item?.timestamp),
  };
}

export function executeGetScanHistory(input, options = {}) {
  const validation = validateHistoryInput(input);
  if (!validation.valid) {
    return invalidInput();
  }

  const signal = options?.signal;
  signal?.throwIfAborted();

  const history = getHistory();
  signal?.throwIfAborted();
  const items = history.slice(0, validation.limit).map(projectHistoryItem);
  signal?.throwIfAborted();

  return {
    ok: true,
    status: 'history-read',
    returned: items.length,
    total: history.length,
    items,
  };
}
