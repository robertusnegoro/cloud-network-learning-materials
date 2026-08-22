# Lab 02: AWS Transit Gateway Hub-and-Spoke with Central GWLB & Appliance Mode

Blueprint Terraform ini mengimplementasikan:
1. **AWS Transit Gateway (TGW)** dengan 4 isolated route tables (Spoke, Shared Services, Inspection, Hybrid On-Prem).
2. **Central Inspection VPC** dengan Gateway Load Balancer (GWLB).
3. **Appliance Mode Enabled Attachment**: Mengaktifkan `appliance_mode_support = "enable"` pada inspection VPC attachment untuk menjamin simetri flow firewall stateful multi-AZ.

## Cara Menjalankan
```bash
terraform init
terraform plan
terraform apply
```
