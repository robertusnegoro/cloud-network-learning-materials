# Lab 06: Zero-Trust Multi-Account Microservices with AWS VPC Lattice

## 📋 Ringkasan Arsitektur
Lab ini mengonfigurasi jaringan modern service-to-service menggunakan AWS VPC Lattice:
- **Service Network**: Hub kontrol akses terpusat (`core-banking-mesh`).
- **Consumer Association**: Mengaitkan Consumer VPC ke Service Network untuk resolusi DNS lokal otomatis.
- **Service Association & Target Group**: Mengekspos microservice backend perbankan dengan listener HTTPS dan enkripsi IAM SigV4.

## 🚀 Langkah Deployment
```bash
terraform init -backend=false
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

## 🔍 Verification Runbook
```bash
# 1. Periksa Service Network
aws vpc-lattice list-service-networks

# 2. Periksa Service Network Associations
aws vpc-lattice list-service-network-vpc-associations \
    --service-network-identifier $(terraform output -raw service_network_id)

# 3. Uji Query DNS dari Consumer VPC
dig +short $(terraform output -raw service_dns_name)
```
