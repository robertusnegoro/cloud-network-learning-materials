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
}

# 1. AWS IPAM (IP Address Manager) Top-Level & Regional Pool
resource "aws_vpc_ipam" "main" {
  description = "Enterprise Core IPAM"
  operating_regions {
    region_name = var.aws_region
  }
  tags = {
    Environment = "Enterprise-Core"
  }
}

resource "aws_vpc_ipam_pool" "top_level" {
  address_family = "ipv4"
  ipam_scope_id  = aws_vpc_ipam.main.private_default_scope_id
  description    = "Top Level Corporate IPv4 Pool (10.0.0.0/8)"
  locale         = var.aws_region
}

resource "aws_vpc_ipam_pool_cidr" "top_level_cidr" {
  ipam_pool_id = aws_vpc_ipam_pool.top_level.id
  cidr         = "10.0.0.0/8"
}

resource "aws_vpc_ipam_pool" "regional_jkt" {
  address_family      = "ipv4"
  ipam_scope_id       = aws_vpc_ipam.main.private_default_scope_id
  source_ipam_pool_id = aws_vpc_ipam_pool.top_level.id
  description         = "Jakarta Regional Pool (10.100.0.0/16)"
  locale              = var.aws_region
}

resource "aws_vpc_ipam_pool_cidr" "regional_jkt_cidr" {
  ipam_pool_id = aws_vpc_ipam_pool.regional_jkt.id
  cidr         = "10.100.0.0/16"
}

# 2. Production VPC Provisioned via IPAM
resource "aws_vpc" "prod_vpc" {
  ipv4_ipam_pool_id   = aws_vpc_ipam_pool.regional_jkt.id
  ipv4_netmask_length = 20 # Allocates 10.100.0.0/20 (4,096 IPs)

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "vpc-production-jkt"
    Env  = "Production"
  }
}

# 3. Secondary CIDR Block for EKS Pods (RFC 6598 - Carrier Grade NAT)
resource "aws_vpc_ipv4_cidr_block_association" "eks_pods" {
  vpc_id     = aws_vpc_prod_vpc.id
  cidr_block = "100.64.0.0/18" # 16,384 IPs for Kubernetes Pod ENIs
}

# 4. Multi-AZ Subnets (AZ-A and AZ-B)
resource "aws_subnet" "public_aza" {
  vpc_id            = aws_vpc.prod_vpc.id
  cidr_block        = "10.100.0.0/24"
  availability_zone = "${var.aws_region}a"
  tags = {
    Name = "snet-public-aza"
    Tier = "Public"
  }
}

resource "aws_subnet" "app_aza" {
  vpc_id            = aws_vpc.prod_vpc.id
  cidr_block        = "10.100.2.0/23"
  availability_zone = "${var.aws_region}a"
  tags = {
    Name = "snet-app-aza"
    Tier = "Private-App"
  }
}

resource "aws_subnet" "db_aza" {
  vpc_id            = aws_vpc.prod_vpc.id
  cidr_block        = "10.100.4.0/24"
  availability_zone = "${var.aws_region}a"
  tags = {
    Name = "snet-db-aza"
    Tier = "Isolated-DB"
  }
}

resource "aws_subnet" "eks_pods_aza" {
  depends_on        = [aws_vpc_ipv4_cidr_block_association.eks_pods]
  vpc_id            = aws_vpc.prod_vpc.id
  cidr_block        = "100.64.0.0/19"
  availability_zone = "${var.aws_region}a"
  tags = {
    Name = "snet-eks-pods-aza"
    Tier = "EKS-Secondary-CNI"
  }
}
