# Web 開発ガイド

このドキュメントは、ScanForge の WebUI をローカルで動かしながら開発・確認するための最小手順をまとめます。WebUI のソースは `web/` ディレクトリにあります。導線の入口は `docs/GETTING_STARTED.md`、環境の前提は `docs/DEV_SETUP.md` を参照してください。

---

## ローカル起動: 推奨

- 起動: `bash scripts/tools/web/start-local-web.sh`
- アクセス: `http://localhost:8000/`
- 既定ポートは `8000` です。ポートは `SWS_PORT` で変更できます。
- ネットワーク: `start-local-web.sh` は `SWS_VERSION` 未指定の場合に `static-web-server` の最新リリース情報を取得します。未配置の場合は `tools/web/static-web-server` をダウンロードして配置します。オフラインで使う場合は `SWS_VERSION` を固定し、`tools/web/static-web-server` を事前に配置してください。
- 必要ツール: `curl` / `tar` / `lsof`。`start-local-web.sh` で使用します。

`file://` 直開きはカメラ権限や Web API 制約で動作しないことがあるため、`localhost` で起動して確認します。

### ログレベル

- 起動時に指定。例: `LOG_LEVEL=debug SWS_FORCE_KILL=1 bash scripts/tools/web/start-local-web.sh`
- URL パラメータ。例: `http://localhost:8000/?logLevel=debug`
- 実行中の一時切替。ブラウザコンソールで実行します。`window.ScanForgeLogger?.setLevel('debug', { persist: false });`

---

## キャッシュ更新: `styles.css` / `app.js`

`start-local-web.sh` は起動時に `web/index.html` 内の `styles.css` と `app.js` の参照に `?v=` を付与します。初回は `web/index.html.original` を作成します。

手動で更新したい場合は `bash scripts/tools/web/apply-cache-bust.sh <VERSION>` を使用します。

---

---

## 手動確認: 最低限

- Network: 想定外の 404 がなく、`styles.css` / `app.js` / `modules/**` が 200 で読めている
- スキャン: カメラ権限を許可し、読み取り結果が「最新結果」と「履歴」に反映される
- 生成: QR / バーコード生成が作成・保存できる。出力は SVG / PNG。
