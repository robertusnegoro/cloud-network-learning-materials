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

# 1. Direct Connect Gateway (Global Resource)
resource "aws_dx_gateway" "dxgw" {
  name            = "dxgw-enterprise-global"
  amazon_side_asn = 64512
}

# 2. AWS Transit Gateway
resource "aws_ec2_transit_gateway" "tgw" {
  description     = "TGW Hybrid Cloud Hub"
  amazon_side_asn = 64515

  tags = {
    Name = "tgw-hybrid-hub"
  }
}

# 3. Direct Connect Gateway to Transit Gateway Association
resource "aws_dx_gateway_association" "dxgw_tgw_assoc" {
  dx_gateway_id         = aws_dx_gateway.dxgw.id
  associated_gateway_id = aws_ec2_transit_gateway.tgw.id

  # Summarized allowed prefixes to advertise over DX BGP
  allowed_prefixes = [
    "10.100.0.0/14", # Jakarta Region Supernet
    "10.104.0.0/14"  # Singapore Region Supernet
  ]
}

# 4. Customer Gateway for Backup Site-to-Site VPN
resource "aws_customer_gateway" "onprem_cgw" {
  bgp_asn    = 65000
  ip_address = var.onprem_public_ip
  type       = "ipsec.1"

  tags = {
    Name = "cgw-onprem-datacenter-edge"
  }
}

# 5. Site-to-Site VPN Attachment on TGW with BGP & Accelerated Tunneling
resource "aws_vpn_connection" "backup_vpn" {
  customer_gateway_id = aws_customer_gateway.onprem_cgw.id
  transit_gateway_id  = aws_ec2_transit_gateway.tgw.id
  type                = "ipsec.1"

  enable_acceleration = true # Uses AWS Global Edge Network

  # BGP Tuning & DPD
  tunnel1_inside_cidr   = "169.254.242.0/30"
  tunnel1_preshared_key = var.vpn_preshared_key
  tunnel1_dpd_timeout_action = "restart"

  tunnel2_inside_cidr   = "169.254.242.4/30"
  tunnel2_preshared_key = var.vpn_preshared_key
  tunnel2_dpd_timeout_action = "restart"

  tags = {
    Name = "vpn-backup-to-tgw"
  }
}
