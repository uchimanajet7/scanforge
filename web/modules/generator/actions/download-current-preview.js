/**
 * 現在の生成プレビューを既存のブラウザーダウンロード経路へ渡す。
 */

import { downloadBlob as defaultDownloadBlob } from '../../core/utils.js';
import { getStoredPreview } from '../preview/state.js';
import { buildDownloadName } from '../render/naming.js';

function createGenerationMismatchError() {
  const error = new Error('現在の生成結果が指定されたgenerationIdと一致しません。');
  error.code = 'generation-mismatch';
  return error;
}

export function createCurrentPreviewArtifact(options = {}) {
  const { expectedGenerationId = null } = options;
  const preview = getStoredPreview();
  if (!preview || typeof preview.generationId !== 'string' || !preview.generationId) {
    return null;
  }

  if (expectedGenerationId && preview.generationId !== expectedGenerationId) {
    throw createGenerationMismatchError();
  }

  let blob = null;
  if (preview.output === 'svg' && typeof preview.svgText === 'string' && preview.svgText) {
    blob = new Blob([preview.svgText], { type: 'image/svg+xml' });
  } else if (preview.output === 'png' && preview.pngBlob) {
    blob = preview.pngBlob;
  }

  if (!blob) {
    return null;
  }

  const fileName = buildDownloadName(preview);
  return {
    blob,
    fileName,
    format: preview.output === 'svg' ? 'svg' : 'png',
    mimeType: preview.output === 'svg' ? 'image/svg+xml' : 'image/png',
    byteLength: blob.size,
    width: preview.width,
    height: preview.height,
    generationId: preview.generationId,
  };
}

export function requestCurrentPreviewDownload(options = {}) {
  const {
    downloadBlob = defaultDownloadBlob,
    expectedGenerationId = null,
  } = options;
  const artifact = createCurrentPreviewArtifact({ expectedGenerationId });
  if (!artifact) {
    return null;
  }

  downloadBlob(artifact.blob, artifact.fileName);
  const { blob, ...metadata } = artifact;
  return metadata;
}
