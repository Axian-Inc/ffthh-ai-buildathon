output "http_api_invoke_url" {
  description = "Invoke URL for the HTTP API."
  value       = "${aws_apigatewayv2_api.http_api.api_endpoint}/"
}

output "lambda_function_name" {
  description = "Name of the deployed Lambda function."
  value       = aws_lambda_function.echo.function_name
}
