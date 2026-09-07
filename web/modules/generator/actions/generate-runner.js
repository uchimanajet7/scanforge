import { getState, LOGO_DEFAULT_COLOR } from '../context.js';
import { elements } from '../dom-cache.js';
import {
  mapFormatValue,
  getQuietZoneModules,
  getTargetSizePx,
} from '../controls.js';
import { showTextError, hideTextError, logger, toast } from '../feedback.js';
import { ensureBwipReady, renderBarcode } from '../render/orchestrator.js';
import { generateId } from '../../core/utils.js';

export function createGenerateRunner({ onAfterSuccess } = {}) {
  async function runGenerate({ silent = false, signal } = {}) {
    const text = elements.textInput.value.trim();
    if (!text) {
      if (!silent) {
        showTextError('テキストを入力してください。');
        elements.textInput.focus();
      }
      return { success: false };
    }
    hideTextError();

    if (!ensureBwipReady()) {
      if (!silent) {
        toast.error('bwip-js の読み込みを確認してください。');
      }
      return { success: false, code: 'renderer-unavailable' };
    }

    const formatKey = mapFormatValue(elements.formatSelect.value);
    const output = (elements.outputSelect.value || 'svg').toLowerCase();
    const includeText = !!elements.includeTextInput?.checked;
    const transparent = !!elements.transparentInput?.checked;

    try {
      signal?.throwIfAborted();
      const result = await renderBarcode({
        text,
        formatKey,
        output,
        includeText,
        transparent,
        quietModules: getQuietZoneModules(formatKey),
        targetSizePx: getTargetSizePx(),
        signal,
      });
      signal?.throwIfAborted();
      const preview = {
        ...result,
        generationId: `generation-${generateId()}`,
      };
      const state = getState();
      state.preview = preview;
      const afterSuccessResult = onAfterSuccess?.(preview, output);
      const copySupported = typeof afterSuccessResult === 'boolean'
        ? afterSuccessResult
        : !!afterSuccessResult?.copySupported;
      const fidelityMode = state.logoColorMode || 'faithful';
      const modeLabel = preview.logoPriority ? 'ロゴ優先モード' : '通常モード';
      const dataColorLabel = preview.logoPriority ? preview.logoColor : LOGO_DEFAULT_COLOR;
      const structuralColorLabel = preview.logoPriority ? preview.logoStructuralColor : LOGO_DEFAULT_COLOR;
      const fidelityLabel = preview.logoPriority
        ? fidelityMode === 'safe'
          ? '。読み取りを優先します。'
          : '。忠実に再現します。'
        : '';
      let status = `${modeLabel}${fidelityLabel}で生成しました。データは ${dataColorLabel}、構造は ${structuralColorLabel} です。読み取り可否はご自身で確認してください。`;
      if (output === 'png' && !copySupported) {
        toast.warning('ブラウザが画像のクリップボードコピーに対応していません。ダウンロードをご利用ください。');
        status += ' ブラウザが画像コピーに対応していないため、ダウンロード機能をご利用ください。';
      }
      logger.info('generator:render:summary', { status, output, fidelityMode, copySupported });
      return { success: true, preview, output };
    } catch (error) {
      if (signal?.aborted) {
        throw signal.reason;
      }
      logger.error('generator:render-failed', { error });
      toast.error('生成に失敗しました。入力内容やネットワークを確認してください。');
      return { success: false, code: 'render-failed' };
    }
  }

  return {
    runGenerate,
  };
}
