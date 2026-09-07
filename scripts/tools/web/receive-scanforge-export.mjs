import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, open, readFile, realpath, rmdir, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';

const CHUNK_BYTES = 256 * 1024;
const PROJECT_AGENT_TMP = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../_local/_ai-agent/tmp',
);
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const KIND_FORMATS = Object.freeze({
  'generated-code': Object.freeze({
    png: 'image/png',
    svg: 'image/svg+xml',
  }),
  'scan-history': Object.freeze({
    json: 'application/json',
  }),
});

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function isWithinProjectAgentTmp(path) {
  const child = relative(PROJECT_AGENT_TMP, resolve(path));
  return child === '' || (!child.startsWith(`..${sep}`) && child !== '..' && !isAbsolute(child));
}

function unwrapToolResult(value) {
  return value?.result && typeof value.result === 'object' ? value.result : value;
}

function validateSafeFileName(fileName, format) {
  return typeof fileName === 'string'
    && fileName.length > 0
    && !/[\\/:\x00-\x1f\x7f<>"|?*]/.test(fileName)
    && fileName.toLowerCase().endsWith(`.${format}`);
}

function validateManifest(rawResult, { kind, generationId }) {
  const result = unwrapToolResult(rawResult);
  requireValue(
    ['export-prepared', 'download-requested', 'download-request-failed'].includes(result?.status),
    'ScanForgeの成果物準備結果ではありません',
  );
  requireValue(typeof result.transferId === 'string' && result.transferId.length > 0, 'transferIdがありません');
  requireValue(result.kind === kind && Object.prototype.hasOwnProperty.call(KIND_FORMATS, kind), '成果物種別が一致しません');

  if (kind === 'generated-code') {
    requireValue(typeof result.generationId === 'string' && result.generationId.length > 0, 'generationIdがありません');
    if (generationId) {
      requireValue(result.generationId === generationId, '生成結果のgenerationIdが要求と一致しません');
    }
  } else {
    requireValue(result.generationId === undefined, '履歴JSONにgenerationIdが含まれています');
  }

  const artifact = result.artifact;
  const expectedMimeType = KIND_FORMATS[kind]?.[artifact?.format];
  requireValue(typeof expectedMimeType === 'string' && artifact.mimeType === expectedMimeType, '成果物の形式またはMIME型が不正です');
  requireValue(validateSafeFileName(artifact.fileName, artifact.format), '成果物のファイル名が不正です');
  requireValue(Number.isSafeInteger(artifact.byteLength) && artifact.byteLength > 0, '成果物のバイト数が不正です');
  requireValue(typeof artifact.sha256 === 'string' && /^[a-f0-9]{64}$/.test(artifact.sha256), '成果物のSHA-256が不正です');

  if (kind === 'generated-code') {
    requireValue(
      Number.isSafeInteger(artifact.width) && artifact.width > 0
      && Number.isSafeInteger(artifact.height) && artifact.height > 0,
      '生成結果の寸法が不正です',
    );
  } else {
    requireValue(Number.isSafeInteger(artifact.itemCount) && artifact.itemCount >= 0, '履歴件数が不正です');
  }
  return result;
}

function validateChunk(rawChunk, manifest, offset) {
  const chunk = unwrapToolResult(rawChunk);
  const artifact = manifest.artifact;
  requireValue(chunk?.ok === true && chunk.status === 'export-chunk', '成果物チャンクの結果ではありません');
  requireValue(chunk.transferId === manifest.transferId && chunk.kind === manifest.kind, '成果物チャンクの識別子が一致しません');
  if (manifest.generationId) {
    requireValue(chunk.generationId === manifest.generationId, '成果物チャンクのgenerationIdが一致しません');
  }
  requireValue(
    chunk.offset === offset
    && Number.isSafeInteger(chunk.nextOffset)
    && chunk.nextOffset > offset
    && chunk.nextOffset <= Math.min(offset + CHUNK_BYTES, artifact.byteLength),
    '成果物チャンクのバイト範囲が不正です',
  );
  requireValue(chunk.eof === (chunk.nextOffset === artifact.byteLength), '成果物チャンクの終端が不正です');
  requireValue(typeof chunk.base64 === 'string' && chunk.base64.length <= Math.ceil(CHUNK_BYTES / 3) * 4, 'base64データが不正です');
  const bytes = Buffer.from(chunk.base64, 'base64');
  requireValue(
    bytes.toString('base64') === chunk.base64 && bytes.length === chunk.nextOffset - offset,
    '成果物チャンクの切り詰めまたはbase64破損を検出しました',
  );
  return bytes;
}

function validatePng(bytes, artifact) {
  requireValue(
    bytes.length >= 45
    && bytes.subarray(0, 8).equals(PNG_SIGNATURE)
    && bytes.readUInt32BE(8) === 13
    && bytes.toString('ascii', 12, 16) === 'IHDR'
    && bytes.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex')),
    'PNGのヘッダーまたは終端が不正です',
  );
  requireValue(bytes.readUInt32BE(16) === artifact.width && bytes.readUInt32BE(20) === artifact.height, 'PNGの寸法が一致しません');

  let offset = 8;
  let hasImageData = false;
  while (offset < bytes.length) {
    requireValue(offset + 12 <= bytes.length, 'PNGチャンクが切り詰められています');
    const length = bytes.readUInt32BE(offset);
    const end = offset + length + 12;
    requireValue(end <= bytes.length, 'PNGチャンクの長さが不正です');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    requireValue(crc32(bytes.subarray(offset + 4, end - 4)) === bytes.readUInt32BE(end - 4), 'PNGチャンクのCRCが一致しません');
    if (type === 'IDAT') hasImageData = true;
    if (type === 'IEND') requireValue(end === bytes.length, 'PNG終端の後に余分なデータがあります');
    offset = end;
  }
  requireValue(hasImageData, 'PNGの画像データがありません');
}

function parseSvgDimension(attributes, name) {
  const match = attributes.match(new RegExp(`\\s${name}\\s*=\\s*["']([0-9]+(?:\\.[0-9]+)?)(?:px)?["']`, 'i'));
  return match ? Number(match[1]) : null;
}

function validateSvg(bytes, artifact) {
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '').trim();
  const root = source.match(/^(?:<\?xml[^>]*>\s*)?<svg\b([^>]*)>/i);
  requireValue(root && /<\/svg>\s*$/i.test(source), 'SVGのルート要素または終端が不正です');
  requireValue(parseSvgDimension(root[1], 'width') === artifact.width, 'SVGの幅が一致しません');
  requireValue(parseSvgDimension(root[1], 'height') === artifact.height, 'SVGの高さが一致しません');
  requireValue(!/<\s*(?:script|foreignObject)\b/i.test(source), 'SVGに許可しない要素があります');
  requireValue(!/\son[a-z]+\s*=/i.test(source), 'SVGにイベント属性があります');
  const references = [...source.matchAll(/\s(?:href|xlink:href)\s*=\s*["']([^"']*)["']/gi)];
  requireValue(
    references.every(([, value]) => !value || value.startsWith('#') || value.startsWith('data:image/')),
    'SVGに外部参照があります',
  );
}

