import { getState, LOGO_DEFAULT_COLOR } from '../context.js';
import { elements } from '../dom-cache.js';
import {
  mapFormatValue,
  getQuietZoneModules,
  getTargetSizePx,
} from '../controls.js';
import { showTextError, hideTextError, logger, toast } from '../feedback.js';
import { ensureBwipReady, renderBarcode } from '../render/orchestrator.js';

export function createGenerateRunner({ onAfterSuccess } = {}) {
  async function runGenerate({ silent = false } = {}) {
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
      return { success: false };
    }

    const formatKey = mapFormatValue(elements.formatSelect.value);
    const output = (elements.outputSelect.value || 'svg').toLowerCase();
    const includeText = !!elements.includeTextInput?.checked;
    const transparent = !!elements.transparentInput?.checked;

    try {
      const result = await renderBarcode({
        text,
        formatKey,
        output,
        includeText,
        transparent,
        quietModules: getQuietZoneModules(formatKey),
        targetSizePx: getTargetSizePx(),
      });
      const state = getState();
      state.preview = result;
      const afterSuccessResult = onAfterSuccess?.(result, output);
      const copySupported = typeof afterSuccessResult === 'boolean'
        ? afterSuccessResult
        : !!afterSuccessResult?.copySupported;
      const fidelityMode = state.logoColorMode || 'faithful';
      const modeLabel = result.logoPriority ? 'ロゴ優先モード' : '通常モード';
      const dataColorLabel = result.logoPriority ? result.logoColor : LOGO_DEFAULT_COLOR;
      const structuralColorLabel = result.logoPriority ? result.logoStructuralColor : LOGO_DEFAULT_COLOR;
      const fidelityLabel = result.logoPriority
        ? fidelityMode === 'safe'
          ? '（読み取り優先）'
          : '（忠実再現）'
        : '';
      let status = `${modeLabel}${fidelityLabel}で生成しました（データ: ${dataColorLabel} / 構造: ${structuralColorLabel}）。読み取り可否はご自身で確認してください。`;
      if (output === 'png' && !copySupported) {
        toast.warning('ブラウザが画像のクリップボードコピーに対応していません。ダウンロードをご利用ください。');
        status += ' ブラウザが画像コピーに対応していないため、ダウンロード機能をご利用ください。';
      }
      logger.info('generator:render:summary', { status, output, fidelityMode, copySupported });
      return { success: true, preview: result, output };
    } catch (error) {
      logger.error('generator:render-failed', { error });
      toast.error('生成に失敗しました。入力内容やネットワークを確認してください。');
      return { success: false };
    }
  }

  return {
    runGenerate,
  };
}
