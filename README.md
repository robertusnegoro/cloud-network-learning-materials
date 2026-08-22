# Cloud Network Engineering Mastery 🌐

> **Kurikulum & Platform Pembelajaran Interaktif Tingkat Principal / SME Cloud Network Engineer**  
> Dari Fondasi Matematika Biner & RFC Deep-Dive hingga Arsitektur AWS Enterprise Multi-Region & Financial Partner Interconnect.

[![VitePress](https://img.shields.io/badge/VitePress-1.6+-646cff?logo=vitepress&logoColor=white)](https://vitepress.dev/)
[![Vue 3](https://img.shields.io/badge/Vue.js-3.5+-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Terraform](https://img.shields.io/badge/Terraform-AWS_5.0+-844FBA?logo=terraform&logoColor=white)](https://registry.terraform.io/providers/hashicorp/aws/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

---

## 📌 Gambaran Umum (Overview)

Repository ini menyajikan materi pembelajaran komprehensif, simulator interaktif visual, dan blueprint Infrastructure as Code (IaC) Terraform untuk mendalami arsitektur jaringan cloud skala enterprise.

Materi dirancang khusus untuk **Senior/Staff Cloud Network Engineers**, **Cloud Architects**, dan **Network SMEs** dengan pendekatan **3-Layer Paired Deep-Dive**:
1. **Spesifikasi Protokol RFC**: Teori matematis dan mekanisme internal paket (L2–L7).
2. **AWS Cloud Underlay & Engine**: Nitro System, ENA, Hyperplane state machine, dan Route Table internals.
3. **Produksi & Troubleshooting**: Skema kegagalan nyata (*failure modes*), *asymmetric routing traps*, dan simulasi SEV-1 War Room.

---

## 🧭 Peta Jalan Kurikulum (Curriculum Modules)

| Bagian | Modul | Deskripsi Topik |
| :--- | :--- | :--- |
| **Part 1: Advanced Protocols** | [**01. Subnetting & IPAM**](docs/modules/01-subnetting-vlsm-ipam.md) | Matematika biner, bitwise operations, VLSM, RFC 1918/6598, AWS Reserved IPs, Enterprise IPAM. |
| | [**02. TCP Transport & PMTUD**](docs/modules/02-tcp-mechanics-mtu-mss.md) | Three-way handshake, TCP Windowing, BBR vs CUBIC, Jumbo Frames (9001 MTU), MSS Clamping. |
| | [**03. Advanced BGP Mastery**](docs/modules/03-dynamic-routing-bgp-mastery.md) | BGP Finite State Machine, 13-step best path algorithm, BGP communities, MED, AS-Path prepending. |
| | [**04. Overlays & SDN**](docs/modules/04-overlays-sdn-tunneling.md) | VXLAN (RFC 7348), GENEVE (RFC 8926), GRE, IPsec ESP/AH, tunnel MTU overhead calculation. |
| **Part 2: AWS Core Engine** | [**05. AWS Underlay & Hyperplane**](docs/modules/05-aws-underlay-hyperplane.md) | AWS Nitro Controller, ENA hardware offloading, Hyperplane distributed flow state machine. |
| | [**06. VPC Routing & Mechanics**](docs/modules/06-vpc-architecture-routing.md) | Nitro virtual router, Longest Prefix Match (LPM), VPC Peering MTU, Multiple IPv4 CIDR blocks. |
| | [**07. Ingress/Egress & PrivateLink**](docs/modules/07-ingress-egress-privatelink.md) | Internet Gateway (IGW), NAT Gateway scale & port exhaustion, AWS PrivateLink NLB integration. |
| **Part 3: Hybrid & Enterprise Backbone** | [**08. Direct Connect Deep-Dive**](docs/modules/08-direct-connect-deep-dive.md) | Dedicated vs Hosted Connection, Private/Public/Transit VIFs, MACsec L2 encryption, LAG. |
| | [**09. Transit Gateway Enterprise**](docs/modules/09-transit-gateway-enterprise.md) | TGW Route Tables, Appliance Mode (stateful symmetric inspection), Multicast, Peering. |
| | [**10. AWS Cloud WAN Global Mesh**](docs/modules/10-cloud-wan-mesh.md) | Global Core Network, Segments, Routing Policies, Network Function Groups (NFG). |
| **Part 4: Security & Observability** | [**11. GWLB & Inline Firewall**](docs/modules/11-gwlb-firewall-insertion.md) | Gateway Load Balancer, GENEVE encapsulation, symmetric inspection flow hashing. |
| | [**12. AWS Network Firewall**](docs/modules/12-network-firewall-ids-ips.md) | Suricata stateful engine, 5-tuple rule inspection, strict vs default ordering, TLS inspection. |
| | [**13. VPC Flow Logs & Telemetry**](docs/modules/13-observability-flow-logs-forensics.md) | Custom Flow Log formats (TCP flags, pkt-srcaddr, latency), Athena SQL queries, Traffic Mirroring. |
| **Part 5: Capstones & War Rooms** | [**14. Global Multi-Region Backbone**](docs/modules/14-super-enterprise-backbone.md) | Arsitektur multi-account multi-region, centralized egress/ingress, full-mesh backbone. |
| | [**15. Banking Partner Interconnect**](docs/modules/15-banking-partner-interconnect.md) | Interkoneksi BI-FAST, Arthajasa, ISO 8583 dengan Private NAT Gateway untuk overlapping CIDR. |
| | [**16. Multi-Cloud Interconnect**](docs/modules/16-multi-cloud-interconnect.md) | Cloud Exchange (Equinix Fabric/Megaport) menghubungkan AWS Direct Connect, Azure ExpressRoute, GCP Interconnect. |
| | [**17. SME War Rooms**](docs/modules/17-troubleshooting-war-rooms.md) | 10 skenario SEV-1 insiden produksi nyata beserta metodologi investigasi root cause. |

---

## 🛠️ Simulator & Alat Interaktif (Interactive Tools)

Portal ini dilengkapi dengan simulator berbasis **Vue 3** yang berjalan langsung di browser:

- [**CIDR & Enterprise IPAM Allocator**](docs/interactive/cidr-calculator.md): Kalkulator biner pembagian subnet VLSM dan visualisasi 5 AWS VPC reserved IP.
- [**BGP 13-Step Decision Simulator**](docs/interactive/bgp-simulator.md): Simulator pohon keputusan BGP best path step-by-step.
- [**Packet Flow & Encapsulation Tracer**](docs/interactive/packet-tracer.md): Visualisasi animasi enkapsulasi header paket (Ethernet, IP, TCP, GENEVE, VXLAN).
- [**AWS Hybrid Route Sandbox**](docs/interactive/aws-sandbox.md): Sandbox interaktif untuk menguji evaluasi route table VPC, TGW, dan DX Gateway.
- [**Topology Explorer**](docs/interactive/topology-explorer.md): Visualisasi interaktif topologi jaringan enterprise global.
- [**SME Troubleshooting Drills**](docs/interactive/troubleshooting-drills.md): Latihan studi kasus pemecahan insiden kritis secara mandiri.

---

## 🏗️ Blueprint Terraform IaC (`labs/`)

Blueprint Terraform siap pakai dengan standar AWS Provider `~> 5.0`:

- [`labs/01-enterprise-ipam-vpc/`](labs/01-enterprise-ipam-vpc/): Multi-tier enterprise VPC dengan AWS IPAM Scope dan dedicated subnets.
- [`labs/02-tgw-gwlb-appliance-mode/`](labs/02-tgw-gwlb-appliance-mode/): AWS Transit Gateway terintegrasi Gateway Load Balancer (GWLB) & Appliance Mode.
- [`labs/03-cloud-wan-core-network/`](labs/03-cloud-wan-core-network/): AWS Cloud WAN Global Core Network dengan segmentasi Dev/Prod/Inspection.
- [`labs/04-financial-partner-private-nat/`](labs/04-financial-partner-private-nat/): Solusi Private NAT Gateway untuk mengatasi overlapping IP partner perbankan.
- [`labs/05-hybrid-direct-connect-vpn-bfd/`](labs/05-hybrid-direct-connect-vpn-bfd/): Direct Connect redundan dengan IPsec VPN backup & BFD (Bidirectional Forwarding Detection).

---

## 🚀 Memulai (Getting Started)

### Kebutuhan Sistem (Prerequisites)
- **Node.js**: `v18.0.0` atau lebih baru
- **npm**: `v9.0.0` atau lebih baru
- **Terraform** *(opsional untuk lab IaC)*: `>= 1.5.0`

### Menjalankan Dokumentasi Secara Lokal

1. **Clone repository**:
   ```bash
   git clone https://github.com/robertusnegoro/cloud-network-learning-materials.git
   cd cloud-network-learning-materials
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Jalankan VitePress dev server**:
   ```bash
   npm run dev
   ```
   Buka browser di `http://localhost:5173`.

4. **Build untuk produksi**:
   ```bash
   npm run build
   ```

5. **Preview static build**:
   ```bash
   npm run preview
   ```

---

## 📜 Standar Bahasa & Terminologi (Bilingual Rule)

- **Narasi & Penjelasan**: Bahasa Indonesia profesional dan baku.
- **Terminologi Jaringan & Cloud**: 100% **Bahasa Inggris** (*Subnet, Route Table, Transit Gateway, Cloud WAN, Payload, Handshake, Encapsulation, Peering, Advertisement, Prefix List, Appliance Mode, Underlay, Overlay, Flow Logs*). Istilah teknis standar industri tidak diterjemahkan agar tetap presisi.

---

## 🤖 AI Code Assistant Integration

Repository ini menyediakan instruksi terintegrasi untuk AI coding agents:
- [`AGENTS.md`](./AGENTS.md) — Panduan master untuk Google Antigravity, OpenAI Codex, dan Anthropic Claude.
- [`CLAUDE.md`](./CLAUDE.md) — Panduan cepat untuk Claude Code & Git guardrails.
- [`GEMINI.md`](./GEMINI.md) — Panduan cepat untuk Google Antigravity / Gemini CLI.

---

## 🤝 Kontribusi (Contributing)

Silakan pelajari [CONTRIBUTING.md](./CONTRIBUTING.md) dan [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) sebelum mengajukan pull request atau issue baru.

---

## 📄 Lisensi (License)

Didistribusikan di bawah lisensi **MIT**. Lihat [LICENSE](./LICENSE) untuk detail lengkap.
