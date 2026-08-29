---
title: AWS Global Accelerator & Anycast BGP Routing Simulator
description: Simulator interaktif perutean BGP Anycast, 2 Static Anycast IPs, multi-region instant failover, Custom Routing Accelerator (CRA) port mapping, dan TCP BDP acceleration.
---

# AWS Global Accelerator & Anycast Routing Simulator

<BadgeLabel type="sme" text="Level: Principal / SME" /> <BadgeLabel type="rfc" text="RFC 4786 (Anycast) / RFC 7098 (Anycast Flow)" /> <BadgeLabel type="aws" text="Edge Ingress & Dedicated Global Private Backbone" />

**AWS Global Accelerator (AGA)** adalah layanan *networking* terkelola yang menyediakan **2 Static Anycast IPv4/IPv6 Addresses** yang diiklankan secara simultan dari ratusan *Point of Presence* (PoP) di seluruh dunia melalui jaringan *Border Gateway Protocol* (BGP). Lalu lintas diarahkan ke PoP terdekat dengan klien, kemudian ditransmisikan melalui **AWS Global Dedicated Private Fiber Backbone** (jaringan bebas kongesti publik) langsung ke aplikasi di AWS Region terdekat.

Gunakan simulator interaktif di bawah ini untuk mempelajari arsitektur Anycast, mekanisme *Instant BGP Underlay Failover*, pemetaan port deterministik pada *Custom Routing Accelerator (CRA)*, serta analisis fisika *Bandwidth-Delay Product (BDP)*.

<GlobalAcceleratorSim />

---

## Ringkasan Konsep Kunci untuk SME Network Engineer

### 1. Dual Static Anycast IPs & Independent Network Zones (INZ)
- Global Accelerator mengalokasikan **2 Static Anycast IPv4 Addresses** dari dua *Independent Network Zones* (INZ) yang terisolasi secara fisik dan logis.
- Jika satu zona jaringan mengalami masalah perutean upstream BGP internet, klien tetap dapat mengakses aplikasi melalui IP kedua tanpa gangguan.
- Memungkinkan *hard-coded IP whitelisting* pada firewall korporat tanpa khawatir IP berubah seperti pada DNS ALB.

### 2. Standard vs Custom Routing Accelerator (CRA)
- **Standard Accelerator**: Menggunakan *5-tuple consistent flow hashing* (`Source IP`, `Source Port`, `Destination IP`, `Destination Port`, `Protocol`) atau *2-tuple Client Affinity* (`Source IP`) untuk mendistribusikan lalu lintas ke Regional ALB, NLB, atau EC2.
- **Custom Routing Accelerator (CRA)**: Menggunakan *algoritma pemetaan port deterministik* untuk memetakan rentang port listener eksternal secara langsung ke *Private IP dan Target Port* instance EC2 di dalam subnet VPC tertentu (ideal untuk sesi game multipemain, VoIP SIP, dan WebRTC).

### 3. Client IP Preservation & Security Group Rules
- Ketika `client_ip_preservation_enabled = true`, Global Accelerator mempertahankan alamat IP publik klien asli di header L3 IPv4 paket saat masuk ke target VPC (ALB/NLB/EC2).
- **Perhatian Kritis**: Security Group pada backend target **WAJIB** membuka port ke CIDR publik klien (`0.0.0.0/0` atau prefix IP tertentu), bukan hanya IP internal subnet VPC!

### 4. Sub-10s BGP Underlay Failover vs DNS TTL
- Pada arsitektur DNS tradisional (seperti Route 53 Weighted/Failover), waktu failover bergantung pada *DNS TTL* dan caching di sisi resolver ISP / klien (membutuhkan 60–120 detik).
- Pada Global Accelerator, ketika probe *Health Check* mendeteksi endpoint regional Unhealthy, underlay BGP internal AWS langsung mengalihkan flow ke Region sehat berikutnya dalam **< 10 detik** tanpa menunggu DNS expire.
