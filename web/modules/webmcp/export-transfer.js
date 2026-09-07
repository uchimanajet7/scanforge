/**
 * ScanForgeの生成結果と履歴JSONを、ブラウザーダウンロードと
 * WebMCP直接受信のどちらにも同一スナップショットから渡す。
 */

import { downloadBlob as defaultDownloadBlob, generateId } from '../core/utils.js';
import { createHistoryJsonArtifact } from '../data/history/download.js';
import { createCurrentPreviewArtifact } from '../generator/actions/download-current-preview.js';

const EXPORT_KINDS = Object.freeze(['generated-code', 'scan-history']);
const MAX_EXPORT_CHUNK_BYTES = 256 * 1024;
const preparedExports = new Map();

function createExportError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function throwIfAborted(signal) {
  signal?.throwIfAborted();
}

async function sha256(blob, signal) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw createExportError('crypto-unavailable', 'SHA-256を計算できません。');
  }
  const bytes = await blob.arrayBuffer();
  throwIfAborted(signal);
  const digest = await subtle.digest('SHA-256', bytes);
  throwIfAborted(signal);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function createPublicManifest(record, status = 'export-prepared') {
  const result = {
    ok: true,
    status,
    transferId: record.transferId,
    kind: record.kind,
    artifact: { ...record.artifactMetadata },
  };
  if (record.generationId) {
    result.generationId = record.generationId;
  }
  return result;
}

function findPreparedExport(transferId) {
  for (const record of preparedExports.values()) {
    if (record.transferId === transferId) {
      return record;
    }
  }
  throw createExportError(
    'transfer-unavailable',
    '指定されたtransferIdは無効、置換済み、または解放済みです。',
  );
}

async function describeArtifact(artifact, signal) {
  if (!(artifact?.blob instanceof Blob) || artifact.blob.size <= 0) {
    throw createExportError('artifact-unavailable', '受け渡せる成果物がありません。');
  }
  throwIfAborted(signal);
  const metadata = {
    fileName: artifact.fileName,
    format: artifact.format,
    mimeType: artifact.mimeType,
    byteLength: artifact.blob.size,
    sha256: await sha256(artifact.blob, signal),
  };
  for (const key of ['width', 'height', 'itemCount']) {
    if (Number.isSafeInteger(artifact[key])) {
      metadata[key] = artifact[key];
    }
  }
  return metadata;
}

export async function prepareScanForgeExport({ kind, generationId = null }, signal) {
  throwIfAborted(signal);
  if (!EXPORT_KINDS.includes(kind)) {
    throw createExportError('invalid-kind', '未対応の成果物種別です。');
  }

  let artifact;
  if (kind === 'generated-code') {
    artifact = createCurrentPreviewArtifact({ expectedGenerationId: generationId });
    if (!artifact) {
      throw createExportError('preview-unavailable', '生成結果がありません。');
    }
  } else {
    artifact = createHistoryJsonArtifact();
  }

  throwIfAborted(signal);
  const artifactMetadata = await describeArtifact(artifact, signal);
  throwIfAborted(signal);
  const record = {
    transferId: `transfer-${generateId()}`,
    kind,
    generationId: artifact.generationId || null,
    artifact,
    artifactMetadata,
  };
  preparedExports.set(kind, record);
  return createPublicManifest(record);
}

export async function readScanForgeExport({ transferId, offset, maxBytes }, signal) {
  throwIfAborted(signal);
  const record = findPreparedExport(transferId);
  const { blob } = record.artifact;
  if (offset < 0 || offset >= blob.size || maxBytes < 1 || maxBytes > MAX_EXPORT_CHUNK_BYTES) {
    throw createExportError('invalid-range', '要求されたバイト範囲が不正です。');
  }

  const nextOffset = Math.min(offset + maxBytes, blob.size);
  const bytes = new Uint8Array(await blob.slice(offset, nextOffset).arrayBuffer());
  throwIfAborted(signal);
  findPreparedExport(transferId);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 32768) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
  }

  const result = {
    ok: true,
    status: 'export-chunk',
    transferId,
    kind: record.kind,
    offset,
    nextOffset,
    eof: nextOffset === blob.size,
    base64: btoa(binary),
  };
  if (record.generationId) {
    result.generationId = record.generationId;
  }
  return result;
}

export function createBrowserDownloadResult(prepared, {
  requestDispatched,
  manualControlLabel,
}) {
  const result = {
    status: requestDispatched ? 'download-requested' : 'download-request-failed',
    requestDispatched,
    automatic: true,
    browserAcceptance: 'not-observable',
    saveCompletion: 'not-observable',
    transferId: prepared.transferId,
    kind: prepared.kind,
    artifact: { ...prepared.artifact },
    fallback: {
      webMcpDirectTransfer: {
        available: true,
        sameArtifact: true,
        readTool: 'read-scanforge-export',
        releaseTool: 'release-scanforge-export',
      },
      manualControl: {
        lastResort: true,
        label: manualControlLabel,
      },
    },
  };
  if (prepared.generationId) {
    result.generationId = prepared.generationId;
  }
  return result;
}

export function releaseScanForgeExport(transferId) {
  for (const [kind, record] of preparedExports.entries()) {
    if (record.transferId === transferId) {
      preparedExports.delete(kind);
      return true;
    }
  }
  return false;
}

export function requestPreparedScanForgeExportDownload(
  transferId,
  { downloadBlob = defaultDownloadBlob, signal } = {},
) {
  throwIfAborted(signal);
  const record = findPreparedExport(transferId);
  downloadBlob(record.artifact.blob, record.artifact.fileName);
  throwIfAborted(signal);
  return createPublicManifest(record, 'download-requested');
}

export { EXPORT_KINDS, MAX_EXPORT_CHUNK_BYTES };
