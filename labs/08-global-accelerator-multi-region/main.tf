terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  alias  = "primary"
  region = var.primary_region
  default_tags {
    tags = {
      Project     = "CloudNetworkMastery"
      Lab         = "08-global-accelerator-multi-region"
      Environment = var.environment
      RegionRole  = "Primary-Singapore"
      ManagedBy   = "Terraform"
    }
  }
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
  default_tags {
    tags = {
      Project     = "CloudNetworkMastery"
      Lab         = "08-global-accelerator-multi-region"
      Environment = var.environment
      RegionRole  = "Secondary-Jakarta"
      ManagedBy   = "Terraform"
    }
  }
}

# ==============================================================================
# 1. PRIMARY REGION INFRASTRUCTURE (Singapore - ap-southeast-1)
# ==============================================================================

resource "aws_vpc" "primary_vpc" {
  provider             = aws.primary
  cidr_block           = var.primary_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "vpc-primary-singapore"
  }
}

resource "aws_internet_gateway" "primary_igw" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary_vpc.id

  tags = {
    Name = "igw-primary-singapore"
  }
}

resource "aws_subnet" "primary_public_1" {
  provider          = aws.primary
  vpc_id            = aws_vpc.primary_vpc.id
  cidr_block        = "10.100.1.0/24"
  availability_zone = "${var.primary_region}a"

  tags = {
    Name = "subnet-primary-public-az1"
  }
}

resource "aws_subnet" "primary_public_2" {
  provider          = aws.primary
  vpc_id            = aws_vpc.primary_vpc.id
  cidr_block        = "10.100.2.0/24"
  availability_zone = "${var.primary_region}b"

  tags = {
    Name = "subnet-primary-public-az2"
  }
}

resource "aws_route_table" "primary_public_rt" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.primary_igw.id
  }

  tags = {
    Name = "rt-primary-public"
  }
}

resource "aws_route_table_association" "primary_pub_1_assoc" {
  provider       = aws.primary
  subnet_id      = aws_subnet.primary_public_1.id
  route_table_id = aws_route_table.primary_public_rt.id
}

resource "aws_route_table_association" "primary_pub_2_assoc" {
  provider       = aws.primary
  subnet_id      = aws_subnet.primary_public_2.id
  route_table_id = aws_route_table.primary_public_rt.id
}

# Primary Region NLB
resource "aws_lb" "primary_nlb" {
  provider           = aws.primary
  name               = "nlb-fintech-primary"
  internal           = false
  load_balancer_type = "network"
  subnets            = [aws_subnet.primary_public_1.id, aws_subnet.primary_public_2.id]

  enable_cross_zone_load_balancing = true

  tags = {
    Name = "nlb-primary-singapore"
  }
}

resource "aws_lb_target_group" "primary_tg" {
  provider    = aws.primary
  name        = "tg-primary-fintech-tls"
  port        = 443
  protocol    = "TCP"
  vpc_id      = aws_vpc.primary_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    protocol            = "TCP"
    port                = "443"
    interval            = 10
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = {
    Name = "tg-primary-fintech"
  }
}

resource "aws_lb_listener" "primary_listener" {
  provider          = aws.primary
  load_balancer_arn = aws_lb.primary_nlb.arn
  port              = 443
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.primary_tg.arn
  }
}

# ==============================================================================
# 2. SECONDARY REGION INFRASTRUCTURE (Jakarta - ap-southeast-3)
# ==============================================================================

resource "aws_vpc" "secondary_vpc" {
  provider             = aws.secondary
  cidr_block           = var.secondary_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "vpc-secondary-jakarta"
  }
}

resource "aws_internet_gateway" "secondary_igw" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary_vpc.id

  tags = {
    Name = "igw-secondary-jakarta"
  }
}

resource "aws_subnet" "secondary_public_1" {
  provider          = aws.secondary
  vpc_id            = aws_vpc.secondary_vpc.id
  cidr_block        = "10.104.1.0/24"
  availability_zone = "${var.secondary_region}a"

  tags = {
    Name = "subnet-secondary-public-az1"
  }
}

