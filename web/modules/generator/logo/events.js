/**
 * ロゴ関連のイベントハンドラ。
 */

import { elements } from '../dom-cache.js';
import { mapFormatValue } from '../controls.js';
import { toast } from '../feedback.js';
import createUploaderShell from '../../ui/uploader/shell.js';
import {
  getLogoState,
  setLogoPriority,
  setLogoEnabled,
  isLogoEnabled,
  getLogoColorMode,
  setLogoColorMode,
} from './state.js';
import {
  applyLogoPrioritySideEffects,
  setLogoPriorityToggle,
  updateLogoAvailability,
  setLogoInteractiveState,
  setLogoModeTabsState,
  LOGO_QR_ONLY_MESSAGE,
} from './ui.js';
import { ingestLogo, applyStructuralColorForMode } from './file-handling.js';

let logoUploaderShell = null;

export function bindLogoDropzone() {
  if (!elements.logoDropzone || !elements.logoInput) {
    return;
  }
  logoUploaderShell?.destroy?.();
  const logoFieldRoot = elements.logoDropzone.closest('.logo-field') || elements.logoDropzone.parentElement;
  logoUploaderShell = createUploaderShell({
    trigger: elements.logoTrigger || elements.logoDropzone,
    dropzone: elements.logoDropzone,
    input: elements.logoInput,
    root: logoFieldRoot,
    magnetTargets: logoFieldRoot ? [logoFieldRoot] : [],
    onFilesSelected: async (files = [], meta = {}) => {
      const file = Array.isArray(files) ? files[0] : files?.[0];
      if (!file) {
        toast.error('ロゴファイルを取得できませんでした。');
        return;
      }
      if (!isLogoEnabled()) {
        toast.info('ロゴ描画スイッチをオンにすると生成結果へ反映されます。');
      }
      const source = meta.source === 'picker' ? 'picker' : 'drop';
      try {
        await ingestLogo(file, source);
      } catch (error) {
        toast.error('ロゴの読み込みに失敗しました。再度お試しください。');
        throw error;
      }
    },
    onError: (message) => {
      toast.error(message || 'ロゴファイルを取得できませんでした。');
    },
  });
  elements.logoDropzone.__uploaderShell = logoUploaderShell;
  setLogoInteractiveState(isLogoEnabled());
}

export async function handleLogoChange(event) {
  const file = event.target.files?.[0] ?? null;
  if (!file) {
    return;
  }
  if (!isLogoEnabled()) {
    toast.info('ロゴ描画スイッチをオンにすると生成結果へ反映されます。');
  }
  await ingestLogo(file, 'picker');
  event.target.value = '';
}

export function handleLogoPriorityChange(event) {
  event?.preventDefault?.();
  const state = getLogoState();
  const current = !!state.logoPriority;
  const desired =
    typeof event?.target?.checked === 'boolean'
      ? !!event.target.checked
      : !current;

  setLogoPriorityToggle(desired);
  setLogoPriority(desired);
  applyLogoPrioritySideEffects();

  return { toggled: desired !== current, enabled: desired, previous: current };
}

export function handleLogoModeChange(event) {
  const target = event?.target?.closest('.logo-mode-pill[data-mode]');
  if (!target) {
    return { changed: false, reason: 'no-target' };
  }
  event?.preventDefault?.();
  const desired = target.dataset.mode === 'safe' ? 'safe' : 'faithful';
  const state = getLogoState();
  const current = getLogoColorMode();
  if (current === desired) {
    return { changed: false, reason: 'same' };
  }
  setLogoColorMode(desired);
  if (state.logoColorReady) {
    applyStructuralColorForMode(desired);
  }
  setLogoModeTabsState(desired);
  applyLogoPrioritySideEffects();
  return { changed: true, mode: desired, pendingColor: !state.logoColorReady };
}

export function handleLogoToggleChange(event) {
  const desired = !!event?.target?.checked;
  const formatKey = mapFormatValue(elements.formatSelect.value);
  const isQrCode = formatKey === 'qr_code';
  const previous = isLogoEnabled();

  if (previous === desired) {
    updateLogoAvailability();
    return { toggled: false, enabled: previous };
  }

  setLogoEnabled(desired);
  updateLogoAvailability();
  if (!isQrCode) {
    toast.info(LOGO_QR_ONLY_MESSAGE);
    return { toggled: true, enabled: desired, reason: 'format' };
  }
  return { toggled: true, enabled: desired };
}
