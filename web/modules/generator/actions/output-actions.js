import { elements } from '../dom-cache.js';
import { toast, logger } from '../feedback.js';
import { canCopyPng } from '../preview/state.js';
import { getState } from '../context.js';
import { requestCurrentPreviewDownload } from './download-current-preview.js';

export function createOutputActions() {
  function handleDownload() {
    const result = requestCurrentPreviewDownload();
    if (!result) {
      toast.error('ダウンロード可能なデータがありません。');
    }
  }

  async function handleCopyOutput() {
    const preview = getState().preview;
    if (!preview) {
      toast.error('コピーできる生成結果がありません。');
      return;
    }
    const output = (preview.output || 'svg').toLowerCase();
    logger.debug('generator:copy:attempt', {
      output,
      hasSvg: !!preview.svgText,
      hasPngBlob: !!preview.pngBlob,
      pngClipboardSupported: canCopyPng(),
      copyBtnDisabled: !!elements.copyBtn?.disabled,
      copyBtnDataset: elements.copyBtn ? { ...elements.copyBtn.dataset } : null,
    });
    try {
      if (output === 'svg') {
        if (!preview.svgText) {
          toast.error('コピーできる SVG データがありません。');
          return;
        }
        await navigator.clipboard.writeText(preview.svgText);
        toast.success('SVG コードをコピーしました。');
        logger.debug('generator:copy:success', { output: 'svg' });
        return;
      }
      if (output === 'png') {
        if (!preview.pngBlob) {
          toast.error('コピーできる PNG データがありません。');
          return;
        }
        if (!canCopyPng()) {
          toast.warning('ブラウザが画像コピーに対応していません。ダウンロードをご利用ください。');
          return;
        }
        const item = new ClipboardItem({ 'image/png': preview.pngBlob });
        await navigator.clipboard.write([item]);
        toast.success('PNG をコピーしました。');
        logger.debug('generator:copy:success', { output: 'png', size: preview.pngBlob.size });
        return;
      }
      toast.error('未対応の出力形式です。');
    } catch (error) {
      logger.error('generator:copy-failed', { error, output });
      toast.error('クリップボードへのコピーに失敗しました。');
    }
  }

  function init() {
    elements.downloadBtn?.addEventListener('click', handleDownload);
    elements.copyBtn?.addEventListener('click', handleCopyOutput);
  }

  return {
    init,
    handleDownload,
    handleCopyOutput,
  };
}
