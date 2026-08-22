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
      Lab         = "07-centralized-ingress-egress-firewall"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# 1. Central Egress VPC
resource "aws_vpc" "egress" {
  cidr_block           = var.egress_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "vpc-central-egress-inspection"
  }
}

resource "aws_internet_gateway" "egress_igw" {
  vpc_id = aws_vpc.egress.id
  tags   = { Name = "igw-central-egress" }
}

resource "aws_subnet" "egress_firewall_az1" {
  vpc_id            = aws_vpc.egress.id
  cidr_block        = "10.101.1.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "subnet-egress-fw-az1" }
}

resource "aws_subnet" "egress_nat_az1" {
  vpc_id            = aws_vpc.egress.id
  cidr_block        = "10.101.2.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "subnet-egress-nat-az1" }
}

resource "aws_subnet" "egress_tgw_az1" {
  vpc_id            = aws_vpc.egress.id
  cidr_block        = "10.101.254.0/28"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "subnet-egress-tgw-az1" }
}

# 2. AWS Network Firewall Rule Group (Stateful Domain Filtering)
resource "aws_networkfirewall_rule_group" "domain_filter" {
  capacity = 100
  name     = "nfw-rg-domain-allowlist"
  type     = "STATEFUL"

  rule_group {
    rules_source {
      rules_source_list {
        generated_rules_type = "ALLOWLIST"
        target_types         = ["HTTP_HOST", "TLS_SNI"]
        targets              = [".amazon.com", ".aws.amazon.com", ".github.com"]
      }
    }
    rule_variables {
      ip_sets {
        key = "HOME_NET"
        ip_set {
          definition = ["10.0.0.0/8"]
        }
      }
    }
  }
}

# 3. AWS Network Firewall Policy
resource "aws_networkfirewall_firewall_policy" "egress_policy" {
  name = "nfw-policy-central-egress"

  firewall_policy {
    stateless_default_actions          = ["aws:forward_to_sfe"]
    stateless_fragment_default_actions = ["aws:forward_to_sfe"]

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.domain_filter.arn
    }
  }
}

# 4. AWS Network Firewall Instance
resource "aws_networkfirewall_firewall" "egress_firewall" {
  name                = "nfw-central-egress"
  firewall_policy_arn = aws_networkfirewall_firewall_policy.egress_policy.arn
  vpc_id              = aws_vpc.egress.id

  subnet_mapping {
    subnet_id = aws_subnet.egress_firewall_az1.id
  }

  tags = {
    Name = "nfw-central-egress"
  }
}

# 5. Public NAT Gateway in Egress VPC
resource "aws_eip" "nat_eip" {
  domain = "vpc"
  tags   = { Name = "eip-nat-egress-az1" }
}

resource "aws_nat_gateway" "egress_nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.egress_nat_az1.id
  tags          = { Name = "nat-central-egress-az1" }
}
