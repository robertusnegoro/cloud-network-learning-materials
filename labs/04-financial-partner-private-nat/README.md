# Lab 04: Financial Partner Interconnect with AWS Private NAT Gateway & Overlapping CIDRs

Blueprint Terraform ini mengimplementasikan:
1. **AWS Private NAT Gateway**: NAT Gateway tipe privat tanpa ketergantungan pada Internet Gateway ataupun Elastic IP.
2. **Carrier-Grade NAT (RFC 6598 `100.64.0.0/10`)**: Menggunakan Secondary CIDR block untuk IP translasi partner.
3. **Bi-Directional NAT Mapping**: Mengarahkan traffic dari Core Banking AWS (`10.0.1.0/24`) ke virtual alias Bank Partner (`100.64.10.0/24`) tanpa konflik duplikasi routing.

## Cara Menjalankan
```bash
terraform init
terraform plan
terraform apply
```
