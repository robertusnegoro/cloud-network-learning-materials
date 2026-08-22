---
title: "Lab 04: Financial Partner Interconnect with Private NAT Gateway & Overlapping CIDRs"
description: "Hands-on Terraform blueprint untuk AWS Private NAT Gateway dan isolasi PCI-DSS untuk interkoneksi perbankan."
---

# Lab 04: Financial Partner Interconnect with Private NAT Gateway & Overlapping CIDRs

<BadgeLabel type="sme" text="Terraform IaC" /> <BadgeLabel type="aws" text="Private NAT GW & CGNAT" />

Lab ini mengimplementasikan **AWS Private NAT Gateway** untuk menyelesaikan masalah *overlapping IP* saat menghubungkan Core Banking AWS ke mitra perbankan / switching network (Arthajasa, Alto, BI-FAST).

---

## 🏗️ Arsitektur yang Di-deploy

```mermaid
graph LR
    CoreBanking[Core Banking VPC: 10.0.0.0/16] --> SubApp[Payment Microservice: 10.0.1.50]
    SubApp -->|Route: 100.64.10.0/24 -> Private NAT GW| PrivNAT[AWS Private NAT GW: 100.64.0.5]
    PrivNAT -->|SNAT to 100.64.0.5| PartnerSwitch[Bank Partner / Arthajasa Switch]
```

---

## 📂 Lokasi File Kode Terraform

Kode sumber lengkap tersedia di:
👉 [labs/04-financial-partner-private-nat/](file:///Users/robertusnegoro/workingdir/repo/cloud-network-learning-materials/labs/04-financial-partner-private-nat/)

### Menjalankan Deployment:

```bash
cd labs/04-financial-partner-private-nat
terraform init
terraform plan
terraform apply
```
