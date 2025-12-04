terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  function_name = "slack-hello-world-bot"
}

data "archive_file" "slack_bot" {
  type        = "zip"
  source_dir  = "${path.module}/../app/slack-bot"
  output_path = "${path.module}/build/slack-bot.zip"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "lambda_logs" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "logs" {
  name   = "${local.function_name}-logs"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_logs.json
}

resource "aws_lambda_function" "slack_bot" {
  function_name = local.function_name
  role          = aws_iam_role.lambda.arn
  handler       = "lambda.handler"
  runtime       = "nodejs18.x"
  filename      = data.archive_file.slack_bot.output_path

  timeout = 10

  source_code_hash = data.archive_file.slack_bot.output_base64sha256

  environment {
    variables = {
      SLACK_BOT_TOKEN       = var.slack_bot_token
      SLACK_SIGNING_SECRET  = var.slack_signing_secret
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }
}

resource "aws_lambda_function_url" "slack_bot" {
  function_name      = aws_lambda_function.slack_bot.arn
  authorization_type = "NONE"
  invoke_mode        = "BUFFERED"
}

resource "aws_lambda_permission" "allow_public_invoke" {
  statement_id        = "AllowFunctionUrlInvoke"
  action              = "lambda:InvokeFunctionUrl"
  function_name       = aws_lambda_function.slack_bot.function_name
  principal           = "*"
  function_url_auth_type = aws_lambda_function_url.slack_bot.authorization_type
}

output "function_url" {
  description = "Public URL Slack should call for events."
  value       = aws_lambda_function_url.slack_bot.function_url
}
