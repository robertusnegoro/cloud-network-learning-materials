output "global_accelerator_arn" {
  description = "ARN of the AWS Global Accelerator"
  value       = aws_globalaccelerator_accelerator.fintech_ga.id
}

output "global_accelerator_dns_name" {
  description = "Canonical DNS Name of the AWS Global Accelerator"
  value       = aws_globalaccelerator_accelerator.fintech_ga.dns_name
}

output "global_accelerator_static_ips" {
  description = "Dual Static Anycast IPv4 Addresses allocated across Independent Network Zones"
  value       = aws_globalaccelerator_accelerator.fintech_ga.ip_sets[0].ip_addresses
}

output "primary_nlb_arn" {
  description = "ARN of the Primary Region NLB in Singapore"
  value       = aws_lb.primary_nlb.arn
}

output "secondary_nlb_arn" {
  description = "ARN of the Secondary Region NLB in Jakarta"
  value       = aws_lb.secondary_nlb.arn
}
