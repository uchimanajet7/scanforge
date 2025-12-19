import { getState } from '../context.js';
import { elements } from '../dom-cache.js';
import { toast, logger } from '../feedback.js';
import { canCopyPng } from '../preview/state.js';
import { buildDownloadName } from '../render/orchestrator.js';

export function createOutputActions() {
  function handleDownload() {
    const preview = getState().preview;
    if (!preview) {
      toast.error('ダウンロード可能なデータがありません。');
      return;
    }
    let blob;
    if (preview.output === 'svg') {
      blob = new Blob([preview.svgText], { type: 'image/svg+xml' });
    } else if (preview.pngBlob) {
      blob = preview.pngBlob;
    }
    if (!blob) {
      toast.error('ダウンロード可能なデータがありません。');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildDownloadName(preview);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
