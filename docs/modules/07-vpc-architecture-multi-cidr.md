---
title: "Modul 07: AWS VPC Architecture, Multi-CIDR Strategies & Resource Access Manager (RAM) Sharing"
description: "Arsitektur enterprise VPC, secondary CIDR RFC 6598 expansion, AWS RAM Subnet Sharing multi-account, Availability Zone ID mapping, dan tata kelola jaringan terpusat."
---

# Modul 07: AWS VPC Architecture, Multi-CIDR Strategies & Resource Access Manager (RAM) Sharing

<BadgeLabel type="sme" text="Level: Principal / SME" /> <BadgeLabel type="aws" text="Multi-CIDR VPC & AWS RAM" /> <BadgeLabel type="arch" text="Enterprise Multi-Account Backbone" />

Dalam organisasi berskala enterprise dengan ratusan akun AWS (*multi-account landing zone*), perdebatan arsitektural klasik selalu berkisar pada: **apakah setiap akun harus memiliki VPC sendiri yang saling dihubungkan via Transit Gateway, ataukah menggunakan pola Shared VPC berbasis AWS Resource Access Manager (RAM)?**

Kesalahan dalam memilih pola arsitektur ini berdampak langsung pada tagihan *cross-AZ data transfer*, kompleksitas *Transit Gateway route tables*, dan fragmentasi *IP address space*. Modul ini membedah arsitektur VPC multi-CIDR dan pola *VPC Subnet Sharing* terdistribusi dari level underlay routing hingga blueprint otomasi Terraform.

---

## Layer 1: VPC Architectural Foundations & Multi-CIDR Theory

### 1.1 VPC sebagai Batas Isolasi Logis L3

Virtual Private Cloud (VPC) adalah partisi virtual jaringan terisolasi di atas *AWS software-defined infrastructure*.

```mermaid
graph TD
    subgraph VPC["Enterprise Multi-CIDR VPC (vpc-0123456789)"]
        Primary["Primary CIDR: 10.100.0.0/16<br/>(Core Corporate Workloads & DBs)"]
        Sec1["Secondary CIDR 1: 100.64.0.0/16<br/>(RFC 6598 High-Density EKS Pods)"]
        Sec2["Secondary CIDR 2: 10.101.0.0/16<br/>(Dedicated Analytics & Batch)"]
        IPv6["IPv6 CIDR: 2600:1f18:xxxx::/56<br/>(Dual-Stack Internet Ingress)"]
        
        LocalRoute["Local VPC Route Engine (Nitro Silicon)<br/>Semua CIDR di-route otomatis 'local' dengan latensi 0-hop"]
        Primary <--> LocalRoute
        Sec1 <--> LocalRoute
        Sec2 <--> LocalRoute
        IPv6 <--> LocalRoute
    end
```

### 1.2 Aturan Baku & Validasi Secondary CIDR Blocks

Setiap VPC diawali dengan 1 Primary IPv4 CIDR Block (`/16` s/d `/28`). Jika kapasitas IP habis, Anda dapat mengasosiasikan hingga **4 Secondary CIDR Blocks**:

1. **Non-Overlapping Rule**: Secondary CIDR tidak boleh tumpang tindih dengan CIDR yang sudah ada di dalam VPC, atau dengan CIDR pada VPC lain yang terhubung via *VPC Peering* aktif.
2. **Immutability of CIDR Size**: Ukuran blok CIDR yang telah di-attach tidak dapat diubah ukurannya (*non-resizable*). Untuk mengubah ukuran, blok harus di-detach (setelah semua subnet di dalamnya dihapus) lalu di-attach kembali dengan ukuran baru.
3. **Pilihan Ruang Alamat**:
   - RFC 1918 Private Ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
   - RFC 6598 Carrier-Grade NAT (`100.64.0.0/10`).
   - BYOIP (Bring Your Own IP) Public IPv4 Range.
   - Amazon-provided `/56` IPv6 CIDR Block.

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Terapkan arsitektur **VPC Multi-CIDR Dual-Scope**: gunakan blok RFC 1918 (`10.100.0.0/16`) khusus untuk *Node/Host Infrastructure, Load Balancers, dan Databases*, serta blok RFC 6598 (`100.64.0.0/16`) khusus untuk *Container / EKS Pod Data Plane*. Pola ini menjaga integrasi hybrid Direct Connect tetap bersih tanpa ancaman kehabisan IP privat korporasi.
:::

