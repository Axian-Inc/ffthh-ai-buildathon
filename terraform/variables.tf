variable "aws_region" {
  description = "AWS region to deploy resources into."
  type        = string
  default     = "us-west-2"
}

variable "bedrock_model_id" {
  description = "Bedrock model ID to invoke."
  type        = string
  default     = "us.anthropic.claude-3-sonnet-20240229-v1:0"
}

variable "bedrock_max_tokens" {
  description = "Maximum tokens to request from Bedrock model."
  type        = number
  default     = 256
}
