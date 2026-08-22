variable "aws_region" {
  type        = string
  description = "AWS Region for deployment"
  default     = "ap-southeast-1"
}

variable "environment" {
  type        = string
  description = "Environment identifier"
  default     = "production"
}

variable "ingress_vpc_cidr" {
  type        = string
  description = "CIDR for Central Ingress DMZ VPC"
  default     = "10.100.0.0/16"
}

variable "egress_vpc_cidr" {
  type        = string
  description = "CIDR for Central Egress Inspection VPC"
  default     = "10.101.0.0/16"
}
