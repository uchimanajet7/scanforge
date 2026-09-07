/**
 * generate-code WebMCP tool adapter。
 */

import { generateCode } from '../../generator/actions/index.js';
import { getState as getGeneratorState } from '../../generator/context.js';
import { navigateTo } from '../../ui/tabs/controller.js';
import { validateGenerateCodeInput } from '../validation.js';

const FAILURE_MESSAGES = Object.freeze({
  'invalid-input': '入力値が生成ツールの契約に一致しません。',
  'invalid-text': '入力内容が選択したコード形式の要件に一致しません。',
  'generator-unavailable': 'コード生成機能の初期化が完了していません。',
  'renderer-unavailable': 'コード生成エンジンを利用できません。',
  'render-failed': 'コードを生成できませんでした。',
});

function failure(code) {
  const status = Object.prototype.hasOwnProperty.call(FAILURE_MESSAGES, code)
    ? code
    : 'render-failed';
  return {
    ok: false,
    status,
    message: FAILURE_MESSAGES[status],
  };
}

export async function executeGenerateCode(input, options = {}) {
  if (!validateGenerateCodeInput(input)) {
    return failure('invalid-input');
  }

  const signal = options?.signal;
  signal?.throwIfAborted();

  try {
    navigateTo('generate');

    const generatorState = getGeneratorState();
    const renderContext = {
      logoPriority: !!generatorState.logoPriority,
      logoApplied: !!generatorState.logoEnabled && !!generatorState.logoAsset,
    };
    const result = await generateCode(input, { signal, silent: true });
    signal?.throwIfAborted();

    if (!result?.success) {
      return failure(result?.code);
    }

    const preview = result.preview;
    if (
      !preview
      || typeof preview.generationId !== 'string'
      || !preview.generationId
      || !Number.isFinite(preview.width)
      || !Number.isFinite(preview.height)
    ) {
      return failure('render-failed');
    }

    const isQrCode = result.formatKey === 'qr_code';
    return {
      ok: true,
      status: 'generated',
      generationId: preview.generationId,
      format: result.format,
      output: result.output,
      requestedSize: result.size,
      width: preview.width,
      height: preview.height,
      includeText: result.includeText,
      transparentApplied: result.transparent && !(isQrCode && renderContext.logoPriority),
      logoApplied: isQrCode && renderContext.logoApplied,
    };
  } catch (error) {
    if (signal?.aborted) {
      throw signal.reason;
    }
    return failure('render-failed');
  }
}
