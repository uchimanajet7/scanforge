# はじめに: Getting Started

最短 2–3 ステップで WebUI の試用と API デプロイを開始できます。詳細は `docs/DEPLOY.md` を参照してください。

## 前提: 準備物
### WebUI: ローカルで起動する場合
- macOS / Linux 環境。
- `curl` / `tar` / `lsof`。`bash scripts/tools/web/start-local-web.sh` は内部で利用します。
- ネットワーク。`start-local-web.sh` は `SWS_VERSION` 未指定の場合に `static-web-server` の最新リリース情報を取得します。未配置の場合は `tools/web/static-web-server` をダウンロードして配置します。オフラインで使う場合は `SWS_VERSION` を固定し、`tools/web/static-web-server` を事前に配置してください。

### API をデプロイする場合
- Terraform 1.5+ / AWS CLI v2 / Python 3 + pip / curl / zip / jq / base64。依存レイヤーは Python 3.13 ランタイム向けに作成します。
- AWS プロファイル、または AssumeRole 可能な認証手段
- 必要ツールの詳細は `docs/DEPLOY.md` を参照してください

動作確認。例: API デプロイ。
`terraform -version`
`aws --version`
`python3 --version`

## 1) WebUI をすぐ試す
### オンライン: GitHub Pages
- このリポジトリの公開URL: `https://uchimanajet7.github.io/scanforge/`
  - このURLはそのまま閲覧できます。
- fork で公開する場合は自分の Pages の URL を使用し、初回設定は下記 1.1 に従ってください。

### ローカル: ローカルサーバー
- カメラ機能は `file://` では動作しないことがあるため、`localhost` で起動して確認してください。

- 起動: `bash scripts/tools/web/start-local-web.sh`
- アクセス: `http://localhost:8000/`。既定ポートは `8000` です。ポートは `SWS_PORT` で変更できます。
- 備考: `start-local-web.sh` はキャッシュ更新のため `web/index.html` 内の `styles.css` と `app.js` の参照に `?v=` を付与します。初回は `web/index.html.original` を作成します。

操作の要点: 抜粋
- スキャン: カメラで QR / バーコードを読み取り、結果を履歴へ追加
- 生成: テキストから QR / バーコードを生成。例: Code 128/EAN-13/UPC-A/PDF417/Data Matrix。出力: PNG/SVG。

### 1.1 GitHub Pages: fork で公開する場合
- 対象: このリポジトリを fork した自分のリポジトリ等で、`web/` を GitHub Pages に公開したい場合。
- 手順:
  1. `.github/workflows/pages.yml` を有効のまま保持します。
  2. GitHub の Settings → Pages で Source を `GitHub Actions` に変更します。
  3. `main` へ push すると workflow が `web/` を artifact 化し、GitHub Pages へデプロイします。
- 参考: 公式ドキュメント: `https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site`

## 2) API を最短デプロイ
認証ラッパー `with_aws.sh` を経由して、対話でデプロイします。

- 対話: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`。推奨です。

- 固定プロファイル: `bash scripts/deploy/with_aws.sh --mode profile --profile <WORK_PROFILE> -- bash scripts/deploy/deploy.sh`

- スモーク: `bash scripts/deploy/smoke.sh`。デプロイ済みの状態で readiness → `/encode` → `/decode` を確認します。

## 3) 次の一歩: 任意
- 出力値の確認: `bash scripts/deploy/tf_outputs.sh`
- 破棄: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/destroy.sh --yes`。課金抑制のためです。
- 仕様: `docs/SPEC.md`
- バージョン運用: `docs/VERSIONS.md`
