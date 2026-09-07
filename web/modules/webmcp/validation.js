/**
 * WebMCP 入出力の境界で使用する純粋な検証・正規化関数。
 */

const MAX_OUTPUT_TEXT_LENGTH = 4296;
const GENERATE_INPUT_KEYS = Object.freeze([
  'text',
  'format',
  'output',
  'size',
  'includeText',
  'transparent',
]);
const GENERATE_FORMATS = Object.freeze([
  'qrcode',
  'code128',
  'ean13',
  'upca',
  'pdf417',
  'datamatrix',
]);
const GENERATE_OUTPUTS = Object.freeze(['svg', 'png']);
const HISTORY_INPUT_KEYS = Object.freeze(['limit']);
const HISTORY_DEFAULT_LIMIT = 10;
const HISTORY_MIN_LIMIT = 1;
const HISTORY_MAX_LIMIT = 100;
const KNOWN_SOURCES = Object.freeze(['live', 'manual', 'image']);
const GENERATED_DOWNLOAD_INPUT_KEYS = Object.freeze(['generationId']);
const EXPORT_KINDS = Object.freeze(['generated-code', 'scan-history']);
const PREPARE_EXPORT_INPUT_KEYS = Object.freeze(['kind', 'generationId']);
const READ_EXPORT_INPUT_KEYS = Object.freeze(['transferId', 'offset', 'maxBytes']);
const RELEASE_EXPORT_INPUT_KEYS = Object.freeze(['transferId']);
const MAX_EXPORT_CHUNK_BYTES = 256 * 1024;
const MAX_EXPORT_ID_LENGTH = 128;

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value).every(key => allowedKeys.includes(key));
}

function validateGenerateCodeInput(input) {
  if (!isPlainObject(input) || !hasOnlyKeys(input, GENERATE_INPUT_KEYS)) {
    return false;
  }
  if (!hasOwn(input, 'text') || typeof input.text !== 'string') {
    return false;
  }

  const rawTextLength = Array.from(input.text).length;
  if (rawTextLength < 1 || rawTextLength > MAX_OUTPUT_TEXT_LENGTH || !input.text.trim()) {
    return false;
  }

  if (
    hasOwn(input, 'format')
    && (typeof input.format !== 'string' || !GENERATE_FORMATS.includes(input.format))
  ) {
    return false;
  }
  if (
    hasOwn(input, 'output')
    && (typeof input.output !== 'string' || !GENERATE_OUTPUTS.includes(input.output))
  ) {
    return false;
  }
  if (
    hasOwn(input, 'size')
    && (!Number.isInteger(input.size) || input.size < 120 || input.size > 960)
  ) {
    return false;
  }
  if (hasOwn(input, 'includeText') && typeof input.includeText !== 'boolean') {
    return false;
  }
  if (hasOwn(input, 'transparent') && typeof input.transparent !== 'boolean') {
    return false;
  }

  return true;
}

function validateEmptyInput(input) {
  return isPlainObject(input) && Object.keys(input).length === 0;
}

function validateGeneratedDownloadInput(input) {
  if (!isPlainObject(input) || !hasOnlyKeys(input, GENERATED_DOWNLOAD_INPUT_KEYS)) {
    return { valid: false, generationId: null };
  }

  if (!hasOwn(input, 'generationId')) {
    return { valid: true, generationId: null };
  }

  const valid = typeof input.generationId === 'string'
    && input.generationId.length >= 1
    && input.generationId.length <= MAX_EXPORT_ID_LENGTH;
  return valid
    ? { valid: true, generationId: input.generationId }
    : { valid: false, generationId: null };
}

function validateHistoryInput(input) {
  if (!isPlainObject(input) || !hasOnlyKeys(input, HISTORY_INPUT_KEYS)) {
    return { valid: false, limit: null };
  }

  const limit = hasOwn(input, 'limit') ? input.limit : HISTORY_DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < HISTORY_MIN_LIMIT || limit > HISTORY_MAX_LIMIT) {
    return { valid: false, limit: null };
  }

  return { valid: true, limit };
}

function validatePrepareExportInput(input) {
  if (
    !isPlainObject(input)
    || !hasOnlyKeys(input, PREPARE_EXPORT_INPUT_KEYS)
    || !hasOwn(input, 'kind')
    || typeof input.kind !== 'string'
    || !EXPORT_KINDS.includes(input.kind)
  ) {
    return { valid: false, kind: null, generationId: null };
  }

  const hasGenerationId = hasOwn(input, 'generationId');
  if (input.kind === 'scan-history' && hasGenerationId) {
    return { valid: false, kind: null, generationId: null };
  }
  if (
    hasGenerationId
    && (
      typeof input.generationId !== 'string'
      || input.generationId.length < 1
      || input.generationId.length > MAX_EXPORT_ID_LENGTH
    )
  ) {
    return { valid: false, kind: null, generationId: null };
  }

  return {
    valid: true,
    kind: input.kind,
    generationId: hasGenerationId ? input.generationId : null,
  };
}

function validateReadExportInput(input) {
  const valid = isPlainObject(input)
    && hasOnlyKeys(input, READ_EXPORT_INPUT_KEYS)
    && hasOwn(input, 'transferId')
    && typeof input.transferId === 'string'
    && input.transferId.length >= 1
    && input.transferId.length <= MAX_EXPORT_ID_LENGTH
    && hasOwn(input, 'offset')
    && Number.isSafeInteger(input.offset)
    && input.offset >= 0
    && hasOwn(input, 'maxBytes')
    && Number.isSafeInteger(input.maxBytes)
    && input.maxBytes >= 1
    && input.maxBytes <= MAX_EXPORT_CHUNK_BYTES;

  return valid ? {
    valid: true,
    transferId: input.transferId,
    offset: input.offset,
    maxBytes: input.maxBytes,
  } : {
    valid: false,
    transferId: null,
    offset: null,
    maxBytes: null,
  };
}

function validateReleaseExportInput(input) {
  const valid = isPlainObject(input)
    && hasOnlyKeys(input, RELEASE_EXPORT_INPUT_KEYS)
    && hasOwn(input, 'transferId')
    && typeof input.transferId === 'string'
    && input.transferId.length >= 1
    && input.transferId.length <= MAX_EXPORT_ID_LENGTH;
  return valid ? { valid: true, transferId: input.transferId } : {
    valid: false,
    transferId: null,
  };
}

function truncateText(value) {
  const text = typeof value === 'string' ? value : '';
  const codePoints = Array.from(text);
  const textTruncated = codePoints.length > MAX_OUTPUT_TEXT_LENGTH;
  return {
    text: textTruncated ? codePoints.slice(0, MAX_OUTPUT_TEXT_LENGTH).join('') : text,
    textTruncated,
  };
}

function normalizeSource(value) {
  if (typeof value !== 'string') {
    return 'unknown';
  }
  const normalized = value.toLowerCase();
  return KNOWN_SOURCES.includes(normalized) ? normalized : 'unknown';
}

function normalizeTimestamp(metadataTimestamp, itemTimestamp) {
  for (const value of [metadataTimestamp, itemTimestamp]) {
    if (!isTimestampValue(value)) {
      continue;
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return null;
}

function isTimestampValue(value) {
  if (value instanceof Date) {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return typeof value === 'string' && value.trim().length > 0;
}

export {
  isPlainObject,
  normalizeSource,
  normalizeTimestamp,
  truncateText,
  validateEmptyInput,
  validateGeneratedDownloadInput,
  validateGenerateCodeInput,
  validateHistoryInput,
  validatePrepareExportInput,
  validateReadExportInput,
  validateReleaseExportInput,
};
