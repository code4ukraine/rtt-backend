resource "aws_vpc" "dataprocessing" {
  cidr_block = var.vpc_cidr_block

  tags = {
    Name = "${var.env}-dataprocessing"
  }
}

# a 'public' subnet (with an IGW as a default route) to run our NAT gateway in
resource "aws_subnet" "dataprocessing-public" {
  availability_zone = var.availability_zones[0]
  cidr_block        = cidrsubnet(aws_vpc.dataprocessing.cidr_block, 8, length(var.availability_zones))
  vpc_id            = aws_vpc.dataprocessing.id

  tags = {
    Name = "dataprocessing-${var.availability_zones[0]}-public"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.dataprocessing.id
}

resource "aws_route_table" "dataprocessing-public" {
  vpc_id = aws_vpc.dataprocessing.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "dataprocessing-public-default"
  }
}

resource "aws_route_table_association" "dataprocessing-public" {
  route_table_id = aws_route_table.dataprocessing-public.id
  subnet_id      = aws_subnet.dataprocessing-public.id
}

# NAT gateway to allow private subnets to hit the internet (e.g. for google translate)
resource "aws_eip" "nat" {
  vpc = true
}

# TODO(fetep): should we run one-per-AZ?
resource "aws_nat_gateway" "gw" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.dataprocessing-public.id
}

# 'private' subnets (with a NAT gateway as a default route)
resource "aws_subnet" "dataprocessing" {
  count = length(var.availability_zones)

  availability_zone = var.availability_zones[count.index]
  cidr_block        = cidrsubnet(aws_vpc.dataprocessing.cidr_block, 8, count.index)
  vpc_id            = aws_vpc.dataprocessing.id

  tags = {
    Name = "dataprocessing-${var.availability_zones[count.index]}-private"
  }
}

resource "aws_route_table" "dataprocessing" {
  vpc_id = aws_vpc.dataprocessing.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.gw.id
  }

  tags = {
    Name = "dataprocessing-private-default"
  }
}

resource "aws_route_table_association" "dataprocessing" {
  count          = length(var.availability_zones)
  subnet_id      = element(aws_subnet.dataprocessing.*.id, count.index)
  route_table_id = aws_route_table.dataprocessing.id
}
