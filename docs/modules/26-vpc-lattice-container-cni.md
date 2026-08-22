---
title: "Modul 26: AWS VPC Lattice & Modern Container Networking (EKS CNI)"
description: "Zero-proxy application networking, Amazon VPC CNI prefix delegation, Custom Networking, IAM SigV4 auth policies, dan interkoneksi lintas VPC/Akun tanpa TGW."
---

# Modul 26: AWS VPC Lattice & Modern Container Networking (EKS CNI)

<BadgeLabel type="sme" text="Level: Principal / SME" /> <BadgeLabel type="rfc" text="RFC 9110 (HTTP/2) / RFC 6598 (CGNAT) / AWS SigV4" /> <BadgeLabel type="aws" text="VPC Lattice & Amazon EKS VPC CNI" />

Pertumbuhan arsitektur *microservices* dan *container* (Amazon EKS / ECS) skala besar menghadirkan dua tantangan jaringan paling kompleks: **kehabisan alamat IP (IPv4 exhaustion)** akibat penugasan IP VPC langsung ke setiap Pod, serta **kompleksitas operasional service-to-service routing** lintas puluhan VPC dan akun AWS. **Amazon VPC Lattice** merevolusi komunikasi antar-layanan melalui *zero-proxy application networking* di level *underlay*, sementara **Amazon VPC CNI Prefix Delegation** memecahkan batas densitas komputasi Kubernetes.

---

## 1. Layer 1: Protocol Mechanics & RFC Theory

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Terapkan otentikasi **AWS SigV4 (Signature Version 4)** pada layer aplikasi HTTP/2 dan gRPC yang berkomunikasi melalui VPC Lattice. Ini menegakkan arsitektur *Zero-Trust* di mana setiap *request* diverifikasi secara kriptografis berdasarkan IAM Principal pengirim tanpa bergantung pada kontrol perimeter IP semata.
:::

### A. Evolusi Service Mesh: Sidecar Proxy vs Underlay Mesh

Dalam arsitektur *Service Mesh* tradisional (seperti Istio atau Linkerd), setiap Pod menjalankan kontainer *sidecar* (Envoy Proxy) yang mengonsumsi CPU, memori, dan menambahkan *double-hop latency*:

```
Service Mesh Tradisional (Sidecar / Envoy):
[Pod A App] ──(L4 Socket)──> [Envoy Sidecar A] ──(mTLS Wire)──> [Envoy Sidecar B] ──(L4 Socket)──> [Pod B App]
* Overhead: 2x TCP Handshake, 2x TLS Decryption, Konsumsi Memory 50-100MB per Pod.

Zero-Proxy Application Networking (AWS VPC Lattice):
[Pod A App] ──(Link-Local DNS / Nitro Intercept)──> [AWS Underlay Fabric] ──(Nitro ENA)──> [Pod B App]
* Overhead: Zero Sidecar VM/Container, Zero Memory Overhead, Sub-ms Wire-speed Routing.
```

### B. Header HTTP Authorization & IAM SigV4 Signing

Ketika klien memanggil layanan Lattice yang diproteksi oleh *Auth Policy*, klien menyisipkan header tanda tangan kriptografis SHA-256:

```http
GET /orders/v1/checkout HTTP/2
Host: order-service-01a2b3c4.7z8y9x.vpc-lattice-svcs.ap-southeast-1.on.aws
Authorization: AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20260822/ap-southeast-1/vpc-lattice-svcs/aws4_request, SignedHeaders=host;x-amz-date, Signature=k8f7e...
x-amz-date: 20260822T143000Z
x-amz-security-token: IQoJb3JpZ2luX2VjE...
```

Lattice mengevaluasi tanda tangan ini di level *data plane* sebelum meneruskan paket ke *Target Group*, memblokir request yang tidak terotorisasi dengan status `403 Forbidden`.

---