resource "aws_subnet" "secondary_public_2" {
  provider          = aws.secondary
  vpc_id            = aws_vpc.secondary_vpc.id
  cidr_block        = "10.104.2.0/24"
  availability_zone = "${var.secondary_region}b"

  tags = {
    Name = "subnet-secondary-public-az2"
  }
}

resource "aws_route_table" "secondary_public_rt" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.secondary_igw.id
  }

  tags = {
    Name = "rt-secondary-public"
  }
}

resource "aws_route_table_association" "secondary_pub_1_assoc" {
  provider       = aws.secondary
  subnet_id      = aws_subnet.secondary_public_1.id
  route_table_id = aws_route_table.secondary_public_rt.id
}

resource "aws_route_table_association" "secondary_pub_2_assoc" {
  provider       = aws.secondary
  subnet_id      = aws_subnet.secondary_public_2.id
  route_table_id = aws_route_table.secondary_public_rt.id
}

# Secondary Region NLB
resource "aws_lb" "secondary_nlb" {
  provider           = aws.secondary
  name               = "nlb-fintech-secondary"
  internal           = false
  load_balancer_type = "network"
  subnets            = [aws_subnet.secondary_public_1.id, aws_subnet.secondary_public_2.id]

  enable_cross_zone_load_balancing = true

  tags = {
    Name = "nlb-secondary-jakarta"
  }
}

resource "aws_lb_target_group" "secondary_tg" {
  provider    = aws.secondary
  name        = "tg-secondary-fintech-tls"
  port        = 443
  protocol    = "TCP"
  vpc_id      = aws_vpc.secondary_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    protocol            = "TCP"
    port                = "443"
    interval            = 10
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = {
    Name = "tg-secondary-fintech"
  }
}

resource "aws_lb_listener" "secondary_listener" {
  provider          = aws.secondary
  load_balancer_arn = aws_lb.secondary_nlb.arn
  port              = 443
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.secondary_tg.arn
  }
}

# ==============================================================================
# 3. AWS GLOBAL ACCELERATOR & MULTI-REGION ANYCAST ROUTING
# ==============================================================================

# Global Accelerator Resource
resource "aws_globalaccelerator_accelerator" "fintech_ga" {
  provider        = aws.primary
  name            = "aga-fintech-multi-region"
  ip_address_type = "IPV4"
  enabled         = true

  tags = {
    Name        = "aga-fintech-global"
    Compliance  = "PCI-DSS"
  }
}

# TCP Port 443 Listener
resource "aws_globalaccelerator_listener" "tls_listener" {
  provider        = aws.primary
  accelerator_arn = aws_globalaccelerator_accelerator.fintech_ga.id
  client_affinity = "NONE" # 5-Tuple Consistent Hashing
  protocol        = "TCP"

  port_range {
    from_port = 443
    to_port   = 443
  }
}

# Primary Endpoint Group (Singapore)
resource "aws_globalaccelerator_endpoint_group" "primary_group" {
  provider                      = aws.primary
  listener_arn                  = aws_globalaccelerator_listener.tls_listener.id
  endpoint_group_region         = var.primary_region
  traffic_dial_percentage       = var.traffic_dial_primary
  health_check_interval_seconds = 10
  health_check_port             = 443
  health_check_protocol         = "TCP"
  threshold_count               = 2

  endpoint_configuration {
    endpoint_id                    = aws_lb.primary_nlb.arn
    weight                         = 255
    client_ip_preservation_enabled = true
  }
}

# Secondary Endpoint Group (Jakarta - DR Failover)
resource "aws_globalaccelerator_endpoint_group" "secondary_group" {
  provider                      = aws.primary
  listener_arn                  = aws_globalaccelerator_listener.tls_listener.id
  endpoint_group_region         = var.secondary_region
  traffic_dial_percentage       = var.traffic_dial_secondary
  health_check_interval_seconds = 10
  health_check_port             = 443
  health_check_protocol         = "TCP"
  threshold_count               = 2

  endpoint_configuration {
    endpoint_id                    = aws_lb.secondary_nlb.arn
    weight                         = 255
    client_ip_preservation_enabled = true
  }
}
