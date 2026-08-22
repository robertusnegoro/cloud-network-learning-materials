output "vpc_id" {
  value       = aws_vpc.prod_vpc.id
  description = "The ID of the provisioned Production VPC"
}

output "primary_cidr" {
  value       = aws_vpc.prod_vpc.cidr_block
  description = "The Primary IPv4 CIDR allocated by IPAM"
}

output "eks_secondary_cidr" {
  value       = aws_vpc_ipv4_cidr_block_association.eks_pods.cidr_block
  description = "The Secondary RFC 6598 CIDR allocated for EKS Pods"
}
