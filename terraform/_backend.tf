terraform {
  backend "s3" {
    bucket         = "ffthh-ai-build-tf-state"
    key            = "envs/gjh/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "ffthh-ai-buildathon-tf-lock"
    encrypt        = true
  }
}