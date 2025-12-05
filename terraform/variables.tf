variable "region" {
  description = "AWS region for the Slack bot Lambda."
  type        = string
  default     = "us-west-2"
}

variable "slack_bot_token" {
  description = "Slack bot token (xoxb-...)."
  type        = string
  sensitive   = true
}

variable "slack_signing_secret" {
  description = "Slack signing secret for verifying requests."
  type        = string
  sensitive   = true
}

variable "bedrock_model_id" {
  description = "Bedrock model ID to invoke for Slack responses (for example, amazon.titan-text-lite-v1)."
  type        = string
  default     = "amazon.titan-text-lite-v1"
}
