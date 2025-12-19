/**
 * ストレージキー定義。
 */
export const STORAGE_KEYS = Object.freeze({
  history: 'scanforge.history',
  settings: 'scanforge.settings',
  mirror: 'scanforge.mirror',
  logLevel: 'scanforge.logLevel',
});

/**
 * 旧キー（クリーンアップ対象）。
 */
export const OBSOLETE_KEYS = Object.freeze({
  theme: 'scanforge.theme',
});
