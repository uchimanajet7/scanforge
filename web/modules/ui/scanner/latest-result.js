/**
 * 最新検出結果表示
 */

function parseTimestamp(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

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

import { on } from '../core/dom/events.js';

export default function createLatestResultModule(context) {
  const {
    elements,
    state,
    toast,
    formats,
    formatDateTime,
    copyToClipboard,
    config,
    announce,
    logger,
  } = context;

  const listeners = [];
  let copyHighlightTimerId = null;
  let lastDetectionSignature = null;

  function init() {
    if (elements.copyLatestBtn) {
      listeners.push(on(elements.copyLatestBtn, 'click', handleCopyLatest));
      elements.copyLatestBtn.disabled = true;
    }
  }

  function destroy() {
    listeners.splice(0).forEach(off => off());
    clearCopyHighlight();
  }

  function clearCopyHighlight() {
    if (copyHighlightTimerId) {
      clearTimeout(copyHighlightTimerId);
      copyHighlightTimerId = null;
    }
    if (elements.copyLatestBtn) {
      elements.copyLatestBtn.classList.remove('is-highlighted');
    }
  }

  function triggerCopyHighlight() {
    if (!elements.copyLatestBtn) return;
    clearCopyHighlight();
    elements.copyLatestBtn.classList.add('is-highlighted');
    copyHighlightTimerId = setTimeout(() => {
      if (elements.copyLatestBtn) {
        elements.copyLatestBtn.classList.remove('is-highlighted');
      }
      copyHighlightTimerId = null;
    }, config.app.LATEST_RESULT_HIGHLIGHT_MS);
  }

  async function handleCopyLatest(event) {
    event.preventDefault();
    const latest = state.getState('scanner.lastDetection');
    if (!latest || !latest.text) {
      return;
    }
    try {
      const success = await copyToClipboard(latest.text);
      if (success) {
        logger.debug('scanner:latest:copy-success');
        clearCopyHighlight();
        toast.info('内容をコピーしました。');
        announce(config.announceCopySuccess);
      } else {
        toast.error('内容をコピーできませんでした。ブラウザの設定を確認してください。');
      }
    } catch (error) {
      logger.error('scanner:latest:copy-failed', error);
      toast.error('内容をコピーできませんでした。もう一度お試しください。');
    }
  }

  function renderDetection(detection) {
    if (!elements.latestFormat || !elements.latestText || !elements.latestSource || !elements.latestTime) {
      return;
    }

    if (!detection) {
      elements.latestFormat.textContent = '-';
      elements.latestText.textContent = '-';
      elements.latestSource.textContent = '-';
      elements.latestTime.textContent = '-';
      clearCopyHighlight();
      lastDetectionSignature = null;
      if (elements.copyLatestBtn) {
        elements.copyLatestBtn.disabled = true;
      }
      return;
    }

    const timestampValue = parseTimestamp(detection.timestamp) ?? Date.now();
    const formatDisplay = formats.getDisplayName(detection.format || 'unknown');
    elements.latestFormat.textContent = formatDisplay;
    elements.latestText.textContent = detection.text || '';
    elements.latestTime.textContent = formatDateTime(timestampValue);
    const sourceLabel = formatDetectionSourceLabel({
      source: detection.source,
      metadata: detection.metadata || {},
    });
    elements.latestSource.textContent = sourceLabel;

    const detectionSignature = [
      detection.timestamp ?? timestampValue,
      detection.text ?? '',
      detection.format ?? '',
    ].join(':');
    const isNewDetection = detectionSignature !== lastDetectionSignature;
    lastDetectionSignature = detectionSignature;

    if (elements.copyLatestBtn) {
      elements.copyLatestBtn.disabled = false;
      if (isNewDetection) {
        triggerCopyHighlight();
      }
    }

    if (isNewDetection) {
      announce(config.announceDetection);
    }
  }

  return {
    init,
    destroy,
    renderDetection,
  };
}
