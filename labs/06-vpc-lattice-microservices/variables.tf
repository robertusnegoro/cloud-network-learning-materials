variable "aws_region" {
  type        = string
  description = "AWS Region for VPC Lattice deployment"
  default     = "ap-southeast-1"
}

variable "environment" {
  type        = string
  description = "Environment identifier"
  default     = "production"
}

variable "consumer_vpc_cidr" {
  type        = string
  description = "CIDR block for Payment Consumer VPC"
  default     = "10.10.0.0/16"
}

variable "provider_vpc_cidr" {
  type        = string
  description = "CIDR block for Banking Provider VPC"
  default     = "10.20.0.0/16"
}
