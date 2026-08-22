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

# 1. AWS Transit Gateway
resource "aws_ec2_transit_gateway" "core_tgw" {
  description                     = "Core Enterprise Transit Gateway Hub"
  amazon_side_asn                 = 64512
  default_route_table_association = "disable"
  default_route_table_propagation = "disable"
  auto_accept_shared_attachments  = "enable"

  tags = {
    Name = "tgw-core-enterprise"
  }
}

# 2. Four Isolated TGW Route Tables
resource "aws_ec2_transit_gateway_route_table" "spoke_rtb" {
  transit_gateway_id = aws_ec2_transit_gateway.core_tgw.id
  tags = { Name = "tgw-rtb-spoke-domain" }
}

resource "aws_ec2_transit_gateway_route_table" "shared_rtb" {
  transit_gateway_id = aws_ec2_transit_gateway.core_tgw.id
  tags = { Name = "tgw-rtb-shared-domain" }
}

resource "aws_ec2_transit_gateway_route_table" "inspection_rtb" {
  transit_gateway_id = aws_ec2_transit_gateway.core_tgw.id
  tags = { Name = "tgw-rtb-inspection-domain" }
}

resource "aws_ec2_transit_gateway_route_table" "onprem_rtb" {
  transit_gateway_id = aws_ec2_transit_gateway.core_tgw.id
  tags = { Name = "tgw-rtb-hybrid-onprem" }
}

# 3. Security / Inspection VPC
resource "aws_vpc" "inspection_vpc" {
  cidr_block           = "10.99.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "vpc-central-inspection" }
}

resource "aws_subnet" "gwlb_aza" {
  vpc_id            = aws_vpc.inspection_vpc.id
  cidr_block        = "10.99.1.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "snet-gwlb-aza" }
}

resource "aws_subnet" "tgw_attach_aza" {
  vpc_id            = aws_vpc.inspection_vpc.id
  cidr_block        = "10.99.2.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "snet-tgw-attachment-aza" }
}

# 4. TGW VPC Attachment with APPLIANCE MODE ENABLED!
resource "aws_ec2_transit_gateway_vpc_attachment" "inspection_attach" {
  transit_gateway_id = aws_ec2_transit_gateway.core_tgw.id
  vpc_id             = aws_vpc.inspection_vpc.id
  subnet_ids         = [aws_subnet.tgw_attach_aza.id]

  # CRITICAL: Appliance Mode guarantees multi-AZ symmetric firewall hashing
  appliance_mode_support = "enable"

  tags = {
    Name = "tgw-attach-inspection-vpc"
  }
}

# 5. Route Table Association & Propagation
resource "aws_ec2_transit_gateway_route_table_association" "inspection_assoc" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.inspection_attach.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.inspection_rtb.id
}

# 6. Gateway Load Balancer
resource "aws_lb" "gwlb" {
  name               = "gwlb-central-firewall"
  load_balancer_type = "gateway"
  subnets            = [aws_subnet.gwlb_aza.id]
  tags               = { Name = "gwlb-central-firewall" }
}