## 2. Layer 2: AWS Distributed Underlay & Hyperplane Internals

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Aktifkan **Amazon VPC CNI Prefix Delegation (`ENABLE_PREFIX_DELEGATION=true`)** pada cluster Amazon EKS. Fitur ini mengalokasikan subnet prefix `/28` (16 alamat IPv4) per slot ENI sekunder, melipatgandakan densitas Pod per node EC2 hingga 4x–10x tanpa memerlukan instance berukuran raksasa.
:::

### A. AWS VPC Lattice Underlay Architecture

```mermaid
graph TD
    subgraph AccountA["AWS Account A: Consumer VPC (10.10.0.0/16)"]
        EKSPod["EKS Microservice Pod (100.64.1.25)"] -->|"Query Lattice DNS"| LatticeLinkLocal["Link-Local DNS Intercept (169.254.171.0/24)"]
        LatticeLinkLocal --> NitroLattice["Nitro VPC Lattice Endpoint Fabric"]
    end

    subgraph ServiceNetwork["AWS VPC Lattice Service Network (Global Control Plane)"]
        NitroLattice --> LatticePolicy["IAM Auth Policy & Context Engine"]
        LatticePolicy --> LatticeRouter["Hyperplane Application Router"]
    end

    subgraph AccountB["AWS Account B: Provider VPC (10.20.0.0/16)"]
        LatticeRouter --> TargetENI["Backend ECS / EC2 Target Group (10.20.2.100:8080)"]
    end
```

1. **Link-Local Intercept**: Klien mengirim paket ke domain Lattice (`*.vpc-lattice-svcs.aws`). Nitro Card mencegat traffic ini dan memetakannya ke rentang link-local internal (`169.254.171.0/24`).
2. **Zero Route Table Modification**: Tidak ada rute yang perlu ditambahkan ke *VPC Route Tables*, tidak membutuhkan *Transit Gateway Attachments*, dan tidak terpengaruh oleh *overlapping CIDR blocks* antar-VPC.

### B. Amazon VPC CNI: Secondary IP vs Prefix Delegation (`/28`)

```
Node EC2: m5.large (Maksimum 3 ENI, 10 IP per ENI)

1. Mode Klasik (Secondary Private IPs):
   ├── ENI 0: 1 Primary IP (Node) + 9 Secondary IPs = 9 Pods
   ├── ENI 1: 1 Primary IP (Node) + 9 Secondary IPs = 9 Pods
   └── ENI 2: 1 Primary IP (Node) + 9 Secondary IPs = 9 Pods
   Total Kapasitas: (3 x 10) - 3 = 27 Pods per Node

2. Mode Prefix Delegation (/28 Prefix per Slot):
   ├── ENI 0: 1 Primary IP + 9 Prefix /28 = (9 x 16) = 144 Pods
   ├── ENI 1: 1 Primary IP + 9 Prefix /28 = (9 x 16) = 144 Pods
   └── ENI 2: 1 Primary IP + 9 Prefix /28 = (9 x 16) = 144 Pods
   Total Kapasitas: Dibatasi batas maksimum Kubernetes Pods per Node (110–250 Pods)
```

---

## 3. Layer 3: AWS Resource Deep-Dive & Hard Limits

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Terapkan pola **Custom Networking pada Amazon VPC CNI** dengan menempatkan Pods di *Secondary VPC CIDR* non-routable (RFC 6598 `100.64.0.0/10`). Node EC2 tetap berada di subnet primer RFC 1918, sementara ribuan Pod menggunakan ruang Carrier-Grade NAT yang di-SNAT otomatis saat keluar ke VPC lain atau On-Premise.
:::

### A. Komponen Utama VPC Lattice

1. **Service Network**: Batas logis (*logical boundary*) yang menghubungkan kumpulan layanan (*Services*) dengan kumpulan konsumen (*VPC Associations*).
2. **Service**: Unit independen yang merepresentasikan aplikasi/microservice, memiliki nama domain DNS yang dikelola penuh oleh AWS.
3. **Listener & Rules**: Mekanisme routing berbasis protokol (HTTP/HTTPS), path URI (`/api/v1/*`), header, dan method.
4. **Target Group**: Backend komputasi yang menerima traffic: Instance EC2, IP Address, ALB, atau AWS Lambda.
5. **Auth Policy**: Kebijakan IAM berbasis resource yang mengevaluasi konteks keamanan setiap request.

