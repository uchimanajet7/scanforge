import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

import { WEBMCP_TOOL_DEFINITIONS } from '../web/modules/webmcp/schemas.js';
import {
  validatePrepareExportInput,
  validateGeneratedDownloadInput,
  validateReadExportInput,
  validateReleaseExportInput,
} from '../web/modules/webmcp/validation.js';
import { receiveScanForgeExport } from '../scripts/tools/web/receive-scanforge-export.mjs';

globalThis.localStorage = {
  getItem: () => 'error',
  setItem: () => {},
};
globalThis.window = { location: { href: 'http://localhost/' } };

const { initializeAppState } = await import('../web/modules/core/state/base.js');
const { getState: getGeneratorState } = await import('../web/modules/generator/context.js');
const {
  prepareScanForgeExport,
  readScanForgeExport,
  releaseScanForgeExport,
  requestPreparedScanForgeExportDownload,
} = await import('../web/modules/webmcp/export-transfer.js');
const { executeRequestGeneratedCodeDownload } = await import('../web/modules/webmcp/tools/request-generated-code-download.js');
const { executeRequestScanHistoryDownload } = await import('../web/modules/webmcp/tools/request-scan-history-download.js');
const { executePrepareScanForgeExport } = await import('../web/modules/webmcp/tools/prepare-scanforge-export.js');
const { executeReadScanForgeExport } = await import('../web/modules/webmcp/tools/read-scanforge-export.js');
const { executeReleaseScanForgeExport } = await import('../web/modules/webmcp/tools/release-scanforge-export.js');
const { initWebMcp, disposeWebMcp } = await import('../web/modules/webmcp/registry.js');

const testTmpRoot = resolve(process.cwd(), '_local/_ai-agent/tmp/tests');
assert.ok(isAbsolute(testTmpRoot));

function pngChunk(type, data) {
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
  return chunk;
}

const png = Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'),
  pngChunk('IHDR', Buffer.from('00000001000000010806000000', 'hex')),
  pngChunk('IDAT', deflateSync(Buffer.from([0, 255, 0, 0, 255]))),
  pngChunk('IEND', Buffer.alloc(0)),
]);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>');
const historyDocument = {
  version: '1.0',
  exported: '2026-09-06T00:00:00.000Z',
  items: [{ id: 'one', format: 'qr_code', text: 'SCANFORGE', timestamp: '2026-09-06T00:00:00.000Z', metadata: {} }],
};
const historyJson = Buffer.from(JSON.stringify(historyDocument, null, 2));

