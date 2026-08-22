output "service_network_id" {
  description = "ID of the created VPC Lattice Service Network"
  value       = aws_vpclattice_service_network.core_mesh.id
}

output "service_network_arn" {
  description = "ARN of the created VPC Lattice Service Network"
  value       = aws_vpclattice_service_network.core_mesh.arn
}

output "service_dns_name" {
  description = "Assigned DNS name for the Banking Ledger Service"
  value       = aws_vpclattice_service.banking_service.dns_entry
}

output "consumer_vpc_id" {
  description = "VPC ID of Payment Consumer"
  value       = aws_vpc.consumer.id
}

output "provider_vpc_id" {
  description = "VPC ID of Banking Provider"
  value       = aws_vpc.provider.id
}