---

## Layer 2: AWS Distributed Underlay & Hyperplane Internals

### 2.1 AWS RAM (Resource Access Manager) Subnet Sharing Underlay

Dalam model **Shared VPC**, akun sentral jaringan (*Network Hub Account*) membuat VPC dan subnet, lalu membagikan subnet tersebut ke akun-akun aplikasi (*Participant Accounts*) melalui AWS RAM:

```mermaid
graph TD
    subgraph Owner["Network Hub Account (Central Network Team)"]
        VPC_Core["Enterprise VPC (10.100.0.0/16)"]
        RT["Central Route Tables & IGW/NAT/TGW"]
        NACL["Network ACLs (Central Compliance Boundary)"]
        Subnet1["Shared Subnet App AZ-1 (10.100.1.0/24)"]
        Subnet2["Shared Subnet App AZ-2 (10.100.2.0/24)"]
        RAM["AWS RAM Resource Share"]
        
        VPC_Core --- RT & NACL
        VPC_Core --- Subnet1 & Subnet2
        Subnet1 & Subnet2 --> RAM
    end

    RAM -->|"Share Subnet via AWS Organizations"| PartA & PartB

    subgraph PartA["Participant Account A (Payments App)"]
        EC2_A["EC2 Instance App A<br/>(Creates Local Security Group A)"] --> Subnet1
    end

    subgraph PartB["Participant Account B (Fraud Engine)"]
        EC2_B["EC2 Instance App B<br/>(Creates Local Security Group B)"] --> Subnet2
    end
```

#### Pemisahan Kewenangan (Separation of Concerns):
- **Network Owner Account**: Mengontrol penuh VPC, Subnetting, CIDR association, Route Tables, Internet Gateways, NAT Gateways, Transit Gateway attachments, VPC Endpoints, dan Network ACLs.
- **Participant Accounts**: Mengontrol *compute resources* (EC2, EKS, RDS) dan **Security Groups** lokal di dalam akun masing-masing.
- **Isolasi Security Group**: Security Groups bersifat *account-scoped*. Participant Account A tidak dapat melihat atau mereferensikan Security Group milik Participant Account B secara langsung, kecuali menggunakan VPC Lattice atau deklarasi IP CIDR.

---

## Layer 3: AWS Resource Deep-Dive & Hard Limits

### 3.1 Availability Zone Mapping Discrepancy (AZ Name vs AZ ID)

Setiap akun AWS memiliki pemetaan acak (*randomized mapping*) antara nama logis AZ (`ap-southeast-1a`) dan fasilitas fisik datacenter:

```
Akun Network Hub  : "ap-southeast-1a" ──> Physical Datacenter "apse1-az1"
Akun Participant A: "ap-southeast-1a" ──> Physical Datacenter "apse1-az2" (MISMATCH!)
```

```mermaid
graph LR
    subgraph MismatchDanger["Bahaya AZ Name Mismatch"]
        Acc1["App di Hub 'ap-southeast-1a' (apse1-az1)"] <-->|"Cross-Physical Datacenter Hop!"| Acc2["DB di Part-A 'ap-southeast-1a' (apse1-az2)"]
    end
```

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Dalam arsitektur *Shared VPC* dan multi-account, **JANGAN PERNAH** mereferensikan Availability Zone menggunakan string nama (`availability_zone = "ap-southeast-1a"`). Selalu gunakan **Availability Zone ID fisik** (`availability_zone_id = "apse1-az1"`) pada kode Terraform untuk menjamin penempatan workload berada di ruang fisik yang sama, mengeliminasi latensi *cross-datacenter* dan biaya *Inter-AZ Data Transfer* ($0.01/GB).
:::

### 3.2 Kuota & Hard Limits VPC

| Parameter Resource | Default Quota | Max Limit | Karakteristik Engineering |
| :--- | :--- | :--- | :--- |
| **VPCs per Region per Account** | 5 | 100 (Adjustable) | Pembatasan partisi VPC. |
| **IPv4 CIDR blocks per VPC** | 5 (1 Primary + 4 Sec) | 5 (Hard Limit) | Total alokasi subnet dibatasi 5 blok. |
| **Subnets per VPC** | 200 | 1,000 (Adjustable) | Jumlah partisi subnet tier. |
| **Route Tables per VPC** | 200 | 500 (Adjustable) | Pengelompokan kebijakan routing. |
| **Routes per Route Table** | 50 | 100 (Adjustable) | Penambahan rute di atas 50 dapat mempengaruhi performa propagasi BGP. |