function validateHistoryJson(bytes, artifact) {
  const document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  requireValue(document !== null && typeof document === 'object' && !Array.isArray(document), '履歴JSONのルートが不正です');
  requireValue(document.version === '1.0', '履歴JSONのversionが不正です');
  requireValue(typeof document.exported === 'string' && !Number.isNaN(new Date(document.exported).getTime()), '履歴JSONのexportedが不正です');
  requireValue(Array.isArray(document.items) && document.items.length === artifact.itemCount, '履歴JSONのitems件数が一致しません');
}

function validateFile(bytes, artifact) {
  requireValue(bytes.length === artifact.byteLength, '保存後のバイト数が一致しません');
  requireValue(createHash('sha256').update(bytes).digest('hex') === artifact.sha256, '保存後のSHA-256が一致しません');
  if (artifact.format === 'png') validatePng(bytes, artifact);
  else if (artifact.format === 'svg') validateSvg(bytes, artifact);
  else validateHistoryJson(bytes, artifact);
}

function createExportMarkdown(file) {
  const destination = `<${encodeURI(file.path).replace(/[!&'()*?#]/g,
    character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}>`;
  if (file.format === 'png') {
    return `![ScanForge生成PNG](${destination})\n\n[PNG](${destination})`;
  }
  const label = file.format === 'svg' ? 'SVG' : '履歴JSON';
  return `[${label}](${destination})`;
}

