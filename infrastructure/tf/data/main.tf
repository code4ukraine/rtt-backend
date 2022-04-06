terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  dynamo_arn_prefix = "arn:aws:dynamodb:us-east-2:${data.aws_caller_identity.current.account_id}:table/"
}