### B. Quota & Limits Architecture Matrix

| Parameter / Resource | Batasan Bawaan (Default Quota) | Opsi Skalabilitas |
|---|---|---|
| **Services per Service Network** | 100 | Dapat dinaikkan via AWS Quotas |
| **VPC Associations per Service Network** | 500 | Dapat dinaikkan |
| **Target Groups per Service** | 100 | Soft Limit |
| **Max Targets per Target Group** | 1,000 | Soft Limit |
| **VPC CNI /28 Prefixes per ENI** | Tergantung ukuran instance EC2 | Sesuai batas arsitektur Nitro |
| **VPC CNI Max Pods per Node** | 110 (Default K8s) | Up to 250 via `max-pods` tuning |

---

## 4. Layer 4: Hop-by-Hop Packet Walkthrough & Flow Lifecycle

### A. Cross-Account Microservice Invocation via VPC Lattice

```
[1. Consumer Pod di VPC A (Akun 111111111111)]
   * Pod mengeksekusi: curl https://payment.service.vpc-lattice-svcs.ap-southeast-1.on.aws/charge
   * DNS resolve mengembalikan alamat virtual link-local (169.254.171.12).
       │
       ▼
[2. Nitro Card Controller (Host Underlay)]
   * Nitro menangkap paket ke link-local dan merutekannya ke Hyperplane Lattice Core.
       │
       ▼
[3. VPC Lattice Policy Engine]
   * Mengevaluasi IAM SigV4 Auth Policy:
     - Principal: "arn:aws:iam::111111111111:role/EKS-Payment-Consumer-Role"
     - Action: "vpc-lattice-svcs:Invoke"
     - Resource: "payment.service"
   * Status: PERMITTED.
       │
       ▼
[4. Target Routing & Forwarding]
   * Lattice meneruskan request ke Target Group di VPC B (Akun 222222222222).
   * Diterima oleh Pod Backend di Port 8080.
       │
       ▼
[5. Response dikembalikan simetris ke Consumer Pod di VPC A]
```

### B. EKS VPC CNI Custom Networking & SNAT Egress Flow

```mermaid
sequenceDiagram
    participant Pod as "EKS Pod (100.64.1.55 on eth1)"
    participant Node as "Node Primary Interface (10.0.1.10 on eth0)"
    participant Gateway as "Transit Gateway / On-Premise Core"

    Note over Pod: Pod mengirim paket ke On-Prem Database (192.168.1.50)
    Pod->>Node: IP Packet (Src: 100.64.1.55, Dst: 192.168.1.50)
    
    Note over Node: iptables (AWS-SNAT-CHAIN): SNAT Pod IP ke Primary Node IP
    Note over Node: Packet Header diubah: (Src: 10.0.1.10, Dst: 192.168.1.50)
    
    Node->>Gateway: Forwarded Packet via VPC Route Table
    Gateway-->>Node: Return Traffic (Dst: 10.0.1.10)
    Note over Node: iptables Conntrack De-NAT: (Dst diubah ke 100.64.1.55)
    Node-->>Pod: Packet Diterima oleh Pod
```

---

## 5. Layer 5: Production Terraform IaC & CLI Implementation Blueprints

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Bagikan **VPC Lattice Service Network** ke seluruh akun di organisasi Anda menggunakan **AWS RAM**. Ini memungkinkan tim aplikasi di akun spoke manapun untuk meng-asosiasikan VPC atau Service mereka secara mandiri (*self-service*) tanpa memerlukan intervensi manual dari tim Core Network.
:::

### Blueprint: Production VPC Lattice Service Network with Strict Auth Policy

