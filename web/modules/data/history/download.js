/**
 * 履歴 JSON を既存のブラウザーダウンロード経路へ渡す。
 */

import { downloadBlob as defaultDownloadBlob } from '../../core/utils.js';
import { exportHistoryAsJson } from './exporters.js';
import { getHistoryCount } from './queries.js';

export function requestHistoryJsonDownload(options = {}) {
  const {
    allowEmpty = true,
    downloadBlob = defaultDownloadBlob,
  } = options;
  const artifact = createHistoryJsonArtifact();

  if (!allowEmpty && artifact.itemCount === 0) {
    return null;
  }

  downloadBlob(artifact.blob, artifact.fileName);
  const { blob, ...metadata } = artifact;
  return metadata;
}

export function createHistoryJsonArtifact() {
  const itemCount = getHistoryCount();
  const json = exportHistoryAsJson();
  const blob = new Blob([json], { type: 'application/json' });
  const fileName = `scanforge-history-${Date.now()}.json`;
  return {
    blob,
    fileName,
    format: 'json',
    mimeType: 'application/json',
    byteLength: blob.size,
    itemCount,
  };
}
