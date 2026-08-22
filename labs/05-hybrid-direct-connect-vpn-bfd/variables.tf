variable "aws_region" {
  type        = string
  default     = "ap-southeast-3"
  description = "Target AWS Region"
}

variable "onprem_public_ip" {
  type        = string
  default     = "203.0.113.10"
  description = "Customer Gateway Public IP"
}

variable "vpn_preshared_key" {
  type        = string
  default     = "EnterpriseSecurePresharedKey99!"
  sensitive   = true
  description = "Pre-shared key for IPsec tunnels"
}
