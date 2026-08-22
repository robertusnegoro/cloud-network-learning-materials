---
title: "Modul 15: AWS Direct Connect (DX) Deep Dive & Layer 2 Physical Security"
description: "Arsitektur fisik AWS Direct Connect, Meet-Me-Room (MMR), LOA-CFA, Link Aggregation Group (LAG), LACP 802.3ad, dan enkripsi hardware wire-speed IEEE 802.1AE MACsec."
---

# Modul 15: AWS Direct Connect (DX) Deep Dive & Layer 2 Physical Security

<BadgeLabel type="sme" text="Level: Principal / SME" /> <BadgeLabel type="rfc" text="IEEE 802.1AE / IEEE 802.3ad / IEEE 802.1Q" /> <BadgeLabel type="aws" text="AWS Direct Connect & MACsec" />

AWS Direct Connect (DX) menyediakan jalur jaringan privat fisik berkecepatan tinggi yang menghubungkan *data center*, *colocation facility*, atau *corporate on-premises network* langsung ke infrastruktur backbone global AWS tanpa melintasi internet publik. Untuk skala *enterprise*, Direct Connect bukan sekadar kabel fiber optik sederhana, melainkan ekosistem interkoneksi Layer 1 hingga Layer 3 yang membutuhkan kontrol ketat terhadap integritas fisik, redundansi agregasi tautan (*Link Aggregation*), dan enkripsi *wire-speed* di Layer 2 menggunakan **IEEE 802.1AE MACsec**.

---

## 1. Protocol Mechanics & RFC Theory

### A. Anatomi IEEE 802.1AE MACsec (Media Access Control Security)
MACsec bekerja pada **Layer 2 (Data Link Layer)**, mengamankan seluruh frame Ethernet antar perangkat yang terhubung langsung (*point-to-point hop*), termasuk payload Layer 3 (IP) dan header Layer 4 (TCP/UDP), serta header IEEE 802.1Q VLAN tag.

```
Standard Ethernet Frame:
+---------------+---------------+---------------+----------+-------------+-----+
| Dst MAC (6B)  | Src MAC (6B)  | EtherType(2B) | VLAN Tag | IP + Data   | FCS |
+---------------+---------------+---------------+----------+-------------+-----+

MACsec Protected Frame (with SecTAG):
+---------------+---------------+---------------+-------------------+----------------------+-----+
| Dst MAC (6B)  | Src MAC (6B)  | SecTAG (16B)  | Original EtherType| Encrypted Payload    | ICV |
| (Plaintext)   | (Plaintext)   | (Plaintext)   | + VLAN + IP Data  | (AES-GCM-128/256)    | 16B |
+---------------+---------------+---------------+-------------------+----------------------+-----+
```

#### Struktur SecTAG (Security Tag - 16 Bytes):
1. **MACsec EtherType (2 Bytes)**: Selalu bernilai `0x88E5` yang mengidentifikasi frame terenkripsi MACsec.
2. **TCI / AN (1 Byte)**: *Tag Control Information* (TCI) dan *Association Number* (AN) untuk menentukan identitas Secure Association (SA).
3. **Short Length (SL - 1 Byte)**: Panjang payload jika kurang dari 48 bytes (0 untuk payload standar).
4. **Packet Number (PN - 4 Bytes)**: Nomor urut paket untuk proteksi *anti-replay attacks*. Ketika PN mencapai $2^{32}-1$ (atau $2^{64}-1$ dengan XPN - *Extended Packet Numbering*), kunci SA wajib dirotasi.
5. **SCI (Secure Channel Identifier - 8 Bytes)**: Gabungan dari MAC Address pengirim (6 Bytes) dan Port ID (2 Bytes).
6. **ICV (Integrity Check Value - 16 Bytes)**: Hash kriptografis AES-GCM (128-bit atau 256-bit) di ujung frame untuk verifikasi *data integrity* dan autentikasi keaslian origin paket.

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Untuk koneksi AWS Direct Connect 10 Gbps dan 100 Gbps, selalu gunakan enkripsi **MACsec dengan AES-GCM-256** dan aktifkan **XPN (Extended Packet Numbering)**. Pada traffic throughput 100 Gbps dengan frame standar 1518 byte ($8.22 \times 10^6 \text{ frames/sec}$), 32-bit Packet Number standar akan *exhausted* (mencapai $2^{32}$) hanya dalam waktu **8.7 menit**, memaksa re-keying berulang yang berisiko memicu *micro-flapping* jika hardware router on-premises lambat dalam negosiasi MKA.
:::

