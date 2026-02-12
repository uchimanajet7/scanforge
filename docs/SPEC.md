# ScanForge 仕様書: 現行実装

## ドキュメント情報
- 作成日: 2025-10-15
- 最終更新: 2026-01-09
- 本書の目的: 現行実装の仕様を説明する

## 表記方針
- 括弧による補助注記は使わず本文に統合する

関連ドキュメント: 役割別
- 入口: 最短導線。 `README.md`
- はじめに: 最短手順。 `docs/GETTING_STARTED.md`
- デプロイ手順: `docs/DEPLOY.md`
- バージョン運用: `docs/VERSIONS.md`

---

## 1. 概要
ScanForge は、バーコード/QR の **読み取り** と **生成** を提供します。構成: 静的 WebUI `web/` + AWS Lambda API `lambda/`。

本書では、次を現行実装に合わせて定義します。
- WebUI のユーザー向け挙動: スキャン / 生成 / 履歴
- API の入出力仕様: `/encode` / `/decode`
- デプロイ構成の事実: Terraform / Function URL

---

## 2. システム構成: 現行

### 2.1 WebUI: `web/`
- 配信: 静的ホスティング。例: GitHub Pages。
- エントリ: `web/index.html` + `web/app.js`: ES Modules
- テーマ: ライト固定。
- OGP: `web/index.html` のメタで `ogp.png` を参照する
- タブ: 「スキャン」「生成」。履歴はスキャン画面内に常時表示。
- 主な機能:
  - カメラでのリアルタイムスキャン
  - 画像ファイルのスキャン: アップロード/キュー
  - テキストからバーコード/QR の生成: SVG/PNG
  - 生成結果のロゴ合成: QR を対象
  - 履歴: 最大 100 件の保存/コピー/書き出し

### 2.2 API: `lambda/`
- 実体: `lambda/handler.py`
- ランタイム: Python 3.13
- 公開: Lambda Function URL。認証: NONE
- I/F: `POST /encode`, `POST /decode`。レスポンスは JSON

### 2.3 IaC: `infra/terraform/`
- Terraform で Lambda / 依存レイヤー / エイリアス / Function URL / Logs を作成
- 入口: 推奨。 `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`

---

## 3. WebUI 仕様: ユーザー視点

### 3.1 共通
- 操作結果は画面上のフィードバックで明確に提示する。成功/失敗、メッセージ/トースト等を含む。
- 履歴は `localStorage` に保存し、リロード後も復元する。最大 100 件。

### 3.2 スキャン: カメラ
- 「カメラを開始」でカメラを起動し、検出結果を「最新の検出結果」と「検出履歴」へ反映する。
- 対応ブラウザでは `BarcodeDetector` を優先し、未対応時は ZXing をフォールバックとして用いる。
- 検出モード、対象フォーマットなどの設定は画面内の「バーコード設定」領域で行う。

### 3.3 スキャン: 画像ファイル
- スキャン画面の「画像をスキャン」から画像を追加し、キューとして順次解析する。
- 入力はクリック選択/ドラッグ&ドロップで受け付ける。
- 対応形式は PNG / JPEG / WebP / SVG。
- 1ファイルの上限は 10MB。
- 進捗・失敗・再試行・処理を中止・すべてを削除などの操作を UI から実施できる。

### 3.4 履歴: 仕様
- 最新 100 件を保存し、最新順で表示する。
- 各アイテムは「フォーマット」「内容」「ソース」「時刻」を表示し、内容はワンクリックでコピーできる。
- 書き出しとクリアができる。

### 3.5 生成
- 入力テキストを元にバーコード/QR を生成できる。
- 現行 UI のフォーマット選択肢: QR Code / Code 128 / EAN-13 / UPC-A / PDF417 / Data Matrix
- EAN-13 は European Article Number の 13 桁シンボルで、日本では Japanese Article Number と呼ばれる。
- 出力は SVG / PNG を選択できる。
- 読みやすいテキストの付与、背景透過、サイズ調整などの描画オプションを提供する。

