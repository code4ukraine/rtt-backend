locals {
  dataprocessing-lambda-timeout = 900
}

module "lambda-dataprocessing" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "2.34.1"

  description            = "Process uploaded data"
  function_name          = "${var.env}-dataprocessing"
  handler                = "lambda.handler"
  maximum_retry_attempts = 0
  publish                = true
  runtime                = "nodejs14.x"
  timeout                = local.dataprocessing-lambda-timeout

  vpc_subnet_ids         = aws_subnet.dataprocessing.*.id
  vpc_security_group_ids = [aws_security_group.dataprocessing-lambda.id]
  attach_network_policy  = true

  source_path = "../../src"

  attach_policy = true
  policy        = aws_iam_policy.lambda-dataprocessing.arn

  environment_variables = {
    DYNAMO_REVIEWED_TABLE = var.dynamo_reviewed_table
    DYNAMO_UPLOADS_TABLE  = var.dynamo_uploads_table
    GOOGLE_SECRETS_ARN    = var.google_secrets_arn
    GOOGLE_SHEET_ID       = var.google_sheet_id
    GOOGLE_TRANSLATE_KEY  = var.google_translate_key
    LAMBDA_ENV            = var.env
    S3_WEB_BUCKET_NAME    = var.s3_web_bucket_name
    TRANSLATIONS_REDIS    = module.translations-redis.endpoint
  }
}

resource "aws_security_group" "dataprocessing-lambda" {
  name   = "${var.env}-dataprocessing-lambda"
  vpc_id = aws_vpc.dataprocessing.id
}

# allow all outbound https
resource "aws_security_group_rule" "dataprocessing-lambda-egress-https" {
  security_group_id = aws_security_group.dataprocessing-lambda.id
  type              = "egress"

  cidr_blocks = ["0.0.0.0/0"]
  protocol    = "tcp"
  from_port   = 443
  to_port     = 443
}

# allow outbound redis to our VPC
resource "aws_security_group_rule" "dataprocessing-lambda-egress-redis" {
  security_group_id = aws_security_group.dataprocessing-lambda.id
  type              = "egress"

  cidr_blocks = [aws_vpc.dataprocessing.cidr_block]
  protocol    = "tcp"
  from_port   = 6379
  to_port     = 6379
}

resource "aws_iam_policy" "lambda-dataprocessing" {
  name   = "${var.env}-lambda-dataprocessing-policy"
  policy = data.aws_iam_policy_document.lambda-dataprocessing.json
}

data "aws_iam_policy_document" "lambda-dataprocessing" {
  statement {
    sid    = "DataReviewed"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Scan"
    ]
    resources = ["${local.dynamo_arn_prefix}${var.dynamo_reviewed_table}"]
  }

  statement {
    sid    = "DataUpload"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:Scan"
    ]
    resources = ["${local.dynamo_arn_prefix}${var.dynamo_uploads_table}"]
  }

  statement {
    sid    = "DataJanesS3Read"
    effect = "Allow"
    actions = [
      "s3:GetObject"
    ]
    resources = ["arn:aws:s3:::${var.s3_janes_bucket_name}/janes/ofm_orbats.csv"]
  }

  statement {
    sid    = "DataS3Update"
    effect = "Allow"
    actions = [
      "s3:PutObject"
    ]
    resources = ["arn:aws:s3:::${var.s3_web_bucket_name}/data/*"]
  }

  statement {
    sid    = "Metrics"
    effect = "Allow"
    actions = [
      "cloudwatch:PutMetricData"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ConsumeSqs"
    effect = "Allow"
    actions = [
      "sqs:ChangeMessageVisibility",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage"
    ]
    resources = [aws_sqs_queue.trigger.arn]
  }

  statement {
    sid       = "LambdaSecrets"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.google_secrets_arn]
  }
}
