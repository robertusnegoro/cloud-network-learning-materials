---
title: RFC 4271 & AWS BGP 13-Step Decision Simulator
description: Simulator pemilihan jalur BGP (Best Path Election) dengan konfigurasi atribut Weight, Local-Pref, AS-Path, MED, dan BGP Community.
---

# BGP 13-Step Decision & Community Simulator

<BadgeLabel type="rfc" text="RFC 4271" /> <BadgeLabel type="aws" text="AWS Direct Connect BGP" />

Algoritma **BGP Best Path Selection** adalah tulang punggung *routing policy* enterprise dan *hybrid cloud connectivity* (AWS Direct Connect & Transit Gateway). Ketika sebuah router menerima beberapa *advertisement* untuk prefix yang sama persis, router akan mengevaluasi atribut BGP secara berurutan hingga ditemukan satu pemenang tunggal (*Best Path*), kecuali jika *BGP Multipath / ECMP* diaktifkan.

<BgpSimulator />

## Urutan Hierarki Keputusan BGP (Best Path Algorithm)

1. **Weight** *(Tertinggi menang)*: Atribut proprietary lokal (Cisco/AWS). Tidak di-advertise ke router tetangga.
2. **Local Preference (`LOCAL_PREF`)** *(Tertinggi menang)*: Atribut well-known discretionary yang di-advertise ke seluruh router internal dalam satu Autonomous System (AS). Default: `100`.
3. **Locally Originated**: Memprioritaskan route yang diinisiasi secara lokal (`network` statement, `aggregate-address`) dibandingkan yang dipelajari via BGP neighbor.
4. **AS-Path Length** *(Terpendek menang)*: Menghitung jumlah AS hop. Teknik *AS-Path Prepending* digunakan untuk membuat jalur terlihat lebih panjang sehingga dijadikan jalur backup.
5. **Origin Code**: Urutan prioritas `IGP (i)` > `EGP (e)` > `Incomplete (?)`.
6. **MED (Multi-Exit Discriminator)** *(Terendah menang)*: Digunakan untuk memberi sinyal preferensi entry point ke AS tetangga. Hanya dibandingkan jika berasal dari neighbor AS yang sama (kecuali `always-compare-med` aktif).
7. **Neighbor Type**: Jalur yang diterima dari tetangga **eBGP** (External) selalu diprioritaskan dibandingkan **iBGP** (Internal).
8. **IGP Metric to BGP `NEXT_HOP`** *(Terendah menang)*: Jarak IGP internal (OSPF/IS-IS) menuju IP `NEXT_HOP`.
9. **BGP Multipath / ECMP**: Jika atribut 1 sampai 8 identik dan ECMP diaktifkan, router akan menginjeksi beberapa jalur secara bersamaan ke routing table.
10. **BGP Router ID** *(Terendah menang)*: IP Router ID tetangga yang terkecil.
11. **Neighbor IP Address** *(Terendah menang)*: Tie-breaker terakhir jika BGP peer memiliki multiple session.

## AWS Direct Connect BGP Communities

AWS menyediakan *standard BGP community tags* untuk mengontrol *scope* dan preferensi *route advertisement* melalui Direct Connect:

| BGP Community Tag | Definisi & Efek Routing di Backbone AWS |
| :--- | :--- |
| **`7224:7100`** | **Local Region Only**: Prefix hanya di-advertise ke AWS Region di mana Direct Connect location berada. |
| **`7224:7200`** | **Home Region (Geographical)**: Prefix di-advertise ke seluruh Region dalam satu benua (misal: Seluruh Region Asia Pacific). |
| **`7224:7300`** | **Global (All AWS Regions)**: Prefix di-advertise ke seluruh AWS Region di dunia melalui Direct Connect Gateway. |
| **`7224:9100`** | **Local Preference LOW (70)**: Memberikan sinyal ke AWS untuk memprioritaskan link lain sebagai primary. |
| **`7224:9200`** | **Local Preference MEDIUM (80)**: Nilai prioritas menengah. |
| **`7224:9300`** | **Local Preference HIGH (90)**: Memberikan sinyal ke AWS untuk menjadikan jalur ini sebagai Best Path utama. |

