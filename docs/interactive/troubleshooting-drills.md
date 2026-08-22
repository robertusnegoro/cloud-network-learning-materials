---
title: SME Troubleshooting War Rooms & Incident Drills
description: 10 Skenario insiden nyata level Senior / Principal Cloud Network Engineer lengkap dengan analisis VPC Flow Logs, tcpdump, dan remediation step.
---

# 🚨 SME Troubleshooting War Rooms

<BadgeLabel type="sme" text="War Room Incident Drills" /> <BadgeLabel type="warning" text="Production SEV-1 Scenarios" />

Sebagai **Senior / SME Cloud Network Engineer**, kemampuan melakukan *root-cause analysis* (RCA) di bawah tekanan insiden produksi (*SEV-1 outage*) adalah pembeda utama. Latihan interaktif ini menguji ketajaman analisa Anda terhadap *telemetry log*, *asymmetric routing*, *PMTUD black holes*, dan *failover traps*.

<TroubleshootingDrill />

## 🛠️ Metodologi Standar SME untuk Network Incident Triage

Ketika menangani degradasi performa atau *packet loss* di AWS, ikuti alur investigasi sistematis:

```mermaid
graph TD
    A[Mulai Investigasi Gangguan] --> B[Periksa Status Fisik & BGP Session: DX LAG / IPsec Tunnel / BFD]
    B --> C[Uji Isolasi L3/L4: Telnet / Netcat / Curl ke Port Spesifik]
    C --> D[Analisa Custom VPC Flow Logs: Cek Flag SYN/RST, Packet Loss & Action NODATA/REJECT]
    D --> E[Verifikasi Simetri Forward & Return Path: Appliance Mode TGW & Route Table LPM]
    E --> F[Uji MTU & PMTUD: Probe Ukuran Paket dengan DF Bit Aktif]
    F --> G[Periksa Batasan Skala: NAT GW Port Exhaustion & Concurrency Limits]
    G --> H[Eksekusi Remediasi & Pantau CloudWatch Metrics Hingga Normal]
```