### B. MKA (MACsec Key Agreement Protocol - IEEE 802.1X-2010)
MKA mengatur otentikasi mutual dan distribusi ephemeral session keys (**SAK - Secure Association Key**) antara On-Premises Customer Edge (CE) router dan AWS Direct Connect Router.
- **CAK (Connectivity Association Key)**: Kunci simetris jangka panjang (Pre-Shared Key) 128/256-bit.
- **CKN (Connectivity Key Name)**: String hex identitas unik 32-octet (64 hex characters) yang merepresentasikan CAK.
- **SAK (Secure Association Key)**: Kunci enkripsi ephemeral yang digenerate dinamis oleh MKA Key Server untuk mengenkripsi data payload secara aktual.

$$\text{SAK Rotation Trigger} = \text{Packet Number Overflow} \lor \text{Time-based Expiry (default 1 hour)}$$

### C. Link Aggregation Control Protocol (IEEE 802.3ad / LACP)
LACP memungkinkan penggabungan hingga 4 physical links 1G/10G/100G menjadi satu entri logis tunggal (**LAG - Link Aggregation Group**).
- **LACPDU (LACP Data Units)** dikirimkan ke multicast destination MAC `01:80:C2:00:00:02` dengan EtherType `0x8809`.
- Mode LACP wajib diset ke **Active Mode** di sisi Customer Edge router.
- *Frame Distribution Hashing*: Traffic didistribusikan ke anggota link LAG berdasarkan kalkulasi hash:

$$h = \text{CRC32}(\text{Src IP} \oplus \text{Dst IP} \oplus \text{Src Port} \oplus \text{Dst Port}) \pmod N$$

di mana $N$ adalah jumlah link aktif dalam LAG.

---

## 2. AWS Distributed Underlay & Hyperplane Physical Topology

AWS Direct Connect beroperasi di fasilitas Colocation Tier-3/Tier-4 pihak ketiga yang disebut **AWS Direct Connect Locations** (misal: Equinix, Digital Realty, NTT, Telkom Landmark Tower).

```
+-----------------------------------------------------------------------------------------------+
|                             AWS Direct Connect Colocation Facility                            |
|                                                                                               |
|  [Customer / Telco Cage]               [Meet-Me-Room (MMR)]               [AWS Private Cage]  |
|  +--------------------+               +--------------------+              +-----------------+ |
|  | Customer Edge (CE) |               | Passive Optical    |  LOA-CFA     | AWS Direct      | |
|  | Router (Cisco/     |==============>| Patch Panel (ODF)  |=============>| Connect Edge    | |
|  | Juniper/Arista)    | Single-Mode   | (LC-LC Cross-Conn) | Single-Mode  | Router (CofC)   | |
|  +--------------------+ Fiber (SMF)   +--------------------+ Fiber (SMF)  +-----------------+ |
|                                                                                    |          |
+------------------------------------------------------------------------------------+----------+
                                                                                     | 100GbE /
                                                                                     | 400GbE DWDM
                                                                                     v
                                                                        +-----------------------+
                                                                        | AWS Global Backbone & |
                                                                        | Nitro Underlay Mesh   |
                                                                        +-----------------------+
```

### Komponen Fisik & Alur Penyambungan:
1. **Letter of Authorization - Connecting Facility Assignment (LOA-CFA)**: Dokumen otorisasi resmi dari AWS yang mencantumkan port ID fisik spesifik, nomor rak (*rack location*), dan nomor patch panel di mana port AWS berada.
2. **Cross-Connect**: Kabel Single-Mode Fiber (SMF 9/125 $\mu$m) yang ditarik oleh teknisi pengelola colocation facility dari patch panel customer cage ke patch panel AWS di Meet-Me-Room (MMR).
3. **Optical Transceiver Optics**:
   - **1 Gbps**: 1000BASE-LX (1310 nm) Single-Mode Fiber.
   - **10 Gbps**: 10GBASE-LR (1310 nm) Single-Mode Fiber.
   - **100 Gbps**: 100GBASE-LR4 (1310 nm WDM) atau 100GBASE-CWDM4.

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Sebelum mengaktifkan BGP atau MACsec, lakukan pengukuran optik Layer 1. Redaman sinyal (*optical attenuation*) wajib berada di antara **$-3 \text{ dBm}$ hingga $-10 \text{ dBm}$**. Jika $R_x \text{ optical power} < -14 \text{ dBm}$, frame CRC error dan packet loss mikroskopik akan terjadi, yang menyebabkan *BGP session reset* saat throughput melonjak tinggi.
:::

---

## 3. Resource Specifications, Limits & Comparison

