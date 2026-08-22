---
title: Interactive CIDR & IPAM Hierarchy Allocator
description: Kalkulator subnetting biner, pembagian VLSM enterprise, serta visualisasi 5 reserved IP pada AWS VPC.
---

# 🧮 Interactive CIDR & AWS IPAM Allocator

<BadgeLabel type="sme" text="Enterprise IPAM" /> <BadgeLabel type="aws" text="AWS VPC Engine" />

Di level **Senior Cloud Network Engineer / SME**, perencanaan *address space* IP bukan sekadar membagi subnet secara acak, melainkan memastikan:
1. Tidak terjadi *CIDR exhaustion* di masa depan.
2. Mematuhi batasan *secondary CIDR blocks* dan *non-overlapping routing domain*.
3. Mengalokasikan 5 IP yang di-reserve secara permanen oleh arsitektur AWS VPC pada setiap subnet.

<CidrCalculator />

## 📐 Ringkasan Aturan Reservasi IP pada AWS VPC Subnet

Pada setiap subnet yang dibuat di dalam AWS VPC, **5 IP address** pertama dan terakhir secara otomatis di-reserve oleh AWS dan **tidak dapat dialokasikan ke Elastic Network Interface (ENI)**:

| Alamat IP | Peruntukan (*Role*) | Detail Teknis Arsitektur AWS |
| :--- | :--- | :--- |
| **`x.x.x.0`** | *Network Address* | Selalu merupakan IP pertama pada CIDR block. Ditujukan untuk identifikasi network di level routing L3. |
| **`x.x.x.1`** | *VPC Router* | Default Gateway untuk subnet tersebut. Digunakan oleh instance untuk menjangkau router VPC (Nitro virtual router). |
| **`x.x.x.2`** | *Amazon Provided DNS* | IP recursive DNS resolver (Route 53 Resolver / `AmazonProvidedDNS`). Instance menggunakan IP ini untuk resolusi nama domain. |
| **`x.x.x.3`** | *Future AWS Use* | Dicadangkan oleh AWS untuk kapabilitas infrastruktur masa depan. |
| **`x.x.x.255`** | *Network Broadcast* | IP terakhir subnet. Meskipun AWS VPC tidak mendukung *Layer 2 broadcast*, IP ini tetap di-reserve untuk mematuhi konvensi standar IP networking. |

::: tip RUMUS KAPASITAS HOST PADA AWS SUBNET
Kapasitas host yang dapat digunakan pada subnet AWS adalah:
$$\text{Usable Hosts} = 2^{(32 - \text{prefix})} - 5$$
Contoh pada subnet `/24`: $2^{(32-24)} - 5 = 256 - 5 = 251 \text{ host usable}$.
:::
