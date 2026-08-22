# Lab 05: Enterprise Hybrid Direct Connect with Accelerated VPN Backup & BFD

Blueprint Terraform ini mengimplementasikan:
1. **Direct Connect Gateway (DXGW)** dengan asosiasi ke AWS Transit Gateway dan allowed prefixes filter.
2. **Accelerated Site-to-Site VPN Backup**: VPN tunnel berkecepatan tinggi yang memanfaatkan AWS Global Edge Locations.
3. **BGP Dynamic Routing over VPN**: Konfigurasi IP inside CIDR BGP (`169.254.242.0/30`) dan Dead Peer Detection (DPD) action `restart`.

## Cara Menjalankan
```bash
terraform init
terraform plan
terraform apply
```
