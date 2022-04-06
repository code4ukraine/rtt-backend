variable "availability_zones" {
  type = list(string)

  default = [
    "us-east-2a",
    "us-east-2b",
  ]
}

variable "dynamo_reviewed_table" {
  type = string
}

variable "dynamo_uploads_table" {
  type = string
}

variable "env" {
  type = string
}

variable "google_secrets_arn" {
  type = string
}

variable "google_sheet_id" {
  type = string
}

variable "google_translate_key" {
  type = string
}

variable "s3_janes_bucket_name" {
  type = string
}

variable "s3_web_bucket_name" {
  type = string
}

variable "vpc_cidr_block" {
  type = string
}
