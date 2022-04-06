resource "aws_cloudwatch_dashboard" "dataprocessing" {
  dashboard_name = "${var.env}-dataprocessing"

  dashboard_body = templatefile("${path.module}/dashboard.tftpl", { env = var.env })
}
