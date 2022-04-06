# EventBridge periodically generates an event to an SNS topic
# SQS queue subscribed to SNS topic
# SQS queue messages trigger the dataprocessing lambda

# create SNS topic
resource "aws_sns_topic" "trigger" {
  name = "${var.env}-dataprocessing-trigger"
}

resource "aws_sns_topic_policy" "trigger" {
  arn    = aws_sns_topic.trigger.arn
  policy = data.aws_iam_policy_document.sns-trigger.json
}

data "aws_iam_policy_document" "sns-trigger" {
  statement {
    sid    = "EventBridgeToSNS"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    actions = ["sns:Publish"]

    resources = [aws_sns_topic.trigger.arn]
  }
}

# create SQS queue & policy to allow SNS->SQS
resource "aws_sqs_queue" "trigger" {
  name                       = "${var.env}-dataprocessing-trigger"
  visibility_timeout_seconds = local.dataprocessing-lambda-timeout
}

resource "aws_sqs_queue_policy" "trigger" {
  queue_url = aws_sqs_queue.trigger.id
  policy    = data.aws_iam_policy_document.sqs-trigger.json
}

data "aws_iam_policy_document" "sqs-trigger" {
  statement {
    sid    = "SNStoSQS"
    effect = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["sqs:SendMessage"]

    resources = [aws_sqs_queue.trigger.arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.trigger.arn]
    }
  }
}

# run lambda when the SQS queue gets a message
resource "aws_lambda_event_source_mapping" "trigger" {
  batch_size       = 1 # only run one dataprocessing job at a time
  enabled          = true
  event_source_arn = aws_sqs_queue.trigger.arn
  function_name    = module.lambda-dataprocessing.lambda_function_name
  depends_on       = [aws_iam_policy.lambda-dataprocessing]
}

# subscribe SQS queue to the SNS trigger topic
resource "aws_sns_topic_subscription" "trigger" {
  endpoint             = aws_sqs_queue.trigger.arn
  protocol             = "sqs"
  topic_arn            = aws_sns_topic.trigger.arn
  raw_message_delivery = true
}

# generate an event every 15 minutes and send to SNS
resource "aws_cloudwatch_event_rule" "trigger" {
  name                = "${var.env}-dataprocessing-trigger"
  schedule_expression = "rate(15 minutes)"
}

resource "aws_cloudwatch_event_target" "trigger-sns" {
  arn       = aws_sns_topic.trigger.arn
  rule      = aws_cloudwatch_event_rule.trigger.name
  target_id = "SendToSNS"
}
