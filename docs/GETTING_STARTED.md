# はじめに（Getting Started）

最短 2–3 ステップで WebUI の試用と API デプロイを開始できます。詳細は `docs/DEPLOY.md` を参照してください。

## 前提（準備物）
- macOS / Linux 環境（WSL 含む）
- Terraform 1.5+ / AWS CLI v2 / Python 3.13 + pip
- AWS プロファイル、または AssumeRole 可能な認証手段

動作確認（例）
`terraform -version`
`aws --version`
`python3 --version`

## 1) WebUI をすぐ試す
### オンライン（GitHub Pages）
- 公開URL: `https://uchimanajet7.github.io/scanforge/`
  - 備考: 初回のみ、リポジトリ設定で Pages を有効化する必要があります（手順は下記 1.1 参照）。

### ローカル（推奨: ローカルサーバー）
カメラ機能は `file://` では動作しないことがあるため、`localhost` で起動して確認してください。

- 起動: `bash scripts/tools/web/start-local-web.sh`
- アクセス: `http://localhost:8000/`（既定。ポートは `SWS_PORT` で変更可能）

操作の要点（抜粋）
- スキャン: カメラで QR / バーコードを読み取り、結果を履歴へ追加
- 生成: テキストから QR / バーコードを生成（Code 128/EAN-13/UPC-A/PDF417/Data Matrix など、PNG/SVG）

### 1.1 GitHub Pages（Actions）初回有効化（必須: 一度だけ）
- 背景: GitHub Actions の Pages ワークフローは、既に Pages が有効なリポジトリ向けです。未有効の状態で「自動有効化」を GITHUB_TOKEN で行うと、権限仕様上 403 となる場合があります。
- 手順（UI/設定）
  1) GitHub → 対象リポジトリ → Settings → Pages
  2) Build and deployment → Source: 「GitHub Actions」を選択 → Save
  3) 以後、`.github/workflows/pages.yml` により `web/` が自動公開されます
- 参考（公式）: `https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages`

## 2) API を最短デプロイ
認証ラッパー `with_aws.sh` を経由して、対話でデプロイします。

- 対話（推奨）
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`

- 固定プロファイル
`bash scripts/deploy/with_aws.sh --mode profile --profile <WORK_PROFILE> -- bash scripts/deploy/deploy.sh`

- スモーク（Function URL の readiness → /encode → /decode）
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/smoke.sh`

## 3) 次の一歩（任意）
- 出力値の確認: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/tf_outputs.sh`
- 破棄（課金抑制）: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/destroy.sh --yes`
- 仕様: `docs/SPEC.md`
- バージョン運用: `docs/VERSIONS.md`
