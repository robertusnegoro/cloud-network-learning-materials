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

# 1. AWS Core Banking VPC (10.0.0.0/16)
resource "aws_vpc" "core_banking_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "vpc-core-banking-pci"
    Scope = "PCI-DSS-CDE"
  }
}

# 2. Secondary CIDR for Private NAT Gateway (RFC 6598 Carrier Grade NAT)
resource "aws_vpc_ipv4_cidr_block_association" "cgnat_cidr" {
  vpc_id     = aws_vpc.core_banking_vpc.id
  cidr_block = "100.64.0.0/24" # Non-overlapping partner transition pool
}

resource "aws_subnet" "nat_subnet" {
  depends_on        = [aws_vpc_ipv4_cidr_block_association.cgnat_cidr]
  vpc_id            = aws_vpc.core_banking_vpc.id
  cidr_block        = "100.64.0.0/28"
  availability_zone = "${var.aws_region}a"
  tags = {
    Name = "snet-private-nat-gateway"
  }
}

# 3. AWS Private NAT Gateway (No Internet Gateway / Elastic IP required!)
resource "aws_nat_gateway" "private_nat_gw" {
  connectivity_type = "private"
  subnet_id         = aws_subnet.nat_subnet.id
  tags = {
    Name = "natgw-private-financial-switch"
  }
}

# 4. Route Table for Core Banking App Subnet
resource "aws_subnet" "app_subnet" {
  vpc_id            = aws_vpc.core_banking_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "snet-payment-microservice" }
}

resource "aws_route_table" "app_rtb" {
  vpc_id = aws_vpc.core_banking_vpc.id

  # Forward queries to Bank Virtual Alias (100.64.10.0/24) via Private NAT Gateway
  route {
    cidr_block     = "100.64.10.0/24"
    nat_gateway_id = aws_nat_gateway.private_nat_gw.id
  }

  tags = { Name = "rtb-payment-app-to-nat" }
}

resource "aws_route_table_association" "app_assoc" {
  subnet_id      = aws_subnet.app_subnet.id
  route_table_id = aws_route_table.app_rtb.id
}
