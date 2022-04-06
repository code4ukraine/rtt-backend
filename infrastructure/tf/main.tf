terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket = "rtt-tf-state"
    key    = "tfstate-dataprocessing"
    region = "us-east-2"
  }
}

provider "aws" {
  region = "us-east-2"

  default_tags {
    tags = {
      env  = var.env
      repo = "dataprocessing"
    }
  }
}

module "data" {
  source = "./data"

  dynamo_reviewed_table = "${var.env}-reviewed-uploads"
  dynamo_uploads_table  = "${var.env}-user-uploads"
  env                   = var.env
  google_secrets_arn    = var.google_secrets_arn
  google_sheet_id       = var.google_sheet_id
  google_translate_key  = var.google_translate_key
  s3_janes_bucket_name  = var.s3_janes_bucket_name
  s3_web_bucket_name    = var.s3_web_bucket_name
  vpc_cidr_block        = var.vpc_cidr_block
}
