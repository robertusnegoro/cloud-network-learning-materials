---
title: "Direct Connect BGP Community Calculator"
description: "Simulator interaktif penentuan BGP Communities (Local Preference & Scope) dan AS-Path Prepending untuk AWS Direct Connect."
---

# ⚡ Direct Connect BGP Community & Path Metric Calculator

<BadgeLabel type="sme" text="Level: Principal / SME" /> <BadgeLabel type="aws" text="AWS Direct Connect BGP" />

Simulator ini membantu Network SME merancang kebijakan BGP routing dua arah antara on-premise edge router dan AWS Direct Connect Gateway (DXGW). Tentukan bobot preferensi jalur masuk (*Local Preference*), batasan lingkup propagasi (*Scope Communities*), dan jumlah *AS-Path Prepending* untuk menghasilkan konfigurasi router produksi (Cisco, Juniper, Arista) secara otomatis.

---

<ClientOnly>
  <DxCommunityCalc />
</ClientOnly>

---

## 📖 Prinsip BGP Communities pada AWS Direct Connect

### 1. Local Preference Communities (Mengontrol Ingress AWS)
AWS Direct Connect mengevaluasi BGP Community dari customer router untuk menentukan rute masuk ke jaringan on-premise:
- **`7224:7300` (High Preference)**: AWS memberikan Local Preference `9300`. Ini adalah jalur utama (*Active Path*).
- **`7224:7200` (Medium Preference)**: AWS memberikan Local Preference `9200`. Digunakan untuk jalur siaga (*Standby Path*).
- **`7224:7100` (Low Preference)**: AWS memberikan Local Preference `9100`. Digunakan untuk jalur cadangan darurat (*Backup Path*).

### 2. Scope Communities (Membatasi Jangkauan Geografis)
- **`7224:9100` (Local Region)**: Prefix hanya diiklankan ke VPC di dalam AWS Region yang sama dengan Direct Connect point of presence (PoP).
- **`7224:9200` (Continental Region)**: Prefix diiklankan ke seluruh AWS Region dalam benua yang sama (misal seluruh Asia Pacific).
- **`7224:9300` (Global)**: Prefix diiklankan ke seluruh AWS Region di dunia melalui AWS Global Backbone.

::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)
Selalu kombinasikan **Local Preference Communities (`7224:7300` & `7224:7200`)** dengan **Bidirectional Forwarding Detection (BFD)** interval `300ms x 3` untuk mencapai failover sub-second otomatis saat link fisik Direct Connect mengalami degradasi.
:::
