output "egress_vpc_id" {
  description = "VPC ID of Central Egress Inspection VPC"
  value       = aws_vpc.egress.id
}

output "nfw_arn" {
  description = "ARN of AWS Network Firewall"
  value       = aws_networkfirewall_firewall.egress_firewall.arn
}

output "nfw_endpoint_id" {
  description = "Sync states and endpoint IDs of Network Firewall"
  value       = aws_networkfirewall_firewall.egress_firewall.firewall_status[0].sync_states
}

output "nat_gateway_public_ip" {
  description = "Public Elastic IP assigned to NAT Gateway"
  value       = aws_nat_gateway.egress_nat.public_ip
}
