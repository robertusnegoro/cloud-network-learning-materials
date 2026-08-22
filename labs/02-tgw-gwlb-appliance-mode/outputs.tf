output "tgw_id" {
  value       = aws_ec2_transit_gateway.core_tgw.id
  description = "The ID of the Core Transit Gateway"
}

output "gwlb_arn" {
  value       = aws_lb.gwlb.arn
  description = "The ARN of the Gateway Load Balancer"
}

output "inspection_attachment_id" {
  value       = aws_ec2_transit_gateway_vpc_attachment.inspection_attach.id
  description = "TGW Inspection Attachment ID with Appliance Mode enabled"
}