---

## Layer 4: Hop-by-Hop Packet Walkthrough & Flow Lifecycle

Diagram sequence berikut memvalidasi komunikasi antar instans di akun yang berbeda di dalam sebuah **Shared VPC**:

```mermaid
sequenceDiagram
    autonumber
    participant AppA as "EC2 App (Participant A) [10.100.1.50]"
    participant NitroA as "Nitro Card A (apse1-az1)"
    participant Underlay as "AWS 100GbE Underlay"
    participant NitroB as "Nitro Card B (apse1-az1)"
    participant DBMaster as "RDS DB (Participant B) [10.100.1.100]"

    AppA->>NitroA: IP Packet [Src: 10.100.1.50, Dst: 10.100.1.100, TCP 5432]
    Note over NitroA: 1. Evaluate Egress SG (Participant A Account)<br/>2. Evaluate Central NACL (Network Hub Account)<br/>3. Local VPC Route Match (0-Hop direct transit)<br/>4. Underlay VNI Encapsulation
    NitroA->>Underlay: Transmit Packet across same physical AZ (apse1-az1)
    Underlay->>NitroB: Deliver Packet (< 1 ms latency)
    Note over NitroB: 1. Evaluate Ingress SG (Participant B Account)<br/>2. Evaluate Central NACL (Network Hub Account)<br/>3. Inject to RDS Database
    NitroB->>DBMaster: Deliver PostgreSQL Query
```

---

## Layer 5: Production Terraform IaC & CLI Blueprints

### 5.1 Terraform Blueprint: Central Shared VPC dengan AWS RAM

```hcl
# shared-vpc-hub.tf (Dijalankan di Akun Central Network)
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# 1. Enterprise VPC dengan Primary dan Secondary CIDR
resource "aws_vpc" "shared_vpc" {
  cidr_block           = "10.100.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "vpc-shared-enterprise-prod"
    Environment = "Production"
  }
}

resource "aws_vpc_ipv4_cidr_block_association" "secondary_eks" {
  vpc_id     = aws_vpc.shared_vpc.id
  cidr_block = "100.64.0.0/16"
}

# 2. Subnet dengan Explicit Availability Zone ID (Bukan AZ Name!)
resource "aws_subnet" "shared_app_az1" {
  vpc_id               = aws_vpc.shared_vpc.id
  cidr_block           = "10.100.1.0/24"
  availability_zone_id = "apse1-az1" # Immutable Physical ID

  tags = {
    Name = "snet-shared-app-apse1-az1"
    Tier = "Application"
  }
}

resource "aws_subnet" "shared_app_az2" {
  vpc_id               = aws_vpc.shared_vpc.id
  cidr_block           = "10.100.2.0/24"
  availability_zone_id = "apse1-az2" # Immutable Physical ID

  tags = {
    Name = "snet-shared-app-apse1-az2"
    Tier = "Application"
  }
}

# 3. AWS RAM Resource Share ke Seluruh Organisasi
resource "aws_ram_resource_share" "vpc_share" {
  name                      = "ram-share-enterprise-subnets"
  allow_external_principals = false

  tags = {
    Environment = "Production"
  }
}

# Hubungkan Subnet ke RAM
resource "aws_ram_resource_association" "subnet_assoc_az1" {
  resource_arn       = aws_subnet.shared_app_az1.arn
  resource_share_arn = aws_ram_resource_share.vpc_share.arn
}

resource "aws_ram_resource_association" "subnet_assoc_az2" {
  resource_arn       = aws_subnet.shared_app_az2.arn
  resource_share_arn = aws_ram_resource_share.vpc_share.arn
}

# Bagikan ke AWS Organization Principal
resource "aws_ram_principal_association" "org_assoc" {
  principal          = "arn:aws:organizations::123456789012:organization/o-abcdef1234"
  resource_share_arn = aws_ram_resource_share.vpc_share.arn
}
```

---

## Layer 6: Failure Modes, Edge Cases & SEV-1 Troubleshooting Matrix

### 6.1 Production SEV-1 Incident Matrix