| Parameter Teknis | Dedicated Connection | Hosted Connection | Hosted VIF (Legacy) |
|---|---|---|---|
| **Port Bandwidth** | 1 Gbps, 10 Gbps, 100 Gbps | 50 Mbps s/d 10 Gbps | Up to 1 Gbps |
| **Physical Ownership** | Port fisik terisolasi 1:1 milik customer | Port virtual dialokasikan di atas trunk partner | Shared VIF pada port partner |
| **MACsec Encryption Support** | **Ya** (khusus 10 Gbps & 100 Gbps pada lokasi terpilih) | **Tidak didukung** | **Tidak didukung** |
| **LAG (Link Aggregation)** | **Ya** (hingga 4 port per LAG) | Tidak didukung | Tidak didukung |
| **Jumbo Frames (MTU)** | **9001 Bytes** | **9001 Bytes** (jika didukung partner) | 1500 Bytes |
| **Maksimum VIF per Connection** | 50 Virtual Interfaces | 1 Virtual Interface | 1 Virtual Interface |
| **BGP Peering Control** | Full Control (Autonomous System & MD5) | Full Control | Terbatas |

### Kuota & Hard Limits AWS Direct Connect:
- **Maksimum LAG Size**: 4 koneksi fisik per LAG (total 400 Gbps untuk $4 \times 100\text{G}$).
- **VIF per Dedicated Connection**: 50 VIF (Private / Public / Transit).
- **Prefix Limit per Private VIF**: 100 IPv4 BGP routes (Hard Limit, session reset jika terlampaui).
- **Prefix Limit per Transit VIF**: 100 IPv4 BGP routes (Direct Connect Gateway).
- **Prefix Limit per Public VIF**: AWS meng-advertise $\approx 5,000+$ public prefix global AWS; customer dapat meng-advertise hingga 1,000 prefix on-premises.

---

## 4. Hop-by-Hop Physical & Packet Lifecycle

```
[On-Premises Host: 10.0.1.50]
        |
        | 1. IP Packet (Payload)
        v
[Customer Edge Router (CE)]
        | 2. Encapsulate 802.1Q (VLAN Tag: 100)
        | 3. Compute SecTAG (PN=1045, SCI=CE_MAC+Port01)
        | 4. AES-GCM-256 Encrypt (VLAN + IP + Data)
        | 5. Append ICV (16 Bytes)
        v
[Single-Mode Fiber Cross-Connect (MMR)]  <--- 100% Encrypted Wire (MACsec)
        v
[AWS Direct Connect Edge (CofC Router)]
        | 6. Validate ICV & Replay Protection (SecTAG PN)
        | 7. Decrypt Payload via SAK (AES-GCM-256)
        | 8. Strip SecTAG & Map 802.1Q VLAN 100 to Virtual Interface (VIF)
        v
[AWS Cloud Underlay / Hyperplane Virtual Router]
        | 9. Encapsulate into AWS Underlay (Geneve / VPC Tunnel)
        v
[AWS EC2 Instance / Target Workload: 10.100.1.10]
```

---

## 5. Production Terraform IaC & CLI Implementation

### A. Terraform: Direct Connect Dedicated Connection, LAG, & MACsec CKN/CAK Association

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# 1. AWS Direct Connect Link Aggregation Group (LAG)
resource "aws_dx_lag" "enterprise_lag" {
  name                  = "dx-lag-primary-singapore"
  location              = "EqSG1" # Equinix SG1 Colocation
  connections_bandwidth = "10Gbps"
  number_of_connections = 2

  tags = {
    Environment = "Production"
    Role        = "Core-Direct-Connect-LAG"
  }
}

# 2. Direct Connect Connection with MACsec Capability
resource "aws_dx_connection" "primary" {
  name                  = "dx-conn-primary-01"
  location              = "EqSG1"
  bandwidth             = "10Gbps"
  lag_id                = aws_dx_lag.enterprise_lag.id
  request_macsec        = true
  encryption_mode       = "must_encrypt" # Strictly drop unencrypted frames

  tags = {
    Name = "dx-conn-primary-01"
  }
}

