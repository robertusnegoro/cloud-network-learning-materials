---
title: "Modul 21: TGW Advanced: Appliance Mode, Multicast & TGW Connect"
description: "Pencegahan asimetri routing stateful firewall dengan Appliance Mode, cloud multicast IGMPv2, dan integrasi SD-WAN native melalui TGW Connect GRE tunnels."
---

# Modul 21: TGW Advanced: Appliance Mode, Multicast & TGW Connect

<BadgeLabel type="sme" text="Level: Principal / SME" /> <BadgeLabel type="rfc" text="RFC 2784 (GRE) / RFC 2236 (IGMPv2) / Stateful Symmetry" /> <BadgeLabel type="aws" text="TGW Appliance Mode & Connect" />

Pada arsitektur keamanan *enterprise hub-and-spoke*, menempatkan *Next-Generation Firewall (NGFW)* terpusat (seperti Palo Alto Networks, Fortinet FortiGate, atau Check Point) di dalam *Inspection VPC* seringkali memicu insiden fatal: **TCP Reset / Silent Packet Drops** akibat *Asymmetric Routing*. Modul ini membedah fitur-fitur tingkat lanjut AWS Transit Gateway: **TGW Appliance Mode** untuk penjaminan simetri stateful inspeksi, **TGW Multicast** untuk streaming finansial berlatensi rendah, dan **TGW Connect** berbasis enkapsulasi **GRE (RFC 2784)** untuk interkoneksi SD-WAN berkecepatan hingga 20 Gbps per attachment.

---

## 1. Protocol Mechanics & RFC Theory

### A. Bahaya Asimetri Routing & Solusi TGW Appliance Mode

Stateful Firewall memelihara *Connection State Table* (TCP SYN $\to$ SYN-ACK $\to$ ACK). Jika paket *request* masuk melalui Firewall di **AZ-A**, namun paket *response* kembali melalui Firewall di **AZ-B**, Firewall di AZ-B akan langsung men-drop paket tersebut karena tidak memiliki rekaman *TCP handshake* awal (**State Drop / Out-of-State Packet Drop**).

```
TANPA Appliance Mode (Asymmetric State Drop Terjadi):
[Spoke VPC 1 (AZ-a)] ---> [TGW] ---> [Firewall ENI di AZ-a] (State Table: Created) ---> [Spoke VPC 2 (AZ-b)]
                                                                                                |
[Spoke VPC 1 (AZ-a)] <--- [TGW] <--- [Firewall ENI di AZ-b] (State Table: MISSING -> DROP!) <--+

DENGAN Appliance Mode Support = ENABLE:
[Spoke VPC 1 (AZ-a)] ---> [TGW] ---> [Firewall ENI di AZ-a] (State Table: Created) ---> [Spoke VPC 2 (AZ-b)]
                                                                                                |
[Spoke VPC 1 (AZ-a)] <--- [TGW] <=== [PINNED KE FIREWALL ENI DI AZ-a SECARA SIMETRIS!] <--------+
```

#### Mekanisme Kerja Appliance Mode:
Ketika `appliance_mode_support = "enable"` diaktifkan pada VPC Attachment milik *Inspection VPC*, TGW akan menggunakan **hashing algoritma deterministik 5-tuple** untuk mengarahkan traffic *forward* dan traffic *reverse* (kembali) ke **Transit Subnet ENI di Availability Zone yang sama persis**, memastikan simetri aliran data dua arah $100\%$ terjaga.

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Aktifkan `appliance_mode_support = "enable"` **HANYA pada attachment Inspection/Security VPC**. Jangan pernah mengaktifkannya pada Spoke VPC biasa karena akan menambah kalkulasi hashing underlay yang tidak diperlukan dan membatasi fleksibilitas distribusi traffic multi-AZ aplikasi normal.
:::

---

### B. TGW Multicast (IGMPv2 - RFC 2236)
AWS VPC secara bawaan tidak mendukung *Layer 2 Broadcast* maupun *Native Multicast*. Namun, **TGW Multicast** menyediakan arsitektur *Software-Defined Multicast* di Layer 3:
- **IGMPv2 Support**: Anggota grup (*Group Members*) mengirimkan paket *IGMP Join / Leave* (Destination IP `224.0.0.0/4`) ke TGW.
- **Multicast Domain**: Batas keamanan logis di dalam TGW yang mengelompokkan *Multicast Sources* (pengirim data, misal: feed bursa saham) dan *Multicast Members* (penerima data).
- **Underlay Packet Replication**: Mesin Hyperplane TGW menduplikasi paket multicast secara internal dan mendistribusikannya secara point-to-point ke seluruh ENI member yang terdaftar tanpa membebani CPU pengirim.

---

