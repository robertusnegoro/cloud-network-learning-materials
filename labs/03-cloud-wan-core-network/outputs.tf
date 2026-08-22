output "global_network_id" {
  value       = aws_networkmanager_global_network.global_net.id
  description = "The ID of the Global Network Manager"
}

output "core_network_id" {
  value       = aws_networkmanager_core_network.core_wan.id
  description = "The ID of the Cloud WAN Core Network"
}

output "core_network_arn" {
  value       = aws_networkmanager_core_network.core_wan.arn
  description = "The ARN of the Cloud WAN Core Network"
}
