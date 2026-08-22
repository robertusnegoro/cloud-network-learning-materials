---
title: "Modul 05: AWS Hardware Underlay, Nitro System, ENA Express & Hyperplane"
description: "Arsitektur fisik Leaf-Spine Clos underlay, AWS Nitro Card hardware offloading, protokol Scalable Reliable Datagram (SRD), dan engine state-machine terdistribusi AWS Hyperplane."
---

# Modul 05: AWS Hardware Underlay, Nitro System, ENA Express & Hyperplane

<BadgeLabel type="sme" text="Level: Principal / SME" /> <BadgeLabel type="aws" text="Nitro Hardware & Hyperplane Flow Engine" /> <BadgeLabel type="infra" text="Physical Clos Underlay & SRD" />

Di balik abstraksi software-defined VPC yang sederhana, AWS mengoperasikan salah satu infrastruktur jaringan fisik dan sistem komputasi terdistribusi paling masif di dunia. Pemahaman mendalam tentang **arsitektur perangkat keras AWS Nitro, underlay Clos fabric, dan engine distributed flow state Hyperplane** adalah pembeda utama antara administrator cloud konvensional dan *Principal Cloud Network Architect*.

Modul ini mengupas tuntas apa yang terjadi di level silikon dan kabel serat optik ketika sebuah paket ditransmisikan melintasi datacenter AWS.

---

## Layer 1: Physical Underlay & Hardware Virtualization Theory

### 1.1 Topologi Fisik Datacenter: Non-Blocking Clos Network

Infrastruktur fisik AWS Availability Zone dibangun di atas topologi **Multi-Tier Clos Network (Leaf-Spine Architecture)**:

```mermaid
graph TD
    subgraph SpineLayer["Spine Switch Tier (Core Crossbar Fabric)"]
        S1["Spine Switch 1"]
        S2["Spine Switch 2"]
        S3["Spine Switch 3"]
        S4["Spine Switch 4"]
    end

    subgraph AggLayer["Aggregation Switch Tier (Pod Aggregators)"]
        A1["Agg Switch A1"]
        A2["Agg Switch A2"]
        B1["Agg Switch B1"]
        B2["Agg Switch B2"]
    end

    subgraph ToRLayer["Top-of-Rack (ToR) Leaf Switches"]
        ToR1["ToR Leaf 1 (Rack 1)"]
        ToR2["ToR Leaf 2 (Rack 2)"]
    end

    subgraph Racks["Physical Server Racks (EC2 Nitro Hosts)"]
        H1["EC2 Host 1"]
        H2["EC2 Host 2"]
        H3["EC2 Host 3"]
        H4["EC2 Host 4"]
    end

    ToR1 --- A1 & A2
    ToR2 --- B1 & B2
    A1 & A2 --- S1 & S2 & S3 & S4
    B1 & B2 --- S1 & S2 & S3 & S4
    H1 & H2 --- ToR1
    H3 & H4 --- ToR2
```

#### Karakteristik Fisik Clos Fabric:
- **Non-Blocking Bisectional Bandwidth**: Setiap server fisik dapat berkomunikasi dengan server fisik lain di dalam AZ yang sama pada kecepatan penuh (*full line-rate 100G/200G/400G*) tanpa *oversubscription*.
- **Kelemahan TCP Tradisional di Clos Network**: Algoritma ECMP tradisional melakukan hashing 5-tuple flow ke 1 jalur tetap. Jika terjadi *hash collision* (beberapa aliran besar berbagi link fisik yang sama), akan timbul **incast congestion**, antrean buffer meledak (*bufferbloat*), dan lonjakan latensi ekor (**P99 / P99.9 tail latency spike**).

### 1.2 Protokol Scalable Reliable Datagram (SRD)

Untuk mengatasi kelemahan TCP di atas topologi Clos, AWS mengembangkan protokol transport proprietary bernama **SRD (Scalable Reliable Datagram)**:

```mermaid
graph LR
    subgraph Traditional["Traditional TCP (Single-Path ECMP)"]
        T_Flow["TCP Flow 1"] -->|Pinned to Single Path| T_Path["Link 3 (Congested!)"]
        T_Path -->|Head-of-Line Blocking| T_Drop["Packet Loss & Retransmission Spike"]
    end

    subgraph AWS_SRD["AWS SRD / ENA Express (Multi-Path Packet Spraying)"]
        S_Flow["Data Stream"] --> S_Spray["Nitro Hardware Sprayer"]
        S_Spray -->|Packet 1| P1["Path 1 (Spine 1)"]
        S_Spray -->|Packet 2| P2["Path 2 (Spine 2)"]
        S_Spray -->|Packet 3| P3["Path 3 (Spine 3)"]
        P1 & P2 & P3 --> Target_Nitro["Target Nitro Hardware (Reorder Buffer)"]
        Target_Nitro --> InOrder["Clean In-Order Stream to Guest OS"]
    end
```

