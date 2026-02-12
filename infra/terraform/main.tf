locals {
  function_log_name = "/aws/lambda/${var.function_name}"
  has_layer_zip     = var.layer_zip_path != ""
  layer_arn = var.existing_layer_arn != "" ? var.existing_layer_arn : (
    local.has_layer_zip ? aws_lambda_layer_version.deps[0].arn : ""
  )
}

data "aws_partition" "current" {}
data "aws_caller_identity" "current" {}

# Lambda コードを zip 化
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda"
  output_path = "${path.module}/build/lambda.zip"
}

# 依存レイヤー。指定がある場合のみ作成する
resource "aws_lambda_layer_version" "deps" {
  count                    = local.has_layer_zip && var.existing_layer_arn == "" ? 1 : 0
  layer_name               = "${var.function_name}-deps"
  filename                 = "${path.module}/${var.layer_zip_path}"
  compatible_runtimes      = ["python3.13"]
  compatible_architectures = [var.architecture]
  description              = "ScanForge dependencies layer"
}

# IAMロール。基本ログのみ
resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "basic_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "fn" {
  name              = local.function_log_name
  retention_in_days = var.log_retention_days
}

# Lambda 本体
resource "aws_lambda_function" "api" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn
  runtime       = "python3.13"
  handler       = "handler.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  publish          = true

  timeout       = var.lambda_timeout_seconds
  memory_size   = var.lambda_memory_mb
  layers        = local.layer_arn == "" ? [] : [local.layer_arn]
  architectures = [var.architecture]

  ephemeral_storage {
    size = var.lambda_tmp_mb
  }

  dynamic "snap_start" {
    for_each = var.enable_snapstart ? [1] : []
    content {
      apply_on = "PublishedVersions"
    }
  }
}

# 公開用エイリアス
resource "aws_lambda_alias" "prod" {
  name             = var.alias_name
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
}

# Function URL。認証なし。CORS は var.cors_allow_origins で指定する
resource "aws_lambda_function_url" "url" {
  function_name      = aws_lambda_function.api.function_name
  qualifier          = aws_lambda_alias.prod.name
  authorization_type = "NONE"

  cors {
    allow_origins     = var.cors_allow_origins
    allow_methods     = ["POST"]
    allow_headers     = ["Content-Type", "Origin"]
    allow_credentials = false
    max_age           = 600
  }
}