async function outputRoot(t) {
  await mkdir(testTmpRoot, { recursive: true });
  const directory = await mkdtemp(join(testTmpRoot, 'webmcp-export-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function seedGenerated(format, bytes, generationId = 'generation-test') {
  const state = getGeneratorState();
  state.preview = {
    generationId,
    format: 'qr_code',
    output: format,
    logoPriority: false,
    width: 1,
    height: 1,
    svgText: format === 'svg' ? bytes.toString('utf8') : null,
    pngBlob: format === 'png' ? new Blob([bytes], { type: 'image/png' }) : null,
  };
}

function installDownloadDocument({ failClick = false } = {}) {
  globalThis.document = {
    body: {
      appendChild() {},
      removeChild() {},
    },
    createElement(name) {
      assert.equal(name, 'a');
      return {
        style: {},
        click() {
          if (failClick) throw new Error('download blocked');
        },
      };
    },
  };
}

async function readPrepared(manifest) {
  const chunks = [];
  let offset = 0;
  while (offset < manifest.artifact.byteLength) {
    const chunk = await readScanForgeExport({
      transferId: manifest.transferId,
      offset,
      maxBytes: 17,
    });
    chunks.push(Buffer.from(chunk.base64, 'base64'));
    offset = chunk.nextOffset;
  }
  return Buffer.concat(chunks);
}

function mockTools({
  kind = 'generated-code',
  format = 'png',
  bytes = png,
  status = 'export-prepared',
  mutateManifest,
  mutateChunk,
  failRelease = false,
} = {}) {
  const generationId = kind === 'generated-code' ? 'generation-test' : undefined;
  const artifact = {
    fileName: format === 'json' ? 'scanforge-history-test.json' : `scanforge-normal-qr-code-test.${format}`,
    format,
    mimeType: format === 'png' ? 'image/png' : format === 'svg' ? 'image/svg+xml' : 'application/json',
    byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    ...(kind === 'generated-code' ? { width: 1, height: 1 } : { itemCount: 1 }),
  };
  const manifest = {
    ok: true,
    status,
    transferId: 'transfer-test',
    kind,
    ...(generationId ? { generationId } : {}),
    artifact,
  };
  mutateManifest?.(manifest);
  const calls = [];
  return {
    calls,
    manifest,
    async callTool(name, input) {
      calls.push({ name, input });
      if (name === 'prepare-scanforge-export') return manifest;
      if (name === 'read-scanforge-export') {
        const nextOffset = Math.min(input.offset + input.maxBytes, bytes.length);
        const chunk = {
          ok: true,
          status: 'export-chunk',
          transferId: manifest.transferId,
          kind: manifest.kind,
          ...(manifest.generationId ? { generationId: manifest.generationId } : {}),
          offset: input.offset,
          nextOffset,
          eof: nextOffset === bytes.length,
          base64: bytes.subarray(input.offset, nextOffset).toString('base64'),
        };
        mutateChunk?.(chunk);
        return chunk;
      }
      if (name === 'release-scanforge-export') {
        if (failRelease) throw new Error('release failed');
        return {
          ok: true,
          status: 'export-released',
          transferId: input.transferId,
          released: true,
        };
      }
      throw new Error(`Unexpected tool: ${name}`);
    },
  };
}

test('10件のclosed schemaを確定順で公開する', () => {
  assert.deepEqual(WEBMCP_TOOL_DEFINITIONS.map(tool => tool.name), [
    'generate-code',
    'request-generated-code-download',
    'start-camera',
    'scan-current-frame',
    'stop-camera',
    'get-scan-history',
    'request-scan-history-download',
    'prepare-scanforge-export',
    'read-scanforge-export',
    'release-scanforge-export',
  ]);
  assert.ok(WEBMCP_TOOL_DEFINITIONS.every(tool => tool.inputSchema.additionalProperties === false));
  assert.ok(Object.isFrozen(WEBMCP_TOOL_DEFINITIONS));
  assert.ok(WEBMCP_TOOL_DEFINITIONS.every(tool => Object.isFrozen(tool.inputSchema)));
});

test('直接受信toolのruntime validationが未知フィールドと不正範囲を拒否する', () => {
  assert.deepEqual(validateGeneratedDownloadInput({ generationId: 'generation-test' }), {
    valid: true, generationId: 'generation-test',
  });
  assert.deepEqual(validateGeneratedDownloadInput({}), { valid: true, generationId: null });
  assert.equal(validateGeneratedDownloadInput({ extra: true }).valid, false);
  assert.deepEqual(validatePrepareExportInput({ kind: 'generated-code', generationId: 'generation-test' }), {
    valid: true, kind: 'generated-code', generationId: 'generation-test',
  });
  assert.equal(validatePrepareExportInput({ kind: 'scan-history', generationId: 'x' }).valid, false);
  assert.equal(validatePrepareExportInput({ kind: 'generated-code', extra: true }).valid, false);
  assert.equal(validateReadExportInput({ transferId: 'x', offset: 0, maxBytes: 262144 }).valid, true);
  assert.equal(validateReadExportInput({ transferId: 'x', offset: 0, maxBytes: 262145 }).valid, false);
  assert.equal(validateReleaseExportInput({ transferId: 'x' }).valid, true);
  assert.equal(validateReleaseExportInput({ transferId: 'x', extra: true }).valid, false);
});

test('生成PNGを不変スナップショットとして準備・分割取得・解放する', async () => {
  seedGenerated('png', png);
  const manifest = await prepareScanForgeExport({ kind: 'generated-code', generationId: 'generation-test' });
  assert.equal(manifest.status, 'export-prepared');
  assert.equal(manifest.generationId, 'generation-test');
  assert.equal(manifest.artifact.mimeType, 'image/png');
  assert.equal(manifest.artifact.sha256, createHash('sha256').update(png).digest('hex'));
  assert.deepEqual(await readPrepared(manifest), png);
  assert.equal(releaseScanForgeExport(manifest.transferId), true);
  await assert.rejects(readPrepared(manifest), error => error.code === 'transfer-unavailable');
});

test('公開prepare/read/release adapterだけで生成PNGを最後まで取得できる', async () => {
  seedGenerated('png', png);
  const manifest = await executePrepareScanForgeExport({
    kind: 'generated-code',
    generationId: 'generation-test',
  });
  assert.equal(manifest.ok, true);
  const chunk = await executeReadScanForgeExport({
    transferId: manifest.transferId,
    offset: 0,
    maxBytes: 262144,
  });
  assert.equal(chunk.ok, true);
  assert.deepEqual(Buffer.from(chunk.base64, 'base64'), png);
  const released = executeReleaseScanForgeExport({ transferId: manifest.transferId });
  assert.deepEqual(released, {
    ok: true,
    status: 'export-released',
    transferId: manifest.transferId,
    released: true,
  });
  const unavailable = await executeReadScanForgeExport({
    transferId: manifest.transferId,
    offset: 0,
    maxBytes: 1,
  });
  assert.equal(unavailable.status, 'transfer-unavailable');
});

test('generationIdの取り違えを準備前に拒否する', async () => {
  seedGenerated('png', png, 'generation-current');
  await assert.rejects(
    prepareScanForgeExport({ kind: 'generated-code', generationId: 'generation-other' }),
    error => error.code === 'generation-mismatch',
  );
});

test('生成SVGを同じ直接受信契約で取得する', async () => {
  seedGenerated('svg', svg);
  const manifest = await prepareScanForgeExport({ kind: 'generated-code', generationId: 'generation-test' });
  assert.equal(manifest.artifact.format, 'svg');
  assert.equal(manifest.artifact.mimeType, 'image/svg+xml');
  assert.deepEqual(await readPrepared(manifest), svg);
  assert.equal(releaseScanForgeExport(manifest.transferId), true);
});

test('履歴JSONは準備時点の内容を保持し、後続の状態変更に影響されない', async () => {
  initializeAppState({ history: { items: historyDocument.items } });
  const manifest = await prepareScanForgeExport({ kind: 'scan-history' });
  initializeAppState({ history: { items: [] } });
  const document = JSON.parse((await readPrepared(manifest)).toString('utf8'));
  assert.equal(document.items.length, 1);
  assert.equal(manifest.artifact.itemCount, 1);
  assert.equal(releaseScanForgeExport(manifest.transferId), true);
});

test('生成結果と履歴JSONを1件ずつ保持し、同種の新規準備だけが旧transferIdを置換する', async () => {
  seedGenerated('png', png, 'generation-one');
  initializeAppState({ history: { items: historyDocument.items } });
  const generatedOne = await prepareScanForgeExport({ kind: 'generated-code', generationId: 'generation-one' });
  const history = await prepareScanForgeExport({ kind: 'scan-history' });
  seedGenerated('svg', svg, 'generation-two');
  const generatedTwo = await prepareScanForgeExport({ kind: 'generated-code', generationId: 'generation-two' });
  await assert.rejects(readPrepared(generatedOne), error => error.code === 'transfer-unavailable');
  assert.equal(JSON.parse((await readPrepared(history)).toString('utf8')).items.length, 1);
  assert.deepEqual(await readPrepared(generatedTwo), svg);
  releaseScanForgeExport(history.transferId);
  releaseScanForgeExport(generatedTwo.transferId);
});

test('ブラウザーダウンロードは準備済みの同一Blobとファイル名を使う', async () => {
  seedGenerated('png', png);
  const manifest = await prepareScanForgeExport({ kind: 'generated-code', generationId: 'generation-test' });
  let dispatched;
  const result = requestPreparedScanForgeExportDownload(manifest.transferId, {
    downloadBlob(blob, fileName) { dispatched = { blob, fileName }; },
  });
  assert.equal(result.transferId, manifest.transferId);
  assert.equal(dispatched.fileName, manifest.artifact.fileName);
  assert.deepEqual(Buffer.from(await dispatched.blob.arrayBuffer()), png);
  releaseScanForgeExport(manifest.transferId);
});

test('生成download toolは自動要求後も同じ成果物を直接受信できる状態で返す', async () => {
  installDownloadDocument();
  seedGenerated('png', png);
  const result = await executeRequestGeneratedCodeDownload({});
  assert.equal(result.status, 'download-requested');
  assert.equal(result.requestDispatched, true);
  assert.equal(result.fallback.webMcpDirectTransfer.sameArtifact, true);
  assert.deepEqual(await readPrepared(result), png);
  releaseScanForgeExport(result.transferId);
});

test('ブラウザー要求が例外になってもtransferIdを保持して直接受信へ移れる', async () => {
  installDownloadDocument({ failClick: true });
  seedGenerated('png', png);
  const result = await executeRequestGeneratedCodeDownload({});
  assert.equal(result.status, 'download-request-failed');
  assert.equal(result.requestDispatched, false);
  assert.equal(result.fallback.manualControl.lastResort, true);
  assert.deepEqual(await readPrepared(result), png);
  releaseScanForgeExport(result.transferId);
});

test('生成download toolはgenerationIdの取り違え時に別のプレビューを配送しない', async () => {
  installDownloadDocument();
  seedGenerated('png', png, 'generation-current');
  const result = await executeRequestGeneratedCodeDownload({ generationId: 'generation-other' });
  assert.deepEqual(result, {
    ok: false,
    status: 'generation-mismatch',
    message: '指定したgenerationIdは現在の生成結果と一致しません。',
  });
});

test('履歴download toolも自動要求後に同じJSONを直接受信できる状態で返す', async () => {
  installDownloadDocument();
  initializeAppState({ history: { items: historyDocument.items } });
  const result = await executeRequestScanHistoryDownload({});
  assert.equal(result.status, 'download-requested');
  assert.equal(result.requestDispatched, true);
  assert.equal(result.kind, 'scan-history');
  assert.equal(result.fallback.webMcpDirectTransfer.sameArtifact, true);
  assert.equal(JSON.parse((await readPrepared(result)).toString('utf8')).items.length, 1);
  releaseScanForgeExport(result.transferId);
});

test('registryは10 toolを単一signalで登録しdisposeで全登録を解除する', async () => {
  const registrations = [];
  globalThis.document = {
    modelContext: {
      async registerTool(tool, options) {
        registrations.push({ tool, signal: options.signal });
      },
    },
  };
  const result = await initWebMcp();
  assert.deepEqual(result, { supported: true, registered: 10 });
  assert.deepEqual(registrations.map(entry => entry.tool.name), WEBMCP_TOOL_DEFINITIONS.map(tool => tool.name));
  assert.equal(new Set(registrations.map(entry => entry.signal)).size, 1);
  assert.equal(registrations[0].signal.aborted, false);
  disposeWebMcp();
  assert.equal(registrations[0].signal.aborted, true);
});

for (const [name, options, expectedFormat, expectedBytes] of [
  ['PNG', {}, 'png', png],
  ['SVG', { format: 'svg', bytes: svg }, 'svg', svg],
  ['履歴JSON', { kind: 'scan-history', format: 'json', bytes: historyJson }, 'json', historyJson],
]) {
  test(`${name}を実ファイルへ保存・検証し、準備済み成果物を解放する`, async t => {
    const outputDirectory = await outputRoot(t);
    const tools = mockTools(options);
    const result = await receiveScanForgeExport({
      callTool: tools.callTool,
      kind: options.kind || 'generated-code',
      generationId: options.kind ? null : 'generation-test',
      outputDirectory,
    });
    assert.equal(result.outcome, 'file-verified');
    assert.equal(result.file.format, expectedFormat);
    assert.deepEqual(await readFile(result.file.path), expectedBytes);
    assert.equal(tools.calls.at(-1).name, 'release-scanforge-export');
    if (expectedFormat === 'png') assert.match(result.markdown, /^!\[ScanForge生成PNG\]/);
    else assert.doesNotMatch(result.markdown, /^!/);
  });
}

test('ブラウザーダウンロード失敗時は既存transferIdを読み、別のprepareを呼ばない', async t => {
  const outputDirectory = await outputRoot(t);
  const tools = mockTools({ status: 'download-failed' });
  const result = await receiveScanForgeExport({
    callTool: tools.callTool,
    kind: 'generated-code',
    generationId: 'generation-test',
    preparedExport: { ...tools.manifest, status: 'download-request-failed' },
    outputDirectory,
  });
  assert.deepEqual(await readFile(result.file.path), png);
  assert.ok(tools.calls.every(call => call.name !== 'prepare-scanforge-export'));
  assert.equal(tools.calls.at(-1).name, 'release-scanforge-export');
});

test('空白やMarkdown区切りを含む出力先でも安全なリンクを生成する', async t => {
  const root = await outputRoot(t);
  const outputDirectory = join(root, '表示 (確認) #1 %');
  const tools = mockTools();
  tools.manifest.artifact.fileName = '画像 [完成](1) #100% &copy;.png';
  const result = await receiveScanForgeExport({
    callTool: tools.callTool,
    kind: 'generated-code',
    generationId: 'generation-test',
    outputDirectory,
  });
  const destinations = [...result.markdown.matchAll(/\(<([^>]+)>\)/g)].map(match => match[1]);
  assert.equal(destinations.length, 2);
  assert.ok(destinations.every(path => !/[\s()#&\[\]]/.test(path)));
  assert.ok(destinations.every(path => decodeURIComponent(path) === result.file.path));
});

test('再実行しても既存ファイルを上書きしない', async t => {
  const outputDirectory = await outputRoot(t);
  const sentinel = join(outputDirectory, 'scanforge-normal-qr-code-test.png');
  await writeFile(sentinel, 'keep');
  const first = await receiveScanForgeExport({ callTool: mockTools().callTool, kind: 'generated-code', generationId: 'generation-test', outputDirectory });
  const second = await receiveScanForgeExport({ callTool: mockTools().callTool, kind: 'generated-code', generationId: 'generation-test', outputDirectory });
  assert.notEqual(first.directory, second.directory);
  assert.equal(await readFile(sentinel, 'utf8'), 'keep');
});

test('256KiBを超える成果物を複数チャンクで受信する', async t => {
  const outputDirectory = await outputRoot(t);
  const largeSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><!--${'a'.repeat(600000)}--><rect width="1" height="1"/></svg>`);
  const tools = mockTools({ format: 'svg', bytes: largeSvg });
  const result = await receiveScanForgeExport({ callTool: tools.callTool, kind: 'generated-code', generationId: 'generation-test', outputDirectory });
  assert.deepEqual(await readFile(result.file.path), largeSvg);
  assert.ok(tools.calls.filter(call => call.name === 'read-scanforge-export').length >= 3);
});

const invalidCases = [
  ['保存先を抜ける名前', { mutateManifest: manifest => { manifest.artifact.fileName = '../outside.png'; } }],
  ['SHA-256不一致', { mutateManifest: manifest => { manifest.artifact.sha256 = '0'.repeat(64); } }],
  ['PNG寸法不一致', { mutateManifest: manifest => { manifest.artifact.width = 2; } }],
  ['PNG終端欠落', { bytes: png.subarray(0, -12) }],
  ['取得IDの取り違え', { mutateChunk: chunk => { chunk.transferId = 'transfer-other'; } }],
  ['取得範囲の飛び越し', { mutateChunk: chunk => { chunk.offset += 1; } }],
  ['終端フラグ不一致', { mutateChunk: chunk => { chunk.eof = false; } }],
  ['base64切り詰め', { mutateChunk: chunk => { chunk.base64 = chunk.base64.slice(0, -4); } }],
];

for (const [name, options] of invalidCases) {
  test(`${name}を成功扱いせず、不完全ファイルを削除して解放する`, async t => {
    const outputDirectory = await outputRoot(t);
    const tools = mockTools(options);
    await assert.rejects(receiveScanForgeExport({
      callTool: tools.callTool,
      kind: 'generated-code',
      generationId: 'generation-test',
      outputDirectory,
    }));
    assert.deepEqual(await readdir(outputDirectory), []);
    assert.equal(tools.calls.at(-1).name, 'release-scanforge-export');
  });
}

test('ページ内バッファの解放失敗を検証済みファイルの取得失敗と混同しない', async t => {
  const outputDirectory = await outputRoot(t);
  const tools = mockTools({ failRelease: true });
  const result = await receiveScanForgeExport({
    callTool: tools.callTool,
    kind: 'generated-code',
    generationId: 'generation-test',
    outputDirectory,
  });
  assert.equal(result.outcome, 'file-verified');
  assert.match(result.releaseWarning, /release failed/);
  assert.deepEqual(await readFile(result.file.path), png);
});

test('相対出力先はSite tool実行前に拒否する', async () => {
  const tools = mockTools();
  await assert.rejects(receiveScanForgeExport({
    callTool: tools.callTool,
    kind: 'generated-code',
    generationId: 'generation-test',
    outputDirectory: 'relative',
  }));
  assert.equal(tools.calls.length, 0);
});

test('プロジェクト内でも_local/_ai-agent/tmp外の出力先はSite tool実行前に拒否する', async () => {
  const tools = mockTools();
  await assert.rejects(receiveScanForgeExport({
    callTool: tools.callTool,
    kind: 'generated-code',
    generationId: 'generation-test',
    outputDirectory: resolve(process.cwd(), 'web'),
  }));
  assert.equal(tools.calls.length, 0);
});
