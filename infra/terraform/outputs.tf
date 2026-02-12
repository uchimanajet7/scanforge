output "function_url" {
  description = "Lambda Function URL。エイリアスに紐付けます。"
  value       = aws_lambda_function_url.url.function_url
}

output "function_arn" {
  description = "Lambda 関数 ARN"
  value       = aws_lambda_function.api.arn
}

output "alias_arn" {
  description = "Lambda エイリアス ARN"
  value       = aws_lambda_alias.prod.arn
}

output "layer_arn" {
  description = "使用中の依存レイヤー ARN。未設定時は空文字。"
  value       = local.layer_arn
}
