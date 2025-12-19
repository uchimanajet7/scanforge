/**
 * 生成モジュールの状態と定数を集約するコンテキスト。
 * 各サブモジュールから共有されるグローバル設定だけを扱う。
 */

import { APP_CONFIG } from '../core/config/app-settings.js';

const DEFAULT_SETTINGS = Object.freeze({
  targetSizePx: APP_CONFIG.GENERATE_TARGET_SIZE_PX,
  minSizePx: APP_CONFIG.GENERATE_MIN_SIZE_PX,
  maxSizePx: APP_CONFIG.GENERATE_MAX_SIZE_PX,
});

const LOGO_DEFAULT_COLOR = '#000000';
const LOGO_BACKGROUND_COLOR = '#FFFFFF';
const LOGO_MIN_CONTRAST = 4.5;
const LOGO_MAX_BLEND = 0.95;
const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB
const CANVAS_MAX_DIMENSION = 256;
const LOGO_FILE_TYPES = Object.freeze({
  'image/png': 'png',
  'image/svg+xml': 'svg',
});
const LOGO_MIN_LUMINANCE = 0.05;
const LOGO_SIZE_RATIO = 0.2;
const LOGO_BADGE_PADDING = 5;
const QR_FORMAT_INFO_INDEX = 8;

const FORMAT_ALIASES = Object.freeze({
  qrcode: 'qr_code',
  code128: 'code_128',
  code39: 'code_39',
  code93: 'code_93',
  ean13: 'ean_13',
  ean8: 'ean_8',
  upca: 'upc_a',
  upce: 'upc_e',
  datamatrix: 'data_matrix',
  pdf417: 'pdf417',
  itf: 'itf',
  codabar: 'codabar',
});

function createInitialState() {
  return {
    targetSizePx: DEFAULT_SETTINGS.targetSizePx,
    logoColor: LOGO_DEFAULT_COLOR,
    logoColorReady: false,
    logoPriority: false,
    logoColorMode: 'faithful',
    logoEnabled: false,
    logoStructuralColor: LOGO_DEFAULT_COLOR,
    logoAccentFallback: false,
    logoStructuralContrast: LOGO_MIN_CONTRAST,
    logoStructuralBlend: 0,
    logoFileName: '',
    logoFileSize: 0,
    logoFileType: '',
    logoAsset: null,
    preview: null,
    logoJobId: 0,
  };
}

const generatorState = createInitialState();

let initialized = false;

function getState() {
  return generatorState;
}

function updateState(partial) {
  Object.assign(generatorState, partial);
}

function resetState() {
  const next = createInitialState();
  Object.keys(generatorState).forEach(key => {
    generatorState[key] = next[key];
  });
}

function isInitialized() {
  return initialized;
}

function markInitialized() {
  initialized = true;
}

function clearInitialized() {
  initialized = false;
}

export {
  LOGO_BACKGROUND_COLOR,
  LOGO_DEFAULT_COLOR,
  LOGO_FILE_TYPES,
  LOGO_MAX_BLEND,
  LOGO_MIN_CONTRAST,
  LOGO_MIN_LUMINANCE,
  CANVAS_MAX_DIMENSION,
  DEFAULT_SETTINGS,
  FILE_SIZE_LIMIT,
  FORMAT_ALIASES,
  LOGO_BADGE_PADDING,
  LOGO_SIZE_RATIO,
  QR_FORMAT_INFO_INDEX,
  clearInitialized,
  getState,
  isInitialized,
  markInitialized,
  resetState,
  updateState,
};
