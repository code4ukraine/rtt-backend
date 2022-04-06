# stand up a single-node redis to act as a translations cache to avoid
# excessive google translate API calls.
# single node/no replication is ok here; the data is easily repopulated
# with API calls.

module "translations-redis" {
  source  = "cloudposse/elasticache-redis/aws"
  version = "0.42.0"

  allowed_security_group_ids = [aws_security_group.dataprocessing-lambda.id]
  apply_immediately          = true
  automatic_failover_enabled = true
  availability_zones         = var.availability_zones
  cluster_size               = length(var.availability_zones)
  engine_version             = "6.x"
  family                     = "redis6.x"
  instance_type              = "cache.t4g.small"
  namespace                  = "${var.env}-translations"
  subnets                    = aws_subnet.dataprocessing.*.id
  vpc_id                     = aws_vpc.dataprocessing.id
}