```hcl
# 1. VPC Lattice Service Network
resource "aws_vpclattice_service_network" "core_mesh" {
  name      = "enterprise-core-mesh"
  auth_type = "AWS_IAM" # Enforce strict IAM SigV4 Authentication

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# 2. Service Network IAM Auth Policy (Zero-Trust Enforcement)
resource "aws_vpclattice_auth_policy" "mesh_security_policy" {
  resource_identifier = aws_vpclattice_service_network.core_mesh.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "vpc-lattice-svcs:Invoke"
        Resource  = "*"
        Condition = {
          StringEquals = {
            "aws:PrincipalOrgID" = "o-enterprise12345" # Only allow AWS Org accounts
          }
        }
      }
    ]
  })
}

# 3. Associate Consumer VPC to Service Network
resource "aws_vpclattice_service_network_vpc_association" "consumer_vpc_assoc" {
  vpc_identifier             = aws_vpc.consumer_vpc.id
  service_network_identifier = aws_vpclattice_service_network.core_mesh.id
  security_group_ids         = [aws_security_group.lattice_consumer_sg.id]

  tags = {
    Role = "ConsumerVPC"
  }
}

# 4. VPC Lattice Target Group (ECS/EKS Backend IP Targets)
resource "aws_vpclattice_target_group" "payment_tg" {
  name   = "payment-service-tg"
  type   = "IP"
  config {
    port            = 8080
    protocol        = "HTTP"
    vpc_identifier  = aws_vpc.provider_vpc.id
    protocol_version = "HTTP2"

    health_check {
      enabled                       = true
      health_check_interval_seconds = 15
      health_check_timeout_seconds  = 5
      healthy_threshold_count       = 2
      unhealthy_threshold_count     = 3
      matcher {
        value = "200"
      }
      path = "/healthz"
    }
  }

  tags = {
    Service = "PaymentCore"
  }
}

# 5. VPC Lattice Service Definition
resource "aws_vpclattice_service" "payment_service" {
  name               = "payment-core-service"
  auth_type          = "AWS_IAM"
  custom_domain_name = "payment.internal.enterprise.com"

  tags = {
    Environment = "Production"
  }
}

# 6. Service Listener and Default Forwarding Rule
resource "aws_vpclattice_listener" "payment_listener" {
  name               = "https-listener"
  protocol           = "HTTPS"
  port               = 443
  service_identifier = aws_vpclattice_service.payment_service.id

  default_action {
    forward {
      target_groups {
        target_group_identifier = aws_vpclattice_target_group.payment_tg.id
        weight                  = 100
      }
    }
  }
}

# 7. Associate Service with Core Service Network
resource "aws_vpclattice_service_network_service_association" "payment_mesh_assoc" {
  service_identifier         = aws_vpclattice_service.payment_service.id
  service_network_identifier = aws_vpclattice_service_network.core_mesh.id
}
```

---

## 6. Layer 6: Failure Modes, Edge Cases, Anti-Patterns & SEV-1 Troubleshooting Matrix

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Saat mengaktifkan Prefix Delegation pada VPC CNI, pastikan *Warm IP/Prefix Target* dikonfigurasi dengan bijak (`WARM_PREFIX_TARGET=1` dan `MINIMUM_IP_TARGET`). Mengonfigurasi *warm target* terlalu agresif akan memakan ribuan IP dari subnet dalam hitungan detik meskipun Pod belum aktif.
:::