| Gejala Insiden (*Symptoms*) | *Root Cause Analysis* (RCA) | Perintah Verifikasi & Diagnosa CLI | Langkah Mitigasi & Resolusi |
| :--- | :--- | :--- | :--- |
| **Lonjakan tagihan Inter-AZ Data Transfer ($$$)** pada aplikasi mikroservis di Shared VPC. | AZ Name Mismatch: Subnet diprovisikan menggunakan string `ap-southeast-1a` yang memetakan ke AZ ID fisik berbeda antar akun. | `aws ec2 describe-availability-zones --query "AvailabilityZones[*].[ZoneName,ZoneId]"` | Migrasikan subnet untuk selalu menggunakan referensi `availability_zone_id`. |
| **Participant Account tidak dapat mendeploy EC2** pada Shared Subnet. | AWS RAM share belum diterima atau asosiasi principal OU pada AWS Organizations gagal. | `aws ram get-resource-shares --resource-owner OTHER-ACCOUNTS` | Verifikasi status RAM Resource Share di console Participant Account dan accept invitation. |
| **Security Group Rule cross-account gagal di-save** (`InvalidParameterValue`). | Security Group di akun Participant A mencoba mereferensikan SG ID akun Participant B secara langsung (tidak didukung di Shared VPC). | `aws ec2 describe-security-group-rules --filter "Name=group-id,Values=<id>"` | Referensikan blok CIDR `/32` spesifik atau gunakan AWS VPC Lattice untuk abstraksi service-to-service. |
| **Secondary CIDR tidak dapat ditambahkan ke VPC**. | Blok Secondary CIDR yang diajukan beririsan (*overlaps*) dengan rute statis pada Route Table atau peering yang sedang aktif. | `aws ec2 describe-vpc-peering-connections` & `aws ec2 describe-route-tables` | Pilih blok CIDR yang sepenuhnya unik dan belum terdaftar di tabel routing VPC mana pun. |

---

## Layer 7: Principal Architect Tradeoff Framework

```mermaid
graph TD
    Decision{"Pola Arsitektur Multi-Account Backbone"}
    Decision -->|"Pola A"| SharedVPC["Shared VPC (AWS RAM Central Hub)"]
    Decision -->|"Pola B"| VPCPool["Dedicated VPC per Account + Transit Gateway"]
    Decision -->|"Pola C"| VPCLattice["Decentralized VPCs + AWS VPC Lattice"]

    SharedVPC --- T1["Kelebihan: Zero TGW cost, IP address efisien, zero latency overhead<br/>Kekurangan: Blast radius NACL/Subnet terbagi, SG cross-reference terbatas"]
    VPCPool --- T2["Kelebihan: Isolasi absolut per akun, otonomi tim penuh<br/>Kekurangan: Biaya TGW hourly & data processing mahal ($$$), boros alokasi IP"]
    VPCLattice --- T3["Kelebihan: Zero routing complexity, auth L7 IAM native, overlapping IP OK<br/>Kekurangan: Fitur modern, membutuhkan adopsi arsitektur service-mesh"]
```

### Matriks Keputusan Arsitektur: Pola Jaringan Multi-Account

| Dimensi Arsitektural | Shared VPC (AWS RAM) | Dedicated VPC + Transit Gateway | Decentralized + VPC Lattice |
| :--- | :--- | :--- | :--- |
| **Biaya Jaringan (Network Cost)** | **Terendah (Tanpa biaya TGW)** | Tertinggi ($0.05/hr + $0.02/GB TGW)| Sedang (Per-request Lattice pricing)|
| **Latensi Antar-Layanan** | **Terendah (< 1 ms Wire-Speed)**| Menengah (+2-3 ms TGW Hop) | Rendah (Managed L7 Proxy) |
| **Efisiensi Alokasi Alamat IP** | **Sangat Tinggi (Shared Pools)** | Sangat Rendah (Fragmentasi CIDR) | **Maksimum (Overlapping CIDR OK)** |
| **Otonomi Tim & Blast Radius** | Sedang (Terkoneksi di 1 VPC) | **Maksimum (Isolasi Total per VPC)**| **Tinggi (Service-Level Boundary)** |
| **Rekomendasi Arsitektur** | **Standar Enterprise Core Workloads**| Sandbox & Third-Party Vendors | Microservices Modern / Kube-Mesh |
