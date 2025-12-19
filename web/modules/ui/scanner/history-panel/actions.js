import { getHistoryById } from '../../../data/history/queries.js';
import { removeHistoryEntry, clearHistoryEntries } from '../../../data/history/commands.js';
import { exportHistoryAsJson } from '../../../data/history/exporters.js';
import { formatExportSuccessMessage, getHistoryCopyValue } from './formatters.js';

const COPY_SUCCESS_MESSAGE = '内容をコピーしました。';
const COPY_FAILURE_MESSAGE = '内容をコピーできませんでした。ブラウザの設定を確認してください。';
const COPY_ERROR_MESSAGE = '内容をコピーできませんでした。もう一度お試しください。';
const DELETE_SUCCESS_MESSAGE = '履歴を削除しました。';
const DELETE_FAILURE_MESSAGE = '履歴を削除できませんでした。';
const CLEAR_SUCCESS_MESSAGE = '履歴をすべて削除しました。';
const EXPORT_FAILURE_MESSAGE = '履歴を書き出せませんでした。もう一度お試しください。';

export function createHistoryActions({
  toast,
  copyToClipboard,
  downloadBlob,
  config,
  logger,
  announce,
}) {
  function announceMessage(message) {
    if (typeof announce === 'function' && message) {
      announce(message);
    }
  }

  function copyItem(id) {
    const historyItem = getHistoryById(id);
    const rawText = getHistoryCopyValue(historyItem);

    if (!rawText || rawText.trim().length === 0) {
      logger?.warn?.('scanner:history:copy-empty', { id });
      return;
    }

    copyToClipboard(rawText)
      .then((success) => {
        if (success) {
          logger?.debug?.('scanner:history:copy-success', { id });
          toast?.info?.(COPY_SUCCESS_MESSAGE);
          announceMessage(config?.announceCopySuccess || COPY_SUCCESS_MESSAGE);
        } else {
          logger?.warn?.('scanner:history:copy-failed', { id });
          toast?.error?.(COPY_FAILURE_MESSAGE);
        }
      })
      .catch(error => {
        logger?.error?.('scanner:history:copy-error', error);
        toast?.error?.(COPY_ERROR_MESSAGE);
      });
  }

  function deleteItem(id) {
    const removed = removeHistoryEntry(id);
    if (removed) {
      toast?.success?.(DELETE_SUCCESS_MESSAGE);
      announceMessage(DELETE_SUCCESS_MESSAGE);
    } else {
      toast?.error?.(DELETE_FAILURE_MESSAGE);
    }
  }

  function clearAll() {
    clearHistoryEntries();
    toast?.success?.(CLEAR_SUCCESS_MESSAGE);
    announceMessage(CLEAR_SUCCESS_MESSAGE);
  }

  function exportAll() {
    try {
      const json = exportHistoryAsJson();
      const blob = new Blob([json], { type: 'application/json' });
      const fileName = `scanforge-history-${Date.now()}.json`;
      downloadBlob(blob, fileName);
      const message = formatExportSuccessMessage(fileName);
      toast?.success?.(message);
      announceMessage(message);
    } catch (error) {
      logger?.error?.('scanner:history:export-error', error);
      toast?.error?.(EXPORT_FAILURE_MESSAGE);
    }
  }

  return {
    copyItem,
    deleteItem,
    clearAll,
    exportAll,
  };
}