### C. TGW Connect: Native GRE (RFC 2784) & BGP untuk SD-WAN
Sebelum adanya TGW Connect, menghubungkan perangkat SD-WAN (seperti Cisco SD-WAN, Silver Peak, Fortinet) ke TGW mengharuskan pembuatan *IPsec VPN Tunnel* yang dibatasi batas throughput **1.25 Gbps per tunnel** dan memakan beban CPU enkripsi tinggi.

```
+-----------------------------------------------------------------------------------------------+
|                                  TGW Connect Architecture                                     |
|                                                                                               |
|  [VPC Core Infrastructure / Direct Connect]                                                   |
|  +-----------------------------------------------------------------------------------------+  |
|  | SD-WAN Virtual Appliance (Cisco / Fortinet)                                              |  |
|  | Private IP: 10.100.1.10                                                                 |  |
|  +-----------------------------------------------------------------------------------------+  |
|         |                                                                                     |
|         | Native GRE Tunnel (RFC 2784) - No IPsec CPU Overhead (Up to 5 Gbps / Tunnel)        |
|         | BGP Dynamic Peering (eBGP ASN 65001 <-> ASN 64512) + BFD Sub-Second Failover        |
|         v                                                                                     |
|  +-----------------------------------------------------------------------------------------+  |
|  | AWS Transit Gateway Connect Attachment (Hyperplane SDN Hub)                             |  |
|  | Aggregate Bandwidth: Up to 20 Gbps (4 Parallel GRE Tunnels)                              |  |
|  +-----------------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Resource Specifications, Limits & Quotas

| Dimensi Parameter | TGW Appliance Mode | TGW Multicast | TGW Connect (GRE) |
|---|---|---|---|
| **Protokol / Enkapsulasi** | 5-Tuple State Pinning | IGMPv2 / Hyperplane Rep | **GRE (RFC 2784) + BGP** |
| **Max Throughput per Unit** | 50 Gbps per Attachment | Up to 100 Mbps per source | **5 Gbps per GRE Tunnel** |
| **Agregasi Bandwidth Maksimum** | Line-rate Hyperplane | Scale per member ENI | **Hingga 20 Gbps** (4 Tunnels) |
| **Dynamic Routing Protocol** | Static / Propagated | IGMP Join / Leave | **BGP-4 over GRE + BFD** |
| **Jumbo Frames (MTU)** | 9001 Bytes (Intra-Region) | 1500 Bytes | **8500 Bytes** (GRE Overhead) |

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Gunakan **TGW Connect** untuk integrasi NVA (Network Virtual Appliance) dan SD-WAN alih-alih IPsec VPN. Selain melipatgandakan throughput per tunnel dari 1.25 Gbps menjadi **5 Gbps**, TGW Connect mendukung **BFD (Bidirectional Forwarding Detection)** untuk mendeteksi kegagalan perangkat NVA dalam waktu kurang dari 1 detik.
:::

---

## 3. Hop-by-Hop Packet Walkthrough & Flow Lifecycle (Appliance Mode)

```
[Spoke-1 Client: 10.10.1.20 in AZ-1a]
        |
        v
[TGW Ingress: Route Table sends 0.0.0.0/0 to Inspection VPC Attachment]
        | 1. Appliance Mode Hashing evaluates 5-tuple: Ingress AZ = AZ-1a
        | 2. TGW Pins traffic to Inspection VPC Subnet ENI in AZ-1a
        v
[Next-Gen Firewall (Palo Alto / Fortinet) in AZ-1a]
        | 3. Stateful Engine inspects packet, approves, and creates Session State Table entry
        | 4. Firewall routes packet back to TGW towards Spoke-2 (10.20.1.50)
        v
[Spoke-2 Target Server: 10.20.1.50 in AZ-1b]
        | 5. Server processes request and generates Response Packet back to 10.10.1.20
        v
[TGW Ingress from Spoke-2: AZ-1b]
        | 6. TGW evaluates Appliance Mode on Target Inspection Attachment
        | 7. CRITICAL: TGW overrides normal AZ-1b routing and forces packet back to AZ-1a ENI!
        v
[Next-Gen Firewall in AZ-1a]
        | 8. Matches Existing Session State Table! Packet accepted and forwarded!
        v
[Spoke-1 Client: 10.10.1.20 in AZ-1a]
```

---

## 4. Production Terraform IaC Implementation

### A. Terraform: TGW Appliance Mode on Security VPC & TGW Connect GRE

```hcl
# 1. Hub Transit Gateway
resource "aws_ec2_transit_gateway" "main_tgw" {
  description     = "Enterprise Hub Transit Gateway"
  amazon_side_asn = 64512

  tags = { Name = "tgw-advanced-hub" }
}

