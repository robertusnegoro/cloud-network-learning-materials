# Lab 07: Centralized Ingress & Egress Inspection Firewall

## 📋 Ringkasan Arsitektur
Lab ini mengonfigurasi arsitektur inspeksi keamanan terpusat enterprise:
- **Central Ingress VPC**: Internet-Facing ALB dengan WAF dan edge inspection.
- **Central Egress Inspection VPC**: Dilengkapi dengan AWS Network Firewall (Suricata IPS & Stateful Domain Allowlist) dan NAT Gateway.
- **Transit Gateway Integration**: Segmentasi rute spoke menuju inspeksi firewall sebelum keluar ke internet.

## 🚀 Langkah Deployment
```bash
terraform init -backend=false
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

## 🔍 Verification Runbook
```bash
# 1. Periksa status AWS Network Firewall
aws network-firewall describe-firewall \
    --firewall-name nfw-central-egress

# 2. Periksa Endpoint IDs di setiap Subnet
aws network-firewall describe-firewall \
    --firewall-name nfw-central-egress \
    --query 'FirewallStatus.SyncStates'

# 3. Query CloudWatch Firewall Alert Logs
aws logs filter-log-events \
    --log-group-name "/aws/network-firewall/alert" \
    --filter-pattern "DROP"
```
