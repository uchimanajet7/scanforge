/**
 * 履歴パネル制御
 */

import { on } from '../core/dom/events.js';
import { createHistoryActions } from './history-panel/actions.js';
import {
  getHistoryCopyValue,
  getHistoryDisplayText,
  getHistoryFormatText,
  getHistorySourceText,
  getHistoryTimestampValue,
} from './history-panel/formatters.js';

export default function createHistoryPanelModule(context) {
  const {
    elements,
    downloadBlob,
    toast,
    copyToClipboard,
    formatDateTime,
    formats,
    config,
    logger,
    announce,
  } = context;

  const listeners = [];
  const historyActions = createHistoryActions({
    toast,
    copyToClipboard,
    downloadBlob,
    config,
    logger,
    announce,
  });

  function init() {
    if (elements.historyList) {
      listeners.push(on(elements.historyList, 'click', handleHistoryListAction));
    }
    if (elements.clearHistoryBtn) {
      listeners.push(on(elements.clearHistoryBtn, 'click', handleClearHistory));
    }
    if (elements.exportHistoryBtn) {
      listeners.push(on(elements.exportHistoryBtn, 'click', handleExportHistory));
    }
  }

  function destroy() {
    listeners.splice(0).forEach(off => off());
  }

  function handleHistoryListAction(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton || !elements.historyList.contains(actionButton)) {
      return;
    }

    const itemElement = actionButton.closest('[data-history-id]');
    if (!itemElement) return;

    const id = itemElement.dataset.historyId;
    const action = actionButton.dataset.action;

    if (action === 'copy') {
      historyActions.copyItem(id);
    } else if (action === 'delete') {
      historyActions.deleteItem(id);
    }
  }

  function handleClearHistory(event) {
    event.preventDefault();
    const confirmed = window.confirm('履歴を全て削除しますか？この操作は元に戻せません。');
    if (!confirmed) {
      return;
    }
    historyActions.clearAll();
  }

  function handleExportHistory(event) {
    event.preventDefault();
    historyActions.exportAll();
  }

  function renderHistoryList(items) {
    if (!elements.historyList || !elements.historyTemplate) return;

    elements.historyList.innerHTML = '';

    if (!Array.isArray(items) || items.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'history-item is-empty';
      empty.textContent = '履歴はまだありません。';
      elements.historyList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    items.slice(0, config.app.HISTORY_LIMIT).forEach(item => {
      const clone = elements.historyTemplate.content.cloneNode(true);
      const root = clone.querySelector('.history-item');
      root.dataset.historyId = item.id;
      const metadata = item.metadata || {};
      if (metadata.batchId) {
        root.dataset.batchId = metadata.batchId;
      }
      const formatEl = clone.querySelector('[data-field="format"]');
      const textEl = clone.querySelector('[data-field="text"]');
      const sourceEl = clone.querySelector('[data-field="source"]');
      const timestampEl = clone.querySelector('[data-field="timestamp"]');
      const copyBtn = clone.querySelector('[data-action="copy"]');
      const timestampValue = getHistoryTimestampValue(item);
      let isoTimestamp;
      try {
        isoTimestamp = new Date(timestampValue).toISOString();
      } catch (error) {
        isoTimestamp = new Date().toISOString();
        logger.debug('scanner:history:timestamp-invalid', { error, timestampValue });
      }
      root.dataset.capturedAt = isoTimestamp;
      const formattedTimestamp = formatDateTime(timestampValue);
      const formatDisplay = getHistoryFormatText(formats, item);
      if (formatEl) {
        formatEl.textContent = formatDisplay;
      }
      if (textEl) {
        textEl.textContent = getHistoryDisplayText(item);
      }
      if (sourceEl) {
        const sourceText = getHistorySourceText(formats, item);
        sourceEl.textContent = sourceText;
        sourceEl.title = sourceText;
      }
      if (timestampEl) {
        timestampEl.textContent = formattedTimestamp;
        timestampEl.dataset.raw = isoTimestamp;
      }
      if (copyBtn) {
        const copyValue = getHistoryCopyValue(item);
        const hasCopyValue = copyValue.trim().length > 0;
        copyBtn.disabled = !hasCopyValue;
        copyBtn.setAttribute('aria-disabled', hasCopyValue ? 'false' : 'true');
        copyBtn.title = hasCopyValue ? '内容をコピー' : 'コピーできる内容がありません';
      }
      fragment.appendChild(clone);
    });

    elements.historyList.appendChild(fragment);
  }

  return {
    init,
    destroy,
    renderHistoryList,
  };
}