# 2. Security VPC Attachment WITH Appliance Mode ENABLED
resource "aws_ec2_transit_gateway_vpc_attachment" "security_vpc_attach" {
  transit_gateway_id     = aws_ec2_transit_gateway.main_tgw.id
  vpc_id                 = "vpc-0sec0000000000000"
  subnet_ids             = ["subnet-sec-transit-az1", "subnet-sec-transit-az2"]
  appliance_mode_support = "enable" # MANDATORY: Stateful Firewall Symmetry!

  tags = {
    Name = "tgw-attach-security-appliance-mode"
  }
}

# 3. TGW Connect Attachment (Underlying Transport VPC)
resource "aws_ec2_transit_gateway_connect" "sdwan_connect" {
  transport_transit_gateway_attachment_id = aws_ec2_transit_gateway_vpc_attachment.security_vpc_attach.id
  transit_gateway_id                      = aws_ec2_transit_gateway.main_tgw.id

  tags = { Name = "tgw-connect-sdwan" }
}

# 4. TGW Connect Peer (Native GRE Tunnel with BGP)
resource "aws_ec2_transit_gateway_connect_peer" "sdwan_peer_1" {
  transit_gateway_attachment_id = aws_ec2_transit_gateway_connect.sdwan_connect.id
  connect_peer_options {
    protocol = "GRE"
  }
  peer_address            = "10.100.1.10"       # IP Appliance NVA SD-WAN
  inside_cidr_blocks      = ["169.254.100.0/29"] # BGP Peering Subnet (/29 required)
  bgp_asn                 = 65001               # NVA SD-WAN BGP ASN

  tags = { Name = "tgw-connect-peer-sdwan-01" }
}
```

### B. Fortinet FortiGate / Cisco SD-WAN GRE & BGP Configuration

```cisco
! 1. Cisco SD-WAN GRE Interface to TGW Connect
interface Tunnel100
 description GRE-to-AWS-TGW-Connect
 ip address 169.254.100.2 255.255.255.248
 ip mtu 8500
 ip tcp adjust-mss 8460
 tunnel source GigabitEthernet1
 tunnel mode gre ip
 tunnel destination <TGW_Connect_Peer_Address>

! 2. BGP Dynamic Peering over GRE with BFD
router bgp 65001
 neighbor 169.254.100.1 remote-as 64512
 neighbor 169.254.100.1 fall-over bfd
 neighbor 169.254.100.1 description Peering-to-TGW-Connect
```

---

## 5. Failure Modes, Edge Cases & SEV-1 Troubleshooting Matrix

| Gejala Insiden (Symptom) | Root Cause Analysis (RCA) | Triage CLI & Verifikasi | Remediasi Permanen |
|---|---|---|---|
| **Intermittent TCP Hang pada NGFW** | Appliance Mode belum diaktifkan pada attachment Inspection VPC, menyebabkan response packet terkirim ke AZ yang salah. | Cek firewall logs: *TCP out-of-state drop* / *Drop: First packet is not SYN*. | Eksekusi `aws ec2 modify-transit-gateway-vpc-attachment --transit-gateway-attachment-id tgw-attach-xxx --options ApplianceModeSupport=enable`. |
| **GRE Tunnel Flapping pada TGW Connect** | Inside CIDR block tidak berukuran `/29`, atau IP conflict pada rentang `169.254.0.0/16`. | `aws ec2 describe-transit-gateway-connect-peers` $\to$ State `pending` / `failing`. | Gunakan alokasi `/29` unik dari rentang APIPA `169.254.0.0/16` atau RFC 1918 untuk setiap Connect Peer. |
| **Multicast Feed Tidak Diterima Member** | Subnet EC2 member tidak diasosiasikan ke TGW Multicast Domain, atau IGMPv2 packet di-drop oleh Security Group. | `aws ec2 search-transit-gateway-multicast-groups` $\to$ Member ENI tidak terdaftar. | Izinkan protokol IGMP (IP protocol 2) pada Security Group dan daftarkan subnet ke Multicast Domain. |
| **BGP Flapping over GRE Tunnel** | MTU paket GRE melebihi 8500 byte tanpa MSS Clamping, memicu fragmentasi paket update BGP. | `show ip bgp summary` $\to$ Sesi BGP reset saat routing table bertambah besar. | Atur MTU interface GRE menjadi 8500 byte dan aktifkan MSS Clamping `8460` bytes. |

---

## 6. Principal Architect Tradeoff Framework

```
                          [FIREWALL & SD-WAN INTEGRATION]
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
         v                               v                               v
   [TGW + GWLB]                 [TGW Connect (GRE)]              [TGW + IPsec VPN]
- L3/L4 Inspection via Geneve   - Direct SD-WAN overlay router    - Generic IPsec VPN
- Autoscaling NGFW Fleet        - 5 Gbps per GRE tunnel           - Limited to 1.25 Gbps
- Appliance Mode Supported      - BGP + BFD native over GRE       - High CPU crypto overhead
- Best for Central Inspection   - Best for SD-WAN Integration     - Best for Legacy IPsec
```
