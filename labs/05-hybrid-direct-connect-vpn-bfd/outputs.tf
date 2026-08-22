output "dx_gateway_id" {
  value       = aws_dx_gateway.dxgw.id
  description = "The ID of the Direct Connect Gateway"
}

output "transit_gateway_id" {
  value       = aws_ec2_transit_gateway.tgw.id
  description = "The ID of the Transit Gateway"
}

output "vpn_connection_id" {
  value       = aws_vpn_connection.backup_vpn.id
  description = "The ID of the Backup Site-to-Site VPN Connection"
}
