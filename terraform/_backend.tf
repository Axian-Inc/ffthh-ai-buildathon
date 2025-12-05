terraform {
  backend "s3" {
    bucket         = "ffthh-ai-build-tf-state"
    key            = "envs/tkh/terraform.tfstate"
    region         = "us-west-2"
    use_lockfile   = true
    encrypt        = true
  }
}
