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
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "CloudNetworkMastery"
      Lab         = "06-vpc-lattice-microservices"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# 1. Consumer VPC (Payment Microservice)
resource "aws_vpc" "consumer" {
  cidr_block           = var.consumer_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "vpc-payment-consumer"
  }
}

resource "aws_subnet" "consumer_app" {
  vpc_id            = aws_vpc.consumer.id
  cidr_block        = "10.10.1.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "subnet-payment-app-az1"
  }
}

# 2. Provider VPC (Core Banking Ledger Service)
resource "aws_vpc" "provider" {
  cidr_block           = var.provider_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "vpc-core-banking-provider"
  }
}

resource "aws_subnet" "provider_app" {
  vpc_id            = aws_vpc.provider.id
  cidr_block        = "10.20.1.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "subnet-banking-ledger-az1"
  }
}

# 3. VPC Lattice Service Network
resource "aws_vpclattice_service_network" "core_mesh" {
  name      = "core-banking-mesh"
  auth_type = "AWS_IAM"

  tags = {
    Name = "sn-core-banking-mesh"
  }
}

# 4. Associate Consumer VPC to Service Network
resource "aws_vpclattice_service_network_vpc_association" "consumer_assoc" {
  vpc_identifier             = aws_vpc.consumer.id
  service_network_identifier = aws_vpclattice_service_network.core_mesh.id

  tags = {
    Name = "sn-assoc-consumer-vpc"
  }
}

# 5. VPC Lattice Target Group (Banking Backend)
resource "aws_vpclattice_target_group" "banking_tg" {
  name = "tg-banking-ledger"
  type = "IP"

  config {
    port             = 443
    protocol         = "HTTPS"
    vpc_identifier   = aws_vpc.provider.id
    ip_address_type  = "IPV4"

    health_check {
      enabled                       = true
      health_check_interval_seconds = 30
      health_check_timeout_seconds  = 5
      healthy_threshold_count       = 3
      unhealthy_threshold_count     = 3
      matcher {
        value = "200"
      }
      path     = "/healthz"
      port     = 443
      protocol = "HTTPS"
    }
  }

  tags = {
    Name = "tg-banking-ledger"
  }
}

# 6. VPC Lattice Service (Banking Ledger Service)
resource "aws_vpclattice_service" "banking_service" {
  name      = "banking-ledger-svc"
  auth_type = "AWS_IAM"

  tags = {
    Name = "svc-banking-ledger"
  }
}

# 7. Listener & Routing Rule for Service
resource "aws_vpclattice_listener" "banking_listener" {
  name               = "https-listener"
  protocol           = "HTTPS"
  port               = 443
  service_identifier = aws_vpclattice_service.banking_service.id

  default_action {
    forward {
      target_groups {
        target_group_identifier = aws_vpclattice_target_group.banking_tg.id
        weight                  = 100
      }
    }
  }
}

# 8. Associate Service with Service Network
resource "aws_vpclattice_service_network_service_association" "service_assoc" {
  service_identifier         = aws_vpclattice_service.banking_service.id
  service_network_identifier = aws_vpclattice_service_network.core_mesh.id

  tags = {
    Name = "sn-svc-assoc-banking-ledger"
  }
}
