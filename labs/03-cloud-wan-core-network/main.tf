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

# 1. AWS Network Manager Global Network
resource "aws_networkmanager_global_network" "global_net" {
  description = "Enterprise Global SD-WAN Core"
  tags = {
    Name = "global-network-core"
  }
}

# 2. AWS Cloud WAN Core Network
resource "aws_networkmanager_core_network" "core_wan" {
  global_network_id   = aws_networkmanager_global_network.global_net.id
  description         = "Multi-Region Cloud WAN Mesh Backbone"
  create_base_policy  = true

  policy_document = jsonencode({
    version = "2021.12"
    core-network-configuration = {
      asn-ranges = ["64512-64555"]
      edge-locations = [
        { location = "ap-southeast-3" }, # Jakarta
        { location = "ap-southeast-1" }, # Singapore
        { location = "eu-central-1" }    # Frankfurt
      ]
    }
    segments = [
      {
        name                          = "production"
        description                   = "Production Workloads"
        require-attachment-acceptance = true
        isolate-attachments           = false
      },
      {
        name                          = "development"
        description                   = "Development & Test Workloads"
        require-attachment-acceptance = false
        isolate-attachments           = false
      },
      {
        name                          = "shared-services"
        description                   = "Shared Services & CI/CD Hub"
      },
      {
        name                          = "security"
        description                   = "Central Inspection & Egress Hub"
      }
    ]
    segment-actions = [
      {
        action     = "share"
        segment    = "shared-services"
        share-with = ["production", "development"]
      },
      {
        action  = "send-via"
        segment = "production"
        mode    = "dual-hop"
        when-sent-to = {
          segments = ["development"]
        }
        via = {
          network-function-groups = ["firewall-group"]
        }
      }
    ]
  })

  tags = {
    Name = "core-network-wan"
  }
}
