# Lab 01: Enterprise AWS IPAM & Multi-Tier VPC with Secondary RFC 6598 CIDRs

Blueprint Terraform ini mengimplementasikan:
1. **AWS IPAM (IP Address Manager)** dengan hierarki *Top-Level Pool (`10.0.0.0/8`)* dan *Regional Jakarta Pool (`10.100.0.0/16`)*.
2. **Dynamic VPC Provisioning**: VPC dialokasikan otomatis via IPAM pool dengan netmask `/20` (4,096 IPs).
3. **Secondary CIDR Allocation**: Menambahkan blok Carrier-Grade NAT (RFC 6598 `100.64.0.0/18`) khusus untuk ENI Pod Kubernetes (EKS AWS VPC CNI).
4. **Subnet Tiers**: Public DMZ, Private Application, Isolated Database, dan Dedicated EKS Subnets.

## Cara Menjalankan
```bash
terraform init
terraform plan
terraform apply
```
