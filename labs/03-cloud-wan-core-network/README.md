# Lab 03: AWS Cloud WAN Global SD-WAN Mesh & Core Network Policy

Blueprint Terraform ini mengimplementasikan:
1. **AWS Network Manager Global Network**.
2. **AWS Cloud WAN Core Network** dengan deklarasi JSON *Core Network Policy (CNP)*.
3. **Global Multi-Region Edges**: Jakarta (`ap-southeast-3`), Singapore (`ap-southeast-1`), dan Frankfurt (`eu-central-1`).
4. **Segment Definition & Service Insertion**: Segmen `production`, `development`, `shared-services`, dan `security` dengan aksi `send-via` otomatis melalui firewall pool.

## Cara Menjalankan
```bash
terraform init
terraform plan
terraform apply
```