- **Per-Packet Multipath Spraying**: SRD memecah payload dan menyebarkan setiap paket ke ratusan jalur Clos yang berbeda secara simultan.
- **Out-of-Order Delivery at Underlay**: Nitro Card receiver menangani *reordering buffer* di level silikon dalam waktu sub-mikrodetik sebelum menyerahkan data ke OS tamu.
- **Sub-Microsecond Congestion Response**: Menggunakan pengukuran RTT presisi tinggi untuk menghindari jalur fisik yang sedang mengalami mikro-kongesti (*congestion avoidance*).

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Aktifkan **ENA Express** pada instans EC2 generasi terbaru (misal: c6i, m6i, r6i, c7g) untuk komunikasi inter-node yang membutuhkan latensi ultra-rendah dan throughput konsisten. ENA Express secara otomatis membungkus trafik TCP/UDP di dalam protokol SRD di level Nitro tanpa memerlukan perubahan kode aplikasi apa pun.
:::

---

## Layer 2: AWS Distributed Underlay & Hyperplane Internals

### 2.1 Arsitektur AWS Nitro System

Sistem AWS Nitro mengalihkan (*offload*) seluruh fungsi virtualisasi jaringan, storage, dan keamanan dari CPU host server ke kartu ASIC/SoC terdedikasi:

```mermaid
graph TD
    subgraph PhysicalServer["Physical EC2 Compute Server"]
        CPU["Host Intel / AMD / Graviton CPU (100% Workload Dedicated)"]
        Mem["Host DRAM Memory"]
        
        subgraph NitroCards["AWS Nitro Hardware Subsystems"]
            NitroVPC["Nitro Card for VPC (Network SoC)<br/>- VPC Encapsulation Engine<br/>- Hardware Conntrack & SG Rules<br/>- ENA Express / SRD Controller<br/>- Bandwidth & PPS Rate Limiters"]
            NitroEBS["Nitro Card for EBS (Storage NVMe Controller)"]
            NitroSec["Nitro Security Chip (Hardware Root of Trust)"]
            NitroHyp["Nitro Hypervisor (Core Micro-Hypervisor)"]
        end
        
        CPU <-->|"PCIe Bus (SR-IOV Virtual Functions)"| NitroCards
    end
```

### 2.2 AWS Hyperplane: Distributed State Machine Engine

**Hyperplane** adalah platform internal AWS terdistribusi berskala masif (*massively scalable distributed flow tracking engine*) yang menjadi fondasi layanan stateful AWS, termasuk:
- **AWS NAT Gateway**
- **Network Load Balancer (NLB)**
- **Gateway Load Balancer (GWLB)**
- **AWS PrivateLink (Interface Endpoints)**
- **Amazon EFS**

```mermaid
graph TD
    subgraph HyperplaneCluster["AWS Hyperplane Cell (Multi-Tenant Distributed Fleet)"]
        LB_Node1["Hyperplane Node A (Flow Tracker)"]
        LB_Node2["Hyperplane Node B (Packet Shuffler)"]
        LB_Node3["Hyperplane Node C (NAT/LB State Synchronizer)"]
        StateDB[("In-Memory Shared Flow State Cache")]
        
        LB_Node1 <--> StateDB
        LB_Node2 <--> StateDB
        LB_Node3 <--> StateDB
    end

    IngressPackets["Ingress Traffic (Millions PPS)"] --> HyperplaneCluster
    HyperplaneCluster --> TargetENIs["Target Workload ENIs"]
```

#### Cara Kerja Hyperplane Flow State:
1. **Cell-Based Isolation**: Hyperplane dibagi menjadi sel-sel terisolasi per Availability Zone. Kegagalan pada 1 sel tidak akan berdampak pada sel lainnya.
2. **Stateless Resiliency with In-Memory State**: State koneksi TCP disinkronkan di antara armada node Hyperplane secara *lock-free*. Jika 1 node Hyperplane mengalami crash fisik, paket berikutnya langsung diproses oleh node pengganti tanpa memutuskan koneksi TCP klien (*Zero-TCP-Drop Failover*).

---

## Layer 3: AWS Resource Deep-Dive & Hard Limits

### 3.1 Hard Limits & Allowance Metrics Nitro

AWS menerapkan mekanisme *credit bucket* pada level perangkat keras Nitro untuk membatasi pemakaian jaringan instance:

