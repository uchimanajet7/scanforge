/**
 * ScanForge - グローバル状態管理
 *
 * アプリケーション全体の状態を一元管理し、状態変更通知のワイヤリングを担う。
 */

import { APP_CONFIG } from '../config/app-settings.js';
import {
  initializeAppState,
  getAppState,
  subscribe,
  getState,
  setState,
  updateState,
} from './base.js';

import { createDefaultImageState } from './scanner/initial-state.js';
import { createDefaultGeneratorOverlayState } from './generator/overlay.js';
import { createDefaultHistoryState } from './history.js';
import { createDefaultSettingsState, updateSettings } from './settings.js';
import {
  createDefaultUiState,
  createDefaultPreviewState,
  addToast,
  removeToast,
} from './ui.js';
import {
  restoreState,
  persistState,
  startAutoPersist,
} from './persistence.js';
import { setGlobalMirrorPreference } from './scanner/status.js';

/**
 * アプリケーション状態の初期化。
 */
const initialAppState = {
  scanner: {
    status: 'idle',
    stream: null,
    devices: [],
    selectedDevice: null,
    isMirrored: APP_CONFIG.MIRROR_DEFAULT,
    lastDetection: null,
    resumeTimer: null,
    autoResume: {
      active: false,
      totalMs: 0,
      remainingMs: 0,
      startedAt: 0,
    },
    image: createDefaultImageState(),
  },
  generator: {
    status: 'draft',
    lastGenerated: null,
    currentOptions: {},
    overlay: createDefaultGeneratorOverlayState(),
  },
  history: createDefaultHistoryState(),
  settings: createDefaultSettingsState(),
  ui: createDefaultUiState(),
  preview: createDefaultPreviewState(),
};

initializeAppState(initialAppState);

if (getState('settings.logLevel') === 'debug') {
  window.ScanForgeState = {
    get: getState,
    set: setState,
    update: updateState,
    subscribe,
    getAll: () => getAppState(),
  };
}

const appStateApi = {
  getState,
  setState,
  updateState,
  subscribe,
  restoreState,
  persistState,
  startAutoPersist,
  getAll: () => getAppState(),
  setGlobalMirrorPreference,
  updateSettings,
  addToast,
  removeToast,
};

export default appStateApi;

export {
  getState,
  setState,
  updateState,
  subscribe,
  restoreState,
  persistState,
  startAutoPersist,
  getAppState,
  setGlobalMirrorPreference,
  updateSettings,
  addToast,
  removeToast,
};
