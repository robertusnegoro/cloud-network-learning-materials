output "private_nat_gateway_id" {
  value       = aws_nat_gateway.private_nat_gw.id
  description = "The ID of the AWS Private NAT Gateway"
}

output "private_nat_ip" {
  value       = aws_nat_gateway.private_nat_gw.primary_private_ip_address
  description = "Assigned Private IP of the Private NAT Gateway"
}
