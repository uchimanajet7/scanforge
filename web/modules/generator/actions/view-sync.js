import { DEFAULT_SETTINGS, updateState } from '../context.js';
import { elements } from '../dom-cache.js';
import {
  resetLogoColor,
  updateLogoPriorityAvailability,
  updateLogoAvailability,
} from '../logo/manager.js';
import { updateSizeControls, getOutputFormat } from '../controls.js';
import { clearPreview } from '../preview/render.js';
import { updateCopyActionState, updatePreviewMeta, canCopyPng } from '../preview/state.js';
import { logger } from '../feedback.js';

export function createViewSync() {
  function syncAfterGenerate(preview, output) {
    if (elements.downloadBtn) {
      elements.downloadBtn.disabled = false;
    }
    const copySupported = updateCopyActionState(preview, output);
    updatePreviewMeta();
    logger.debug('generator:copy-state', {
      output,
      hasSvg: !!preview?.svgText,
      hasPngBlob: !!preview?.pngBlob,
      copySupported,
      pngClipboardSupported: output === 'png' ? canCopyPng() : null,
    });
    return copySupported;
  }

  function handleReset() {
    elements.form.reset();
    updateState({ targetSizePx: DEFAULT_SETTINGS.targetSizePx, preview: null });
    resetLogoColor();
    updateSizeControls(DEFAULT_SETTINGS.targetSizePx);
    updateLogoPriorityAvailability();
    updateLogoAvailability();
    clearPreview();
    updateCopyActionState(null, getOutputFormat());
    updatePreviewMeta();
    if (elements.downloadBtn) {
      elements.downloadBtn.disabled = true;
    }
    if (elements.copyBtn) {
      elements.copyBtn.disabled = true;
      elements.copyBtn.setAttribute('aria-disabled', 'true');
    }
  }

  return {
    handleReset,
    syncAfterGenerate,
  };
}
