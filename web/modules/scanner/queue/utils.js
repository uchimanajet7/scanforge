/**
 * 画像キューモジュールで再利用するヘルパー関数群。
 */

import { logger } from '../../core/logger.js';
import * as imageScanner from '../image/pipeline.js';

const FINGERPRINT_CHUNK_BYTES = 64 * 1024;

function normalizeFileInput(input) {
  if (input instanceof File) {
    return [input];
  }
  if (input instanceof FileList) {
    return Array.from(input).filter(item => item instanceof File);
  }
  if (Array.isArray(input)) {
    return input.filter(item => item instanceof File);
  }
  return [];
}

function buildFingerprintMetadata(file) {
  const name = file?.name || '';
  const size = Number(file?.size) || 0;
  const type = (file?.type || '').toLowerCase();
  const lastModified = Number(file?.lastModified) || 0;
  const relativePath = typeof file?.webkitRelativePath === 'string' ? file.webkitRelativePath : '';
  return `${name}:${size}:${type}:${lastModified}:${relativePath}`;
}

function arrayBufferToHex(buffer, length = 32) {
  const bytes = new Uint8Array(buffer);
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, Math.max(0, length));
}

async function computeChunkDigest(file) {
  if (!file || typeof file.slice !== 'function') {
    return '';
  }
  const chunkSize = Math.min(Number(file.size) || 0, FINGERPRINT_CHUNK_BYTES);
  if (chunkSize === 0) {
    return '';
  }
  const chunk = file.slice(0, chunkSize);
  const buffer = await chunk.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToHex(hashBuffer, 32);
}

async function getFileFingerprint(file) {
  const metadata = buildFingerprintMetadata(file);

  if (typeof crypto === 'undefined' || !crypto?.subtle) {
    return metadata;
  }

  try {
    const digest = await computeChunkDigest(file);
    return digest ? `${metadata}:${digest}` : metadata;
  } catch (error) {
    logger.warn('imageQueue:fingerprint:hashFailed', {
      name: file?.name,
      size: file?.size,
      error,
    });
    return metadata;
  }
}

function createImageJobContext(params) {
  return {
    id: params.id,
    file: params.file,
    objectUrl: params.objectUrl,
    fingerprint: params.fingerprint,
    batchId: params.batchId || null,
    batchCreatedAt: Number(params.batchCreatedAt) || Date.now(),
    attempts: 0,
    autoRetryCount: 0,
    controller: null,
    retryTimeout: null,
    retryAt: null,
    canceled: false,
    startedAt: 0,
  };
}

function toFriendlyImageError(error) {
  if (error instanceof imageScanner.ImageScanError) {
    return error.message;
  }
  return '画像の解析中に問題が発生しました。時間を置いて再度お試しください。';
}

function isRetryableImageError(error) {
  if (!(error instanceof imageScanner.ImageScanError)) {
    return false;
  }
  const retryableCodes = new Set(['network', 'timeout', 'temporary']);
  return retryableCodes.has(error.code);
}

export {
  createImageJobContext,
  getFileFingerprint,
  isRetryableImageError,
  normalizeFileInput,
  toFriendlyImageError,
};