### 3.6 ロゴ合成: QR
- 生成画面でロゴ画像をアップロードし、QR へ合成して出力できる。
- 対応形式は PNG / SVG。1ファイルのみ。上限 2MB。
- ロゴの色抽出/優先度等の設定を提供する。
- ロゴ色を適用する場合は背景が白固定になり、透過設定は無視される。

---

## 4. API 仕様: Lambda Function URL / ローカル API 共通

### 4.1 共通
- Content-Type は application/json。要求と応答の両方で同じ。
- 文字コードは Unicode Transformation Format 8 ビット。
- ベース URL:
  - 本番: Terraform の `function_url`。例: `https://<id>.lambda-url.<region>.on.aws/`
  - ローカル: `http://127.0.0.1:8001`。起動: `bash scripts/tools/api/start-local-api.sh`

レスポンスの基本形
- 成功: Hypertext Transfer Protocol の状態コードは 200、応答本文は JavaScript Object Notation。
- 失敗: Hypertext Transfer Protocol の状態コードは四百台または五百台、応答本文は JavaScript Object Notation。
  - 例: `{"message":"<code>","details":"<optional>"}`

### 4.2 `POST /encode`

#### リクエスト: JSON
```json
{
  "text": "SCANFORGE",
  "format": "qrcode",
  "output": "svg"
}
```

フィールド
- `text`: 必須, string。生成する内容。
- `format`: 任意, string。`qrcode` / `code128`
  - `qrcode` の同義語として `qr`, `qr_code` を受理する
- `output`: 任意, string。`png` / `svg`

#### レスポンス: 成功
- `output=svg`
```json
{
  "format": "svg",
  "content": "<?xml version=\"1.0\" ...>...</svg>"
}
```
- `output=png`
```json
{
  "format": "png",
  "contentBase64": "iVBORw0KGgo..."
}
```

#### エラー
- `400 {"message":"text is required"}`
- `400 {"message":"unsupported_format","details":"<format>"}`
- `400 {"message":"unsupported_output","details":"<output>"}`

### 4.3 `POST /decode`

#### リクエスト: JSON
入力は `barcodeData` または `barcodeUrl` のどちらかが必須です。両方が指定された場合は `barcodeData` を優先します。

```json
{
  "barcodeData": "data:image/png;base64,iVBORw0KGgo...",
  "barcodeFormat": "png"
}
```

フィールド
- `barcodeData`: 任意, string。画像の base64 文字列、または data URL。
  - data URL の場合は `data:<mime>;base64,<...>` の形式を推奨
- `barcodeUrl`: 任意, string。画像の URL。https のみ。
- `barcodeFormat`: 任意, string。`svg|png|jpeg|jpg|webp`。`jpg` は `jpeg` として扱う
  - 指定がない場合は Content-Type / 先頭タグ等から判定する

#### 制約: `barcodeUrl`
- `https` のみ許可。`http`/`file` などは拒否。
- リダイレクトは最大 3 回まで
- プライベート IP / 特殊アドレス宛ては拒否。SSRF 対策。
- Content-Type は以下のみ許可: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`
- 取得サイズ上限: `MAX_IMAGE_BYTES`。既定 3MB。

#### レスポンス: 成功
```json
{
  "results": [
    { "format": "qrcode", "text": "SCANFORGE" }
  ]
}
```

#### エラー: 代表
- `400 {"message":"barcodeUrl or barcodeData is required"}`
- `400 {"message":"bad_barcode_data","details":"..."}`
- `400 {"message":"bad_barcode_url","details":"..."}`
- `400 {"message":"failed_to_fetch_image","details":"..."}`
- `400 {"message":"unsupported_format","details":"..."}`
- `413 {"message":"payload_too_large","details":"..."}`
- `500 {"message":"decode_engine_unavailable","details":"..."}`
- `500 {"message":"decode_failed","details":"..."}`

---

## 5. デプロイ仕様: 要点

### 5.1 デプロイの入口
- 推奨: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`
- 詳細手順: `docs/DEPLOY.md`

### 5.2 CORS: Function URL
Terraform の `cors_allow_origins` で許可オリジンを制御する。既定: `["*"]`。
詳細は `infra/terraform/main.tf` と `infra/terraform/README.md` を参照する。