# 3. AWS Secrets Manager for MACsec Pre-Shared Key (CAK & CKN)
resource "aws_secretsmanager_secret" "macsec_key" {
  name                    = "dx/macsec/primary-key"
  description             = "Direct Connect MACsec CKN and CAK credentials"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "macsec_key_val" {
  secret_id = aws_secretsmanager_secret.macsec_key.id
  secret_string = jsonencode({
    ckn = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF"
    cak = "FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210"
  })
}

# 4. Associate MACsec Key to Direct Connect Connection
resource "aws_dx_macsec_key_association" "primary" {
  connection_id = aws_dx_connection.primary.id
  secret_arn    = aws_secretsmanager_secret.macsec_key.arn
  ckn           = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF"
  cak           = "FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210"
}
```

### B. Cisco IOS-XE / ASR-9000 MACsec & LACP Production Configuration Snippet

```cisco
! 1. Definisi Key-Chain MACsec MKA (AES-256)
key chain MACSEC-KEY-CHAIN macsec
 key 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF
  cryptographic-algorithm aes-256-cmac
  key-string FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210

! 2. MACsec MKA Policy
mka policy AWS-MACSEC-POLICY
 cipher-suite gcm-aes-256
 send-secure-channel-id
 delay-protection
 include-icv-indicator
 replay-window-size 64

! 3. Physical Port Configuration dengan LACP & MACsec
interface TenGigabitEthernet0/0/1
 description Direct-Connect-Port-01-to-AWS-EqSG1
 no ip address
 channel-group 10 mode active
 macsec
 mka policy AWS-MACSEC-POLICY
 mka pre-shared-key key-chain MACSEC-KEY-CHAIN
 macsec replay-protection window-size 64

interface Port-channel 10
 description Aggregated-LAG-to-AWS
 no ip address
 mtu 9001
 no shutdown
```

---

## 6. Failure Modes, Edge Cases & SEV-1 Troubleshooting Matrix

| Gejala Insiden (Symptom) | Root Cause Analysis (RCA) | Triage CLI & Verifikasi | Remediasi Permanen |
|---|---|---|---|
| **Port State DOWN / Not Light** | Redaman optik melebihi batas atau Tx/Rx fiber polarity terbalik pada ODF patch panel di MMR. | `show interfaces TenGigabitEthernet0/0/1 transceiver detail` $\to$ Cek $R_x \text{ power} < -14\text{ dBm}$. | Minta pengelola colocation melakukan *fiber cleaning*, periksa polaritas A-to-B, atau re-splice fiber. |
| **LACP Standalone State** | Router on-premise diset ke `mode passive` atau partner DX provider men-drop frame LACPDU. | `show lacp neighbor` $\to$ Port state *suspended* / *individual*. | Ubah mode LACP ke `active` di CE router; pastikan provider WAN mendukung L2 transparent pass-through. |
| **MKA Session Negotiation Failed (MACsec Down)** | CKN atau CAK string mismatch antara AWS Secrets Manager dan CE Key-chain; atau rotasi kunci tanpa grace period. | `show mka sessions` $\to$ Status `PENDING` atau `FAIL_AUTH`. | Sinkronisasi string CKN (64 Hex) & CAK (64 Hex); deploy dual-key chain dengan interval overlap 30 menit saat rotasi kunci. |
| **Packet Loss pada Jumbo Frames (>1500 Bytes)** | MTU mismatch: Port-channel diset 9001 byte namun physical interface masih 1500 byte, atau provider transit memotong MTU. | `ping 10.100.1.1 size 8972 df-bit` (ICMP ping fails with DF set). | Set MTU 9001 di physical interface, Port-channel, dan VIF sub-interfaces secara konsisten. |

---

## 7. Principal Architect Tradeoff Framework

```
                          [DIRECT CONNECT STRATEGY]
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
 [100% Dedicated Connection]                              [Hosted Connection]
   - Max Security (MACsec 256)                              - Faster Lead Time (Days vs Weeks)
   - Max Bandwidth (Up to 400G LAG)                         - Lower Cost for < 1Gbps
   - Higher CapEx / Port Hour Fee                           - Shared Underlay Physical Link
   - Lead time: 2-8 Weeks (Cross-Connect)                   - No MACsec / No LAG
```

### Decision Matrix: Dedicated vs Hosted vs IPsec-Over-DX

| Kriteria Keputusan | Dedicated DX + MACsec | Hosted DX (Partner) | Direct Connect + IPsec VPN |
|---|---|---|---|
| **Kebutuhan Regulasi Data-in-Transit** | **PCI-DSS / ISO 27001 L2 Hardware Encrypted** | Enkripsi harus di Layer 3/Layer 7 | Enkripsi Layer 3 IPsec Tunnel |
| **Throughput & Latency Overhead** | **Wire-speed (0% CPU latency overhead, <1.2ms)** | Wire-speed, no encryption overhead | CPU Overhead enkripsi IPsec (caps at 1.25 Gbps/tunnel) |
| **SLA Ketersediaan Fisik** | 99.99% (Dual Locations, Dual Devices) | 99.9% (Tergantung Partner SLA) | 99.99% |
| **Kompleksitas Operasional** | Tinggi (Membutuhkan pengelolaan MMR & Fiber) | Rendah (Managed via Partner Portal) | Sedang (Tuning IKEv2 / IPsec MTU) |
