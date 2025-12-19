/**
 * アプリケーション設定。
 */
export const APP_CONFIG = Object.freeze({
  // 履歴管理
  HISTORY_LIMIT: 100,

  // 検出キャッシュ
  DETECTION_CACHE_TTL_MS: 400,

  // 自動再開
  AUTO_RESUME_MIN_MS: 200,
  AUTO_RESUME_MAX_MS: 5000,
  AUTO_RESUME_DEFAULT_MS: 1200,
  AUTO_RESUME_PROGRESS_THRESHOLD: 400,

  // UI設定
  REDUCED_MOTION_INTERVAL_MS: 120,
  TOAST_DEFAULT_DURATION: 4000,
  TOAST_MIN_DURATION_MS: 3000,
  TOAST_DETECTION_DURATION_MS: 6000,
  LATEST_RESULT_HIGHLIGHT_MS: 6000,

  // カメラ設定
  VIDEO_IDEAL_WIDTH: 1280,
  VIDEO_IDEAL_HEIGHT: 720,
  MIRROR_DEFAULT: true,

  // 生成設定
  GENERATE_TARGET_SIZE_PX: 480,
  GENERATE_MIN_SIZE_PX: 120,
  GENERATE_MAX_SIZE_PX: 960,

  // プレビュー
  PREVIEW_DEFAULT_SIZE: 240,
  PREVIEW_MIN_SIZE: 1,

  // デバッグ設定
  DEFAULT_LOG_LEVEL: 'info',
});

/**
 * デフォルト設定値。
 */
export const DEFAULT_SETTINGS = Object.freeze({
  continuousScan: false,
  playSound: false,
  maxHistory: APP_CONFIG.HISTORY_LIMIT,
  scanMode: 'auto',
  autoResumeDelayMs: APP_CONFIG.AUTO_RESUME_DEFAULT_MS,
  scanFormatsMode: 'auto',
  scanFormatsManual: [],
});
