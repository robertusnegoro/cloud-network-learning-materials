variable "primary_region" {
  type        = string
  description = "AWS Primary Region for Active Ingress"
  default     = "ap-southeast-1"
}

variable "secondary_region" {
  type        = string
  description = "AWS Secondary Region for Disaster Recovery & In-Country Ingress"
  default     = "ap-southeast-3"
}

variable "environment" {
  type        = string
  description = "Environment identifier (e.g. Production, Staging)"
  default     = "Production"
}

variable "primary_vpc_cidr" {
  type        = string
  description = "CIDR block for Primary Singapore VPC"
  default     = "10.100.0.0/16"
}

variable "secondary_vpc_cidr" {
  type        = string
  description = "CIDR block for Secondary Jakarta VPC"
  default     = "10.104.0.0/16"
}

variable "traffic_dial_primary" {
  type        = number
  description = "Traffic Dial percentage for Singapore Primary Region (0 to 100)"
  default     = 100.0
}

variable "traffic_dial_secondary" {
  type        = number
  description = "Traffic Dial percentage for Jakarta Secondary Region (0 to 100)"
  default     = 100.0
}