/**
 * 公開Site toolsの成果物をモデルへ転記せず、同じ実行環境で保存・検証する。
 * preparedExportを渡す場合は、失敗したブラウザーダウンロードと同じtransferIdを読む。
 */
export async function receiveScanForgeExport({
  callTool,
  kind,
  generationId = null,
  preparedExport = null,
  outputDirectory,
}) {
  requireValue(typeof callTool === 'function', '公開Site toolsを呼び出す関数が必要です');
  requireValue(Object.prototype.hasOwnProperty.call(KIND_FORMATS, kind), 'kindが不正です');
  requireValue(
    generationId === null || (kind === 'generated-code' && typeof generationId === 'string' && generationId.length > 0),
    'generationIdが不正です',
  );
  requireValue(
    typeof outputDirectory === 'string'
    && isAbsolute(outputDirectory)
    && isWithinProjectAgentTmp(outputDirectory),
    'ScanForgeの_local/_ai-agent/tmp以下にある出力先の絶対パスが必要です',
  );

  let manifest;
  let directory;
  let result;
  let failure;
  const createdFiles = [];
  try {
    const prepared = preparedExport || await callTool('prepare-scanforge-export', {
      kind,
      ...(generationId ? { generationId } : {}),
    });
    manifest = unwrapToolResult(prepared);
    manifest = validateManifest(manifest, { kind, generationId });
    await mkdir(outputDirectory, { recursive: true });
    const realOutputDirectory = await realpath(outputDirectory);
    requireValue(isWithinProjectAgentTmp(realOutputDirectory), '出力先がScanForgeの許可領域外を参照しています');
    directory = await mkdtemp(join(realOutputDirectory, 'scanforge-export-'));
    const artifact = manifest.artifact;
    const path = join(directory, artifact.fileName);
    const file = await open(path, 'wx', 0o600);
    createdFiles.push(path);
    try {
      let offset = 0;
      while (offset < artifact.byteLength) {
        const chunk = await callTool('read-scanforge-export', {
          transferId: manifest.transferId,
          offset,
          maxBytes: CHUNK_BYTES,
        });
        const bytes = validateChunk(chunk, manifest, offset);
        await file.writeFile(bytes);
        offset = unwrapToolResult(chunk).nextOffset;
      }
    } finally {
      await file.close();
    }

    validateFile(await readFile(path), artifact);
    const saved = { ...artifact, path };
    result = {
      outcome: 'file-verified',
      transferId: manifest.transferId,
      kind: manifest.kind,
      ...(manifest.generationId ? { generationId: manifest.generationId } : {}),
      directory,
      file: saved,
      markdown: createExportMarkdown(saved),
    };
  } catch (error) {
    failure = error;
    const cleanupErrors = [];
    for (const path of createdFiles) {
      try { await unlink(path); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
    }
    if (directory) {
      try { await rmdir(directory); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
    }
    if (cleanupErrors.length) {
      failure = new AggregateError([error, ...cleanupErrors], '成果物の取得に失敗し、不完全ファイルの削除も完了していません');
    }
  } finally {
    if (typeof manifest?.transferId === 'string' && manifest.transferId) {
      try {
        const release = unwrapToolResult(await callTool('release-scanforge-export', {
          transferId: manifest.transferId,
        }));
        requireValue(
          release?.ok === true
          && release.transferId === manifest.transferId
          && typeof release.released === 'boolean',
          '成果物の解放結果が不正です',
        );
      } catch (releaseError) {
        if (failure) failure = new AggregateError([failure, releaseError], '成果物の取得とページ内データの解放に失敗しました');
        else result.releaseWarning = String(releaseError);
      }
    }
  }

  if (failure) throw failure;
  return result;
}