```mermaid
graph LR
    subgraph NitroEnforcement["Nitro Card Hardware Rate Limiters"]
        BW["Bandwidth Allowance (Gbps)"]
        PPS["Packet Per Second Allowance (PPS)"]
        Conn["Conntrack Connection Allowance"]
    end

    BW -->|Exceeded| Drop1["Drops: bw_in_allowance_exceeded<br/>bw_out_allowance_exceeded"]
    PPS -->|Exceeded| Drop2["Drops: pps_allowance_exceeded"]
    Conn -->|Exceeded| Drop3["Drops: conntrack_allowance_exceeded"]
```

| Metrik Allowance Nitro | Tipe Throttling | Dampak pada Aplikasi | Solusi Arsitektural SME |
| :--- | :--- | :--- | :--- |
| `bw_in_allowance_exceeded` | Bandwidth Ingress | Packet drop pada transfer file besar / backup. | Upgrade instance size atau aktifkan network burstable bandwidth. |
| `bw_out_allowance_exceeded`| Bandwidth Egress | Latensi meningkat, throughput terhenti di batas baseline. | Gunakan instance keluarga `-n` (misal: `c6in.32xlarge` hingga 200 Gbps). |
| `pps_allowance_exceeded` | Packets Per Second | Drop pada trafik DNS, microservices REST payload kecil, atau game server. | Gabungkan paket kecil (Jumbo frame / TSO) atau scale-out instance. |
| `conntrack_allowance_exceeded` | Max Stateful Flows | Koneksi TCP baru ditolak secara acak (*Connection refused/timeout*). | Gunakan Stateless Security Group rules, pisahkan trafik via NLB, atau perbesar ukuran instance. |

---

## Layer 4: Hop-by-Hop Packet Walkthrough & Flow Lifecycle

Diagram sequence berikut memvisualisasikan bagaimana sebuah paket diproses oleh **Nitro Card dan Hyperplane** dari host pengirim hingga host penerima:

```mermaid
sequenceDiagram
    autonumber
    participant App as "EC2 Guest OS"
    participant NitroTx as "Source Nitro Card"
    participant Clos as "100GbE Clos Underlay"
    participant HP as "Hyperplane Cluster (NLB/NAT)"
    participant NitroRx as "Target Nitro Card"
    participant Backend as "Target Application"

    App->>NitroTx: Write packet to ENA TX Ring Buffer (DMA Transfer)
    Note over NitroTx: 1. Evaluate Conntrack & SG Rules in Silicon<br/>2. Apply Rate Limiters (BW & PPS Check)<br/>3. Spray packet via SRD over multipath underlay
    NitroTx->>Clos: Multi-Path SRD Encapsulated Datagrams
    Clos->>HP: Ingest at Hyperplane Cell
    Note over HP: 1. Lookup 5-Tuple Flow State in Memory<br/>2. Execute Distributed NAT / Load Balancing<br/>3. Re-encapsulate with Target VNI
    HP->>Clos: Forward Encapsulated Packet
    Clos->>NitroRx: Deliver Packet to Target Host
    Note over NitroRx: 1. Hardware Decapsulation<br/>2. Check Ingress Security Group & Conntrack<br/>3. Write packet to ENA RX Ring Buffer
    NitroRx->>Backend: Interrupt Guest OS & Deliver Packet
```

---

## Layer 5: Production Terraform IaC & CLI Blueprints

### 5.1 Terraform Blueprint: Launch Template dengan ENA Express (SRD)

```hcl
# launch-template-ena-express.tf
resource "aws_launch_template" "high_perf_workload" {
  name_prefix   = "lt-high-perf-srd-"
  image_id      = "ami-0123456789abcdef0" # Amazon Linux 2023 AMI
  instance_type = "c6i.4xlarge"

  network_interfaces {
    associate_public_ip_address = false
    device_index                = 0
    security_groups             = ["sg-0123456789abcdef0"]
    delete_on_termination       = true

    # Aktifkan ENA Express (SRD) pada Network Interface
    ena_srd_specification {
      ena_srd_enabled = true
      ena_srd_udp_specification {
        ena_srd_udp_enabled = true
      }
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "high-performance-srd-node"
      Role = "Core-Database-Replica"
    }
  }
}
```

### 5.2 Skrip Diagnosa Metrik Allowance Nitro (`ethtool`)

Jalankan perintah ini di dalam instance Linux untuk memverifikasi apakah ada paket yang dijatuhkan oleh kartu Nitro:

