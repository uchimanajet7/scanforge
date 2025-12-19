variable "aws_region" {
  description = "AWSリージョン"
  type        = string
}

variable "function_name" {
  description = "Lambda関数名"
  type        = string
  default     = "scanforge-api"
}

variable "alias_name" {
  description = "Function URL に紐付けるエイリアス名（SnapStart は公開版で有効）"
  type        = string
  default     = "prod"
}

variable "architecture" {
  description = "Lambda アーキテクチャ（arm64|x86_64。既定 x86_64）"
  type        = string
  default     = "x86_64"
  validation {
    condition     = contains(["arm64", "x86_64"], var.architecture)
    error_message = "architecture は arm64 か x86_64 を指定してください。"
  }
}

variable "lambda_timeout_seconds" {
  description = "Lambda タイムアウト（秒）"
  type        = number
  default     = 10
}

variable "lambda_memory_mb" {
  description = "Lambda メモリ（MB）"
  type        = number
  default     = 512
}

variable "lambda_tmp_mb" {
  description = "/tmp サイズ（MB, SnapStart は 512MB 超と非互換）"
  type        = number
  default     = 512
}

variable "log_retention_days" {
  description = "CloudWatch Logs の保持日数"
  type        = number
  default     = 14
}

variable "enable_snapstart" {
  description = "SnapStart を有効化するか（PublishedVersions）"
  type        = bool
  default     = true
}

variable "cors_allow_origins" {
  description = "Function URL の CORS 許可オリジン"
  type        = list(string)
  default     = ["*"]
}

variable "layer_zip_path" {
  description = "依存レイヤー zip のローカルパス。existing_layer_arn 未指定時に使用。"
  type        = string
  default     = ""
}

variable "existing_layer_arn" {
  description = "既存の依存レイヤー ARN。指定時は新規作成せずこれを使用。"
  type        = string
  default     = ""
}
