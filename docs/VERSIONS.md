# バージョン運用ポリシーとアップグレード手順

このプロダクトのツール/ライブラリのバージョン方針と、アップグレード手順をまとめます。対象は「開発者が自身の AWS アカウントにデプロイして使う」ユースケースです。

## 方針: 要点
- 互換性: 破壊的変更を許容する。変更時は影響範囲を明記し、合意してから反映する。
- 安定性: Lambda ランタイムは Python 3.13 を既定。SnapStart 対応を優先。
- アーキテクチャ: 既定は `x86_64`。依存 wheel の入手性を優先。`arm64` を使う場合はレイヤーを同アーキで再構築する。
- ピン留め: Lambda 依存は `lambda/requirements.txt` に明示ピン留め。Web は `web/index.html` の CDN バージョンを固定し、ZXing 読み込みは `web/modules/scanner/detector/zxing/loader.js` で `@latest` を使用。
- GitHub Actions: Node.js 24 対応の公開版を優先して使う。現時点では `actions/checkout@v6` と `hashicorp/setup-terraform@v4` を使い、GitHub Pages は公式の `configure-pages` `upload-pages-artifact` `deploy-pages` 構成を維持する。
- 監視: Dependabot で GitHub Actions の更新を週次確認する。

## 現在の固定/推奨バージョン: 取得基準
- Lambda ランタイム: Python 3.13
- アーキテクチャ: x86_64
- Terraform: 1.5+。
- Terraform Provider: `infra/terraform/versions.tf` と `infra/terraform/.terraform.lock.hcl` に従う
- GitHub Actions のチェックアウト: `actions/checkout@v6`
- GitHub Actions の Terraform セットアップ: `hashicorp/setup-terraform@v4`
- GitHub Pages 公開: `actions/configure-pages@v5` `actions/upload-pages-artifact@v4` `actions/deploy-pages@v4`

## アップグレードの基本手順: 共通
1) 変更対象を決める。例: Pillow / zxing-cpp / Web CDN / Provider など。
2) 変更前に `bash scripts/tools/check_versions.sh` を実行してローカルのツールバージョンを確認。
3) `bash scripts/tools/check_updates.sh` で最新との差分を確認します。このコマンドはネットワークが必要です。
4) 該当手順に従ってファイルを更新。
5) Terraform の差分確認 → 適用。
6) `bash scripts/deploy/smoke.sh` で動作確認。

## Pillow
注: `bash scripts/deploy/build_layer.sh` は pip で依存を取得するためネットワークが必要です。
- 対象: `lambda/requirements.txt`
- 更新後: 依存レイヤーを再生成し、Terraform を再適用します。
  - レイヤー再生成: `bash scripts/deploy/build_layer.sh --arch x86_64`

## numpy
- 対象: `lambda/requirements.txt`
- 更新後: `bash scripts/deploy/build_layer.sh --arch x86_64`

## zxing-cpp
- 対象: `lambda/requirements.txt`
- 注意: アーキテクチャと manylinux wheel の対応を必ず確認してください。
- 更新後: `bash scripts/deploy/build_layer.sh --arch x86_64`

## segno
- 対象: `lambda/requirements.txt`
- 更新後: `bash scripts/deploy/build_layer.sh --arch x86_64`

## python-barcode
- 対象: `lambda/requirements.txt`
- 更新後: `bash scripts/deploy/build_layer.sh --arch x86_64`

## requests
- 対象: `lambda/requirements.txt`
- 更新後: `bash scripts/deploy/build_layer.sh --arch x86_64`

## ZXing-JS
- 対象: `web/index.html` の `@zxing/library@<version>` と `web/modules/scanner/detector/zxing/loader.js` の `@latest`
- 更新後: WebUI の読み取りが期待通り動作するか手動確認してください。

## bwip-js
- 対象: `web/index.html`。`bwip-js@<version>`
- 更新後: WebUI の生成が期待通り動作するか手動確認してください。

## Terraform CLI
- 取得方法: `terraform -version`
- 更新後: `bash scripts/tools/fmt_terraform.sh --validate` を実行し、`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/tf_plan.sh` で差分を確認してください。
- GitHub Actions 上の Terraform CLI は `hashicorp/setup-terraform@v4` で導入します。

## GitHub Actions
- 対象: `.github/workflows/ci.yml` と `.github/workflows/pages.yml`
- 更新方針:
  1) Node.js 24 対応の公式 action を優先採用する。現時点では `actions/checkout@v6` と `hashicorp/setup-terraform@v4` を使う。
  2) GitHub Pages は公式 workflow を維持し、`configure-pages` `upload-pages-artifact` `deploy-pages` の更新は Dependabot で追跡する。
  3) 未対応 action の公式な Node.js 24 対応版が公開されたら、その時点で採用する。

## Dependabot
- 管理ファイル: `.github/dependabot.yml`
- 監視対象:
  - GitHub Actions: `/`
- 運用: 週次で更新候補の Pull Request を確認し、必要な変更だけをレビューして取り込む。

## Terraform AWS Provider
- 管理: `infra/terraform/.terraform.lock.hcl`: ロックファイル。`infra/terraform/versions.tf`: バージョン範囲。
- 更新: `bash scripts/tools/upgrade_terraform_providers.sh`
- 更新後: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/tf_plan.sh` → `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/tf_apply.sh`

## Terraform Archive Provider
- 管理/更新は AWS Provider と同様です。

## AWS Lambda Python runtime
- 指定箇所: `infra/terraform/main.tf`
- 新ランタイムへ更新する場合:
  1) AWS 公式ドキュメントで SnapStart 対応状況とサポート期限を確認
  2) `runtime` を更新
  3) 依存レイヤーを同 ABI で再構築。例: cp313。
  4) `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/tf_apply.sh` → `bash scripts/deploy/smoke.sh` で確認

## 開発環境ツール
`bash scripts/tools/check_updates.sh` は以下のローカルコマンドの現行値も収集し、最新リリースとの差分を提示します。
- `aws`: AWS CLI v2
- `python3`
- `pip`
- `zip`
- `curl`
- `jq`
