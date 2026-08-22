---
title: Interactive Enterprise Topology Explorer
description: Visualisasikan pola arsitektur enterprise skala besar (North-South Egress, East-West TGW Appliance Mode, Hybrid Direct Connect, dan Financial Interconnect).
---

# Interactive Enterprise Topology Explorer

<BadgeLabel type="sme" text="Enterprise Canvas" /> <BadgeLabel type="aws" text="Hub-and-Spoke Mesh" />

Dalam arsitektur *Senior / SME Cloud Network*, sebuah topologi jaringan terdiri dari interaksi berlapis antara *VPC Route Tables, TGW Attachments, GWLB GENEVE tunnels, Direct Connect Gateways, dan Hardware Controllers*.

Gunakan explorer interaktif di bawah ini untuk membedah bagaimana paket data dialirkan melintasi masing-masing komponen infrastruktur AWS:

<TopologyExplorer />

## Pola Desain Standar Enterprise

1. **Centralized Inspection & Egress Hub**:
   - Seluruh traffic keluar (*Egress*) dari Spoke VPC dipaksa melewati *Transit Gateway* menuju *Inspection VPC* yang berisi cluster *Gateway Load Balancer* dan *Palo Alto / Fortinet Next-Gen Firewalls*.
   - Setelah diinspeksi, traffic diteruskan ke *Central NAT Gateways* di public subnet menuju *Internet Gateway*.
2. **East-West Inter-VPC Symmetry with TGW Appliance Mode**:
   - Menghubungkan komunikasi antar Spoke VPC (misal Production VPC ke Shared Services VPC) dengan jaminan bahwa traffic *Forward* dan *Return* selalu melewati firewall di Availability Zone yang sama persis, mencegah *Stateful TCP Drop*.
3. **Hybrid Dedicated Direct Connect with MACsec**:
   - Koneksi privat berkecepatan tinggi (10G/100G) dengan enkripsi *hardware-level IEEE 802.1AE MACsec* yang menghubungkan on-premises data center ke *Direct Connect Gateway (DXGW)* dan ribuan VPC via *Transit VIF*.
4. **Financial Switching & Overlapping IP Interconnect**:
   - Mengintegrasikan sistem pembayaran dengan jaringan perbankan (Arthajasa ATM Bersama, Alto, Rintis Prima, BI-FAST) menggunakan *AWS Private NAT Gateway* untuk mengatasi konflik *Overlapping RFC 1918 CIDR* secara elegan tanpa *Re-IPing*.

