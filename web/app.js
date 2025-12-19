/**
 * ScanForge - アプリケーションエントリーポイント。
 *
 * `index.html` から読み込まれ、モジュール構成の初期化と起動フローをまとめて担う。
 */

import { initApp } from './modules/app/bootstrap.js';
import { exposeDebugInterfaceIfRequested } from './modules/app/debug.js';

await exposeDebugInterfaceIfRequested(initApp);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export default {
  initApp,
};
