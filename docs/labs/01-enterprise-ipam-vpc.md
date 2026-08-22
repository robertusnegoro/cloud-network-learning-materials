---
title: "Lab 01: Enterprise IPAM & Multi-Tier VPC with Secondary RFC 6598 CIDRs"
description: "Panduan hands-on deployment Terraform untuk AWS IPAM pool hierarchy, VPC dynamic provisioning, dan secondary RFC 6598 CIDR."
---

# Lab 01: Enterprise IPAM & Multi-Tier VPC with Secondary RFC 6598 CIDRs

<BadgeLabel type="sme" text="Terraform IaC" /> <BadgeLabel type="aws" text="AWS IPAM & VPC" />

Lab ini menyediakan blueprint **Infrastructure as Code (IaC) Terraform** untuk men-deploy arsitektur IPAM enterprise multi-tier dan alokasi *Carrier-Grade NAT (RFC 6598 `100.64.0.0/10`)* untuk Pod Kubernetes EKS.

---

## 🏗️ Arsitektur yang Di-deploy

```mermaid
graph TD
    IPAM[AWS IPAM Root Scope] --> TopPool[Top-Level Corporate Pool: 10.0.0.0/8]
    TopPool --> JktPool[Jakarta Regional Pool: 10.100.0.0/16]
    JktPool --> ProdVPC[Production VPC: 10.100.0.0/20]
    ProdVPC --> SecCIDR[Secondary CIDR: 100.64.0.0/18 - EKS Pods]

    ProdVPC --> SubPublic[Public Subnet: 10.100.0.0/24]
    ProdVPC --> SubApp[Private App Subnet: 10.100.2.0/23]
    ProdVPC --> SubDB[Isolated DB Subnet: 10.100.4.0/24]
    SecCIDR --> SubEKS[EKS Secondary Subnet: 100.64.0.0/19]
```

---

## 📂 Lokasi File Kode Terraform

Kode sumber lengkap tersedia langsung di dalam repositori:
👉 [labs/01-enterprise-ipam-vpc/](file:///Users/robertusnegoro/workingdir/repo/cloud-network-learning-materials/labs/01-enterprise-ipam-vpc/)

### Menjalankan Deployment:

```bash
cd labs/01-enterprise-ipam-vpc
terraform init
terraform plan
terraform apply
```
