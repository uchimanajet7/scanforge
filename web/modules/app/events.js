/**
 * グローバルイベントの管理。
 */

import { logger } from '../core/logger.js';

let listenersRegistered = false;

/**
 * 必要なグローバルイベントリスナーを登録する。
 */
export function registerGlobalEventHandlers() {
  if (listenersRegistered) {
    return;
  }

  window.addEventListener('popstate', handlePopState);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('beforeunload', handleBeforeUnload);

  listenersRegistered = true;
  logger.debug('グローバルイベントリスナー設定完了');
}

function handlePopState(event) {
  logger.debug('履歴ナビゲーション', { state: event.state });
  // タブナビゲーションは tabs モジュールが処理する。
}

function handleOnline() {
  logger.debug('network:online');
  // 必要に応じて同期処理などを追加する。
}

function handleOffline() {
  logger.debug('network:offline');
  // オフライン時の処理をここに追加する。
}

function handleBeforeUnload(event) {
  if (!hasUnsavedData()) {
    return;
  }
  event.preventDefault();
  event.returnValue = '未保存のデータがあります。ページを離れますか？';
  return event.returnValue;
}

function hasUnsavedData() {
  return false;
}
