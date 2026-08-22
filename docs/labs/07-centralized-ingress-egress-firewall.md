---
title: "Lab 07: Centralized Ingress & Egress Inspection Architecture with AWS Network Firewall"
description: "Panduan hands-on membangun Central Ingress DMZ (ALB/NLB) dan Central Egress Inspection VPC menggunakan AWS Network Firewall dan Transit Gateway."
---

# 🛡️ Lab 07: Centralized Ingress & Egress Inspection Firewall

<BadgeLabel type="sme" text="Level: Principal / SME" /> <BadgeLabel type="lab" text="Hands-on IaC Blueprint" />

Dalam lab arsitektur tingkat lanjut ini, Anda akan membangun **Central Security & DMZ Hub** enterprise lengkap yang memisahkan dan mengamankan dua vektor traffic internet: **North-South Ingress** (traffic masuk dari publik ke aplikasi privat) dan **North-South Egress** (traffic keluar dari beban kerja internal ke internet melalui AWS Network Firewall Suricata IPS).

---

## 🏗️ Topologi Arsitektur Lab

```mermaid
graph TD
    subgraph Internet["Public Internet Clients & External APIs"]
        Users["End Users"]
        ExternalAPIs["Partner APIs & Repositories"]
    end

    subgraph CentralIngressVPC["Central Ingress DMZ VPC (10.100.0.0/16)"]
        IGW_Ingress["Internet Gateway with Ingress Route Table"]
        ALB_Public["Internet-Facing ALB (WAF & TLS)"]
        GWLBe_Ingress["GWLB Endpoint (Ingress FW)"]
    end

    subgraph CentralEgressVPC["Central Egress VPC (10.101.0.0/16)"]
        FW_Egress["AWS Network Firewall (Suricata IPS/Domain Filter)"]
        NAT_Egress["Public NAT Gateways (Multi-AZ)"]
        IGW_Egress["Egress Internet Gateway"]
    end

    subgraph HubTGW["AWS Transit Gateway (Central Hub)"]
        TGW_RT_Spokes["Spoke Route Table (Default -> Egress VPC)"]
        TGW_RT_Sec["Security Route Table (Appliance Mode)"]
    end

    subgraph SpokeVPCs["Application Spoke VPCs (10.10.0.0/16, 10.20.0.0/16)"]
        AppInstances["Microservices & Databases"]
    end

    Users --> IGW_Ingress --> ALB_Public --> HubTGW --> AppInstances
    AppInstances -->|"0.0.0.0/0 via TGW"| HubTGW --> FW_Egress --> NAT_Egress --> IGW_Egress --> ExternalAPIs
```

---

## 📋 Fitur & Komponen Utama yang Dikonfigurasi

1. **Central Ingress DMZ VPC**: Menampung Public ALB, AWS WAF WebACL, dan Ingress Edge Route Table yang mencegat paket sebelum diteruskan ke TGW.
2. **Central Egress Inspection VPC**: Dilengkapi dengan AWS Network Firewall Endpoint di setiap AZ, NAT Gateway, dan rute transit simetris.
3. **AWS Network Firewall Stateful Suricata Rule Groups**:
   - Aturan deteksi Intrusion Prevention System (IPS) terhadap eksploitasi CVE, SQL Injection, dan remote shell.
   - Aturan *Domain List Filtering* (mengizinkan hanya domain whitelisted: `*.aws.amazon.com`, `*.github.com`).
4. **Transit Gateway Route Segregation**: Pemisahan `tgw-rtb-spokes`, `tgw-rtb-ingress`, dan `tgw-rtb-egress` dengan Appliance Mode aktif.

---

## 🛠️ Langkah Deployment Terraform

```bash
# 1. Masuk ke direktori lab
cd labs/07-centralized-ingress-egress-firewall

# 2. Inisialisasi dan validasi Terraform
terraform init -backend=false
terraform validate

# 3. Tinjau eksekusi plan
terraform plan

# 4. Deploy infrastruktur
terraform apply -auto-approve
```

---

## 🔍 Verification & Triage Runbook

### 1. Uji Ingress Traffic melalui Public ALB
```bash
# Kirim request HTTP normal ke Ingress ALB
curl -I https://app.enterprise-demo.com/api/v1/status

# Uji eksploitasi yang diblokir oleh WAF / Ingress Firewall (harus mengembalikan HTTP 403 Forbidden)
curl -i "https://app.enterprise-demo.com/login?user=admin'--%20OR%201=1"
```

### 2. Uji Egress Traffic & Domain Filtering dari Spoke EC2
```bash
# Uji koneksi ke domain whitelisted (harus berhasil)
curl -I https://github.com

# Uji koneksi ke domain non-whitelisted (harus di-drop oleh AWS Network Firewall)
curl -I https://unauthorized-domain-example.com --connect-timeout 5
```

### 3. Periksa Log AWS Network Firewall pada CloudWatch
```bash
aws logs filter-log-events \
    --log-group-name "/aws/network-firewall/alert" \
    --filter-pattern "DROP"
```

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Selalu pisahkan **Central Ingress VPC** dan **Central Egress VPC** dalam akun AWS terpisah (misal `Network-Ingress-Account` dan `Network-Egress-Account`) untuk memisahkan *blast radius*, mengisolasi sertifikat publik dan kuota bandwidth internet, serta menyederhanakan audit PCI-DSS.
:::
