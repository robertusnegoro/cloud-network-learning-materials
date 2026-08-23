---
title: "Security Group Conntrack & NAT Gateway Port Calculator"
description: "Simulator interaktif kalkulasi kapasitas connection tracking Nitro Card, saturasi port SNAT NAT Gateway, dan mitigasi ErrorPortAllocation."
---

# Security Group Conntrack & NAT Port Calculator

<BadgeLabel type="sme" text="Level: Principal / SME" /> <BadgeLabel type="aws" text="Nitro Underlay & Hyperplane" />

Kalkulator ini dirancang untuk mendiagnosa dan memprediksi batas saturasi pelacakan koneksi *stateful* (*Connection Tracking / Conntrack*) pada hardware Nitro Card EC2 serta utilisasi port **Source Network Address Translation** (<NetworkTerm term="NAT" full="Source Network Address Translation (SNAT)" desc="Modifikasi source IP dan port pada egress packet untuk membagi IP publik bersama.">SNAT</NetworkTerm>) pada AWS NAT Gateway untuk beban kerja transaksi tinggi (*Flash Sales, Real-Time Payment, Core Banking*).

---

<ClientOnly>
  <ConntrackCalculator />
</ClientOnly>

---

## Mekanika Stateful Conntrack & NAT Port Allocation

### 1. Hard Limits Conntrack pada AWS Nitro
Setiap instance EC2 Nitro memiliki alokasi memori khusus pada Nitro Card untuk melacak *state* koneksi (5-tuple: Protocol, Src IP, Src Port, Dst IP, Dst Port). Jika kuota ini habis:
- Instance akan mengalami **silent packet drops** (metrik CloudWatch `ConntrackAllowanceExceeded` naik drastis).
- Tidak ada log error pada level sistem operasi (OS kernel Linux) karena drop terjadi langsung pada level hardware Nitro Card sebelum mencapai driver **Elastic Network Adapter** (<NetworkTerm term="ENA" />).

### 2. Anatomi Port Allocation NAT Gateway (Hyperplane)
- Setiap IP Elastic (EIP) pada NAT Gateway menyediakan **64.512 port sumber TCP** dan **64.512 port UDP**.
- Jika traffic keluar menuju IP tujuan eksternal tunggal (misal API gateway partner perbankan) melebihi kapasitas port, koneksi baru akan gagal dengan metrik `ErrorPortAllocation`.
- Solusi: Asosiasikan hingga **7 Secondary Private/Public IPs** pada NAT Gateway yang sama untuk melipatgandakan pool port hingga **516.096 concurrent connections per NAT Gateway**.

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Gunakan pola **Untracked Security Group Rules** untuk flow TCP volume masif: izinkan inbound port `443` dari CIDR `0.0.0.0/0` DAN outbound port `443` ke `0.0.0.0/0` di dalam **Security Group** (<NetworkTerm term="SG" />) yang sama. Nitro akan secara otomatis menganggap koneksi ini *Untracked* sehingga tidak mengonsumsi kuota tabel conntrack sama sekali.
:::

