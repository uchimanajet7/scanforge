# Web 開発ガイド

このドキュメントは、ScanForge の WebUI（`web/`）をローカルで動かしながら開発・確認するための最小手順をまとめます。導線の入口は `docs/GETTING_STARTED.md`、環境の前提は `docs/DEV_SETUP.md` を参照してください。

---

## ローカル起動（推奨）

- 起動: `bash scripts/tools/web/start-local-web.sh`
- アクセス: `http://localhost:8000/`（既定。ポートは `SWS_PORT` で変更可能）

`file://` 直開きはカメラ権限や Web API 制約で動作しないことがあるため、`localhost` で起動して確認します。

### ログレベル

- 起動時に指定（例）: `LOG_LEVEL=debug SWS_FORCE_KILL=1 bash scripts/tools/web/start-local-web.sh`
- URL パラメータ（例）: `http://localhost:8000/?logLevel=debug`
- 実行中の一時切替（ブラウザコンソール）: `window.ScanForgeLogger?.setLevel('debug', { persist: false });`

---

## キャッシュ更新（`styles.css` / `app.js`）

`start-local-web.sh` は起動時に `styles.css` と `app.js` へキャッシュバスティング用の `?v=` を付与します（ログに適用結果が出ます）。

手動で更新したい場合は `bash scripts/tools/web/apply-cache-bust.sh <VERSION>` を使用します。

---

## よくある 404（無視してよいもの）

Chrome 等が DevTools 用に `/.well-known/appspecific/com.chrome.devtools.json` を取得しようとして 404 になることがあります。ScanForge の機能とは無関係なため、他のアセット（`styles.css` / `app.js` / `web/modules/**`）が 200 で読めているなら無視して問題ありません。

---

## 手動確認（最低限）

- Network: `styles.css` / `app.js` / `web/modules/**` が 200 で読めている（想定外の 404 がない）
- スキャン: カメラ権限を許可し、読み取り結果が「最新結果」と「履歴」に反映される
- 生成: QR / バーコード生成（SVG/PNG）が作成・保存できる
