---
title: "Lab 02: TGW Hub & Central GWLB with Appliance Mode Enabled"
description: "Hands-on Terraform blueprint untuk AWS Transit Gateway dengan 4 domain route table dan Gateway Load Balancer Appliance Mode."
---

# Lab 02: TGW Hub & Central GWLB with Appliance Mode Enabled

<BadgeLabel type="sme" text="Terraform IaC" /> <BadgeLabel type="aws" text="TGW & GWLB Appliance Mode" />

Lab ini mengonfigurasi **AWS Transit Gateway (TGW)** dengan 4 *Route Table Domains* terisolasi dan mengaktifkan fitur kritis **Appliance Mode** pada attachment *Inspection VPC*.

---

## 🏗️ Arsitektur yang Di-deploy

```mermaid
graph TD
    TGW[AWS Transit Gateway Hub: ASN 64512] --> RT_Spoke[TGW Route Table: Spoke-Domain]
    TGW --> RT_Shared[TGW Route Table: Shared-Domain]
    TGW --> RT_Inspection[TGW Route Table: Inspection-Domain]
    TGW --> RT_OnPrem[TGW Route Table: Hybrid-OnPrem]

    Attach_Sec[Inspection VPC Attachment] -->|appliance_mode_support = 'enable'| TGW
    Attach_Sec --> GWLB[Gateway Load Balancer Pool]
```

---

## 📂 Lokasi File Kode Terraform

Kode sumber lengkap tersedia di:
👉 [labs/02-tgw-gwlb-appliance-mode/](file:///Users/robertusnegoro/workingdir/repo/cloud-network-learning-materials/labs/02-tgw-gwlb-appliance-mode/)

### Menjalankan Deployment:

```bash
cd labs/02-tgw-gwlb-appliance-mode
terraform init
terraform plan
terraform apply
```