```bash
#!/bin/bash
# nitro-diagnostics.sh - Verifikasi Throttling Hardware Nitro
echo "=== MEMERIKSA STATUS ENA EXPRESS & SRD ==="
ethtool -S eth0 | grep -E "ena_srd"

echo -e "\n=== MEMERIKSA PACKET DROPS PADA LEVEL HARDWARE NITRO ==="
ethtool -S eth0 | grep -E "allowance_exceeded"

# Output yang diharapkan jika sehat:
# bw_in_allowance_exceeded: 0
# bw_out_allowance_exceeded: 0
# pps_allowance_exceeded: 0
# conntrack_allowance_exceeded: 0
# linklocal_allowance_exceeded: 0
```

---

## Layer 6: Failure Modes, Edge Cases & SEV-1 Troubleshooting Matrix

### 6.1 Production SEV-1 Incident Matrix

| Gejala Insiden (*Symptoms*) | *Root Cause Analysis* (RCA) | Perintah Verifikasi & Diagnosa CLI | Langkah Mitigasi & Resolusi |
| :--- | :--- | :--- | :--- |
| **API Latency melonjak ke 500ms** pada cluster microservices saat jam sibuk (*microbursts*). | `pps_allowance_exceeded`: Jumlah paket per detik melampaui kuota Nitro instance type kecil (`t3.medium`/`c5.large`). | `ethtool -S eth0 \| grep pps_allowance_exceeded` | 1. Naikkan ukuran instance (*vertical scale*).<br/>2. Aktifkan TCP connection keepalive & HTTP/2 multiplexing. |
| **Koneksi baru ke database gagal acak** (`Connection timed out`), koneksi lama tetap hidup. | `conntrack_allowance_exceeded`: Tabel state tracking hardware Nitro penuh akibat ribuan koneksi pendek (*connection churn*). | `ethtool -S eth0 \| grep conntrack_allowance_exceeded` | Pasang connection pooler (misal: AWS RDS Proxy / PgBouncer) dan gunakan stateless NACLs untuk bypass conntrack. |
| **Kinerja transfer data drop drastis setelah kernel update**. | Driver ENA out-of-tree terhapus saat kernel upgrade, sistem fallback ke emulasi lama tanpa fitur offload. | `modinfo ena` & `ethtool -i eth0` | Pasang driver ENA versi terbaru (`dkms install amzn-drivers`) dan re-generate initramfs. |
| **Throughput NAT Gateway lambat di 1 AZ** sementara AZ lain normal. | Hyperplane AZ Imbalance: Trafik terkonsentrasi pada 1 NAT Gateway di 1 AZ melintasi cross-AZ routing. | CloudWatch metric: `PacketsDropCount` & `BytesInFromDestination` per NAT GW | Pasangkan 1 NAT Gateway per Availability Zone (*AZ-independent architecture*). |

---

## Layer 7: Principal Architect Tradeoff Framework

```mermaid
graph TD
    Decision{"Pemilihan Network Acceleration Fabric"}
    Decision -->|"Pilihan A"| StandardKernel["Standard Linux Kernel Networking"]
    Decision -->|"Pilihan B"| ENA_SRD["ENA Express (SRD Nitro Acceleration)"]
    Decision -->|"Pilihan C"| DPDK_Bypass["DPDK / Kernel Bypass (Direct PCIe Access)"]

    StandardKernel --- T1["Kelebihan: Kompatibel universal, mudah di-manage<br/>Kekurangan: P99 tail latency tinggi, limit single-flow 5 Gbps"]
    ENA_SRD --- T2["Kelebihan: P99 latency turun 50%, single-flow 25 Gbps, zero code changes<br/>Kekurangan: Terbatas pada tipe instance Nitro generasi baru"]
    DPDK_Bypass --- T3["Kelebihan: Sub-mikrodetik latensi, jutaan PPS per core<br/>Kekurangan: 100% CPU polling load, isolasi OS hilang, sangat kompleks"]
```

### Matriks Keputusan Arsitektur: Teknologi Pemrosesan Paket

| Dimensi Arsitektural | Standard Linux Kernel | ENA Express (SRD) | DPDK Kernel Bypass |
| :--- | :--- | :--- | :--- |
| **Single-Flow Bandwidth Limit** | 5 Gbps | **25 Gbps** | Line-Rate (100G+) |
| **P99 Tail Latency Stability** | Sedang (Terdampak Hash Collisions) | **Sangat Stabil (SRD Multipath)** | **Ultra Rendah (Sub-mikrodetik)** |
| **Beban Penggunaan CPU Host** | Rendah-Sedang | **Nol (Offload ke Nitro ASIC)** | Sangat Tinggi (1 Core 100% Polling) |
| **Kompatibilitas Aplikasi** | 100% Transparan | **100% Transparan (Zero Changes)**| Perlu Rewrite Kode Aplikasi |
| **Rekomendasi Arsitektur Enterprise** | Workload Umum | **Standar Rekomendasi SME Production** | Khusus HFT (High-Frequency Trading) |