| Gejala / Failure Mode | Root Cause Teknis | Perintah Diagnosa / Log Query | Solusi & Mitigasi Definitif |
|---|---|---|---|
| **Lattice HTTP 403 Access Denied** | Request HTTP tidak ditandatangani dengan AWS SigV4, atau IAM Role pemanggil tidak diizinkan di *Auth Policy*. | Periksa Access Logs Lattice di S3 / CloudWatch Logs: `auth_type` dan `access_denied_reason`. | Sertifikasikan request dengan AWS SigV4 SDK atau perbaiki kondisi `aws:PrincipalArn` pada Auth Policy. |
| **EKS Pod Stuck in `ContainerCreating`** | Subnet VPC kehabisan IP address yang berurutan (*contiguous*) untuk mengalokasikan blok prefix `/28`. | `kubectl describe pod <pod-name>`: `FailedCreatePodSandBox: no IP addresses available` | Aktifkan **Custom Networking** dan tambahkan Secondary CIDR `100.64.0.0/10` khusus untuk Pods. |
| **Lattice Target Flapping Unhealthy** | Path health check pada Lattice Target Group mengembalikan status selain `200` (e.g., 301 Redirect / 404). | `aws vpc-lattice list-targets --target-group-identifier <TG_ID>` | Sesuaikan health check path ke endpoint yang mengembalikan HTTP 200 konstan tanpa redirect. |
| **SNAT Exhaustion pada EKS Node Egress** | Ribuan koneksi aktif dari Pods ke database on-premise menyebabkan kehabisan ephemeral port conntrack pada node IP. | Periksa metrik `conntrack_allowance_exceeded` di CloudWatch ENA metrics. | Terapkan connection pooling di backend dan gunakan `AWS_VPC_K8S_CNI_EXTERNALSNAT=true` bila perutean langsung diizinkan. |

---

## 7. Layer 7: Principal Architect Tradeoff Framework

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Gunakan **AWS VPC Lattice** sebagai pilar utama *inter-service communication* antar-VPC dan antar-Akun untuk aplikasi berbasis API (HTTP/HTTPS/gRPC). Tetap pertahankan **AWS Transit Gateway (TGW)** untuk interkoneksi infrastruktur level rendah (Direct Connect hybrid, DNS sync, Active Directory replication, dan centralized egress firewall inspection).
:::

### Comparison: VPC Lattice vs Transit Gateway vs In-Cluster Service Mesh

```mermaid
graph TD
    Start["Kebutuhan Komunikasi Service-to-Service"] --> Q1{"Apakah Komunikasi Berbasis API (HTTP/gRPC) Lintas VPC/Akun?"}
    Q1 -- "Ya" --> Q2{"Perlu Zero-Proxy, IAM SigV4, Overlapping IP Support?"}
    Q2 -- "Ya" --> Lattice["Gunakan AWS VPC Lattice"]
    Q2 -- "Tidak, Butuh Kontrol Istio Granular Intra-Cluster" --> Istio["Gunakan In-Cluster Service Mesh (Istio/Linkerd)"]
    Q1 -- "Tidak (L3/L4 Raw TCP/UDP / Database / Hybrid DX)" --> TGW["Gunakan AWS Transit Gateway (TGW) Hub"]
```

| Parameter Arsitektur | AWS VPC Lattice | AWS Transit Gateway (TGW) | In-Cluster Service Mesh (Istio) |
|---|---|---|---|
| **OSI Layer** | **Layer 7 (HTTP/1.1, HTTP/2, gRPC)** | **Layer 3 / Layer 4 (IP Packets)** | Layer 7 (Envoy Sidecar) |
| **CIDR Overlap Tolerance** | **Sangat Toleran (Zero IP Routing)** | Membutuhkan Private NAT Gateway | Terisolasi di dalam VPC cluster |
| **Security Paradigm** | **IAM SigV4 + L7 Context Auth Policy** | Security Groups + NACLs + Firewall | mTLS + Spiffe/Spire + RBAC |
| **Compute / Latency Overhead** | **Nol Sidecar (Sub-ms Underlay)** | Nol Compute (Hyperplane 50Gbps) | ~50–100MB RAM & +2–4ms per Pod |
| **Cross-Account Management** | **Sederhana via AWS RAM** | Asosiasi Route Table Kompleks | Sulit (Multi-cluster mesh federation) |
| **Cost Model** | $0.025/jam/service + $0.025/GB data | $0.05/jam/attach + $0.02/GB data | Beban biaya RAM/CPU node EC2 |
