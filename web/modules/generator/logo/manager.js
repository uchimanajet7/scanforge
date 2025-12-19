/**
 * ロゴ関連機能の公開窓口。
 */

import { formatHex, sanitizeHex } from './contrast.js';
import {
  applyLogoPrioritySideEffects,
  setLogoPriorityToggleLoading,
  setLogoPreviewState,
  updateLogoDropState,
  updateLogoPriorityAvailability,
  updateLogoAvailability,
} from './ui.js';
import {
  bindLogoDropzone,
  handleLogoChange,
  handleLogoPriorityChange,
  handleLogoToggleChange,
  handleLogoModeChange,
} from './events.js';
import {
  normalizeLogoMimeType,
  resetLogoColor,
  applyStructuralColorForMode,
} from './file-handling.js';

export { clearLogoPreview } from './preview.js';

function initializeLogoUi() {
  resetLogoColor();
  updateLogoPriorityAvailability();
  updateLogoAvailability();
  updateLogoDropState('idle');
}

export {
  applyLogoPrioritySideEffects,
  bindLogoDropzone,
  formatHex,
  handleLogoChange,
  handleLogoToggleChange,
  handleLogoPriorityChange,
  handleLogoModeChange,
  initializeLogoUi,
  normalizeLogoMimeType,
  applyStructuralColorForMode,
  resetLogoColor,
  sanitizeHex,
  setLogoPriorityToggleLoading,
  setLogoPreviewState,
  updateLogoDropState,
  updateLogoPriorityAvailability,
  updateLogoAvailability,
};
