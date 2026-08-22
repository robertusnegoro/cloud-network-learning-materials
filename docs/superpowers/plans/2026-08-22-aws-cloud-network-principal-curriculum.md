# AWS Cloud Network Engineering Mastery (Principal SME) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive, publisher-grade (O'Reilly / McGraw-Hill standard) AWS Cloud Network Engineering learning platform featuring 8 Parts, 34 In-Depth Modules, 8 Interactive Simulators, and 7 Production Terraform IaC Blueprints.

**Architecture:** 
The platform is built on VitePress 1.6+ (Vue 3, TypeScript, Tailwind-style CSS) and Terraform 5.0+. Every module strictly adheres to a **7-Layer Technical Standard** (RFC Theory, AWS Underlay Mechanics, Resource Specs/Limits, Hop-by-Hop Packet Walk, Production IaC/CLI, Failure Modes & SEV-1 Matrix, and Principal Tradeoff Framework) with integrated **Industry Best Practice** callouts. Interactive tools operate in Dual-Mode (standalone `/interactive/*` and embedded Vue SFC widgets).

**Tech Stack:** 
- Frontend: VitePress 1.6.4, Vue 3.5+, Lucide Vue Next, Mermaid.js
- Infrastructure as Code: Terraform >= 5.0 (AWS Provider), JSON Core Network Policy Engine
- Language: Professional Bahasa Indonesia with 100% original English networking terminology.

---

## Global Constraints

- Every chapter MUST follow the 7-Layer Deep Technical Standard.
- Every theory and AWS resource section MUST include a `::: tip STANDAR BEST PRACTICE INDUSTRI (SME RECOMMENDATION)` callout.
- Terminology rule: Narrative in professional Indonesian; all networking terms (VPC, ENI, Subnet, Route Table, BGP, Direct Connect, etc.) in English.
- Verification gate: `npm run build` must exit with code `0` after every documentation change.
- Terraform gate: All Terraform directories must pass `terraform validate` where applicable.

---

## File Structure Plan

```
cloud-network-learning-materials/
├── docs/
│   ├── .vitepress/
│   │   ├── config.mts                         # Main VitePress navigation & sidebar config
│   │   └── theme/
│   │       ├── index.ts                       # Global component registrations
│   │       └── components/                    # Vue 3 Interactive visualizers
│   ├── index.md                               # Curriculum roadmap landing page
│   ├── reference/
│   │   └── cheat-sheet.md                     # Comprehensive SME Quick Reference
│   ├── modules/                               # 34 Curriculum Chapters (01 to 34)
│   │   ├── 01-subnetting-vlsm-ipam.md
│   │   ├── 02-tcp-mechanics-mtu-mss.md
│   │   ├── 03-dynamic-routing-bgp-mastery.md
│   │   ├── 04-overlays-sdn-tunneling.md
│   │   ├── 05-aws-underlay-hyperplane.md
│   │   ├── 06-eni-efa-prefix-delegation.md
│   │   ├── 07-vpc-architecture-multi-cidr.md
│   │   ├── 08-route-tables-lpm-ingress.md
│   │   ├── 09-igw-eigw-nat-mechanics.md
│   │   ├── 10-nat-gateways-public-private.md
│   │   ├── 11-vpc-peering-underlay-mesh.md
│   │   ├── 12-gateway-vpc-endpoints.md
│   │   ├── 13-privatelink-interface-endpoints.md
│   │   ├── 14-gwlb-firewall-insertion.md
│   │   ├── 15-direct-connect-macsec.md
│   │   ├── 16-direct-connect-vifs-bgp.md
│   │   ├── 17-direct-connect-gateway-dxgw.md
│   │   ├── 18-vpn-accelerated-vpn-ecmp.md
│   │   ├── 19-client-vpn-verified-access.md
│   │   ├── 20-transit-gateway-core-routing.md
│   │   ├── 21-tgw-appliance-multicast-connect.md
│   │   ├── 22-cloud-wan-mesh-policy.md
│   │   ├── 23-load-balancing-alb-nlb-mtls.md
│   │   ├── 24-route53-resolver-dns-firewall.md
│   │   ├── 25-cloudfront-global-accelerator.md
│   │   ├── 26-vpc-lattice-container-cni.md
│   │   ├── 27-security-groups-nacls-conntrack.md
│   │   ├── 28-network-firewall-suricata-ips.md
│   │   ├── 29-waf-shield-ddos-defense.md
│   │   ├── 30-observability-flow-logs-analyzer.md
│   │   ├── 31-super-enterprise-backbone.md
│   │   ├── 32-banking-partner-interconnect.md
│   │   ├── 33-multi-cloud-interconnect.md
│   │   └── 34-troubleshooting-war-rooms.md
│   ├── interactive/                           # 8 Interactive Simulator Pages
│   │   ├── cidr-calculator.md
│   │   ├── bgp-simulator.md
│   │   ├── packet-tracer.md
│   │   ├── aws-sandbox.md
│   │   ├── topology-explorer.md
│   │   ├── troubleshooting-drills.md
│   │   ├── dx-community-calc.md
│   │   └── conntrack-calculator.md
│   └── labs/                                  # 7 Hands-on Lab Guides
│       ├── 01-enterprise-ipam-vpc.md
│       ├── 02-tgw-gwlb-appliance-mode.md
│       ├── 03-cloud-wan-core-network.md
│       ├── 04-financial-partner-private-nat.md
│       ├── 05-hybrid-direct-connect-vpn-bfd.md
│       ├── 06-vpc-lattice-microservices.md
│       └── 07-centralized-ingress-egress-firewall.md
└── labs/                                      # 7 Production Terraform Codebases
    ├── 01-enterprise-ipam-vpc/
    ├── 02-tgw-gwlb-appliance-mode/
    ├── 03-cloud-wan-core-network/
    ├── 04-financial-partner-private-nat/
    ├── 05-hybrid-direct-connect-vpn-bfd/
    ├── 06-vpc-lattice-microservices/
    └── 07-centralized-ingress-egress-firewall/
```

---

## Tasks

### Task 1: Update VitePress Master Configuration, Navigation & Index Roadmap

**Files:**
- Modify: `docs/.vitepress/config.mts`
- Modify: `docs/index.md`

**Interfaces:**
- Produces: 8-Part Navigation hierarchy, 34-module sidebar, 8 interactive tool links, 7 lab links.

- [ ] **Step 1: Update `docs/.vitepress/config.mts` with the complete 8-Part 34-Module structure**
- [ ] **Step 2: Update `docs/index.md` with the expanded 8-Part roadmap Mermaid chart & curriculum cards**
- [ ] **Step 3: Run `npm run build` to verify configuration syntax**

---

### Task 2: Implement Part 1 (Modul 01 – 04) to Full 7-Layer Standard

**Files:**
- Modify: `docs/modules/01-subnetting-vlsm-ipam.md`
- Modify: `docs/modules/02-tcp-mechanics-mtu-mss.md`
- Modify: `docs/modules/03-dynamic-routing-bgp-mastery.md`
- Modify: `docs/modules/04-overlays-sdn-tunneling.md`

**Content Requirements:**
- Modul 01: IPv4/IPv6 Bitwise, Subnetting, VLSM, Supernetting (RFC 4632), RFC 1918/6598, AWS Subnet 5 Reserved IPs, AWS IPAM multi-account hierarchy, Best Practice callouts, embedded `<CidrCalculator />`.
- Modul 02: TCP 32-bit Header, TCP Options (SACK, Window Scaling), TCP FSM, 2MSL TIME-WAIT, BDP & Linux sysctl 100G tuning, Cubic vs BBR v1-v3, MTU/MSS & PMTUD Black Hole mitigations.
- Modul 03: BGP-4 byte anatomy, BGP FSM, BGP 13-step decision tree, BGP Communities matrix (AWS DX communities 7224:xxxx), BFD RFC 5880 sub-second failover, Route Flap Dampening, embedded `<BgpSimulator />`.
- Modul 04: VXLAN RFC 7348 50-byte encapsulation, GENEVE RFC 8926 TLV Option Class `0x0108` on GWLB, IPsec IKEv1/IKEv2, DPD, NAT-T RFC 3947, embedded `<PacketTracer />`.

- [ ] **Step 1: Write expanded Modul 01 with 7-layer structure & best practices**
- [ ] **Step 2: Write expanded Modul 02 with 7-layer structure & best practices**
- [ ] **Step 3: Write expanded Modul 03 with 7-layer structure & best practices**
- [ ] **Step 4: Write expanded Modul 04 with 7-layer structure & best practices**
- [ ] **Step 5: Verify build with `npm run build`**

---

### Task 3: Implement Part 2 (Modul 05 – 07) — Hardware Underlay & VPC Core

**Files:**
- Modify: `docs/modules/05-aws-underlay-hyperplane.md`
- Create/Modify: `docs/modules/06-eni-efa-prefix-delegation.md`
- Create/Modify: `docs/modules/07-vpc-architecture-multi-cidr.md`

**Content Requirements:**
- Modul 05: AWS Nitro System (Nitro Card for VPC hardware offload), ENA drivers, queues, SR-IOV, DPDK, ENA Express (SRD multi-path dispatch), Hyperplane distributed state machine.
- Modul 06: Primary/Secondary ENIs, Primary/Secondary Private IPs, Elastic IPs (1:1 Stateless NAT), IPv6 on ENI, Prefix Delegation (/28 IPv4, /80 IPv6), Multi-ENI routing hazards & Linux policy routing (`ip rule`), Elastic Fabric Adapter (EFA) & Libfabric, Source/Dest Check, Placement Groups (Cluster, Partition, Spread).
- Modul 07: Amazon VPC Deep Dive, Primary & Secondary IPv4 CIDRs, IPv6 Dual-Stack & IPv6-Only VPCs (DNS64 & NAT64), Subnet Taxonomy, DHCP Option Sets, DNS Hostnames/Private DNS, AWS RAM Subnet Sharing.

- [ ] **Step 1: Write expanded Modul 05 with 7-layer structure & best practices**
- [ ] **Step 2: Write Modul 06 with 7-layer structure & best practices**
- [ ] **Step 3: Write Modul 07 with 7-layer structure & best practices**
- [ ] **Step 4: Verify build with `npm run build`**

---

### Task 4: Implement Part 3 (Modul 08 – 11) — VPC Routing & Edge Gateways

**Files:**
- Create/Modify: `docs/modules/08-route-tables-lpm-ingress.md`
- Create/Modify: `docs/modules/09-igw-eigw-nat-mechanics.md`
- Create/Modify: `docs/modules/10-nat-gateways-public-private.md`
- Create/Modify: `docs/modules/11-vpc-peering-underlay-mesh.md`

**Content Requirements:**
- Modul 08: Route Table Mechanics, LPM priority resolution (Local > Static > Propagated DX/VPN), Target Types, Ingress Gateway Route Tables on IGW/VGW, embedded `<AwsRouteSandbox />`.
- Modul 09: Internet Gateway (IGW) 1:1 stateless NAT, Egress-Only Internet Gateway (EIGW) stateful IPv6 outbound filter.
- Modul 10: AWS NAT Gateways (Public & Private NAT), Hyperplane auto-scaling, SNAT Port Allocation, 64,512 port exhaustion mitigations, Secondary IP association, Private NAT Gateway for Overlapping CIDR.
- Modul 11: VPC Peering Underlay Mesh, Nitro-to-Nitro direct packet forwarding, non-transitive routing constraint, Cross-Region VPC Peering, MTU and Security Group referencing.

- [ ] **Step 1: Write Modul 08 with 7-layer structure & best practices**
- [ ] **Step 2: Write Modul 09 with 7-layer structure & best practices**
- [ ] **Step 3: Write Modul 10 with 7-layer structure & best practices**
- [ ] **Step 4: Write Modul 11 with 7-layer structure & best practices**
- [ ] **Step 5: Verify build with `npm run build`**

---

### Task 5: Implement Part 4 (Modul 12 – 14) — Private Connectivity & PrivateLink

**Files:**
- Create/Modify: `docs/modules/12-gateway-vpc-endpoints.md`
- Create/Modify: `docs/modules/13-privatelink-interface-endpoints.md`
- Create/Modify: `docs/modules/14-gwlb-firewall-insertion.md`

**Content Requirements:**
- Modul 12: Gateway Endpoints for S3 & DynamoDB, Prefix List route table injection, IAM Endpoint Policies, Transitive access boundaries.
- Modul 13: AWS PrivateLink & Interface Endpoints, Hyperplane Endpoint ENIs, Private DNS integration, Endpoint Services (NLB/GWLB targets), Cross-Account/Cross-Region PrivateLink.
- Modul 14: Gateway Load Balancer (GWLB) & Endpoints (GWLBe), 1-Arm vs 2-Arm deployment, GENEVE encapsulation flow, Appliance Mode symmetric hashing, Next-Gen Firewall scaling.

- [ ] **Step 1: Write Modul 12 with 7-layer structure & best practices**
- [ ] **Step 2: Write Modul 13 with 7-layer structure & best practices**
- [ ] **Step 3: Write Modul 14 with 7-layer structure & best practices**
- [ ] **Step 4: Verify build with `npm run build`**

---

### Task 6: Implement Part 5 (Modul 15 – 19) — Hybrid Direct Connect & VPN

**Files:**
- Create/Modify: `docs/modules/15-direct-connect-macsec.md`
- Create/Modify: `docs/modules/16-direct-connect-vifs-bgp.md`
- Create/Modify: `docs/modules/17-direct-connect-gateway-dxgw.md`
- Create/Modify: `docs/modules/18-vpn-accelerated-vpn-ecmp.md`
- Create/Modify: `docs/modules/19-client-vpn-verified-access.md`

**Content Requirements:**
- Modul 15: Direct Connect Dedicated vs Hosted, MMR, LOA-CFA, Cross-Connects, LAG & LACP (802.3ad), IEEE 802.1AE MACsec 10G/100G wire-speed encryption.
- Modul 16: Direct Connect VIFs (Private, Transit, Public), BGP peering, MD5 auth, AS-Path Prepending, Local Preference & Scope Communities (7224:xxxx).
- Modul 17: AWS Direct Connect Gateway (DXGW) Multi-Account Multi-Region Backbone, Association Proposals, Allowed Prefixes filtering, non-transitive routing.
- Modul 18: AWS Site-to-Site VPN & Accelerated VPN, IKEv1/IKEv2, Dynamic BGP over IPsec, ECMP throughput aggregation (up to 5 Gbps per TGW), DX-to-VPN automated failover.
- Modul 19: AWS Client VPN (OpenVPN, SAML 2.0 / AD / mTLS, split vs full tunnel) & AWS Verified Access (Zero-Trust Network Access).

- [ ] **Step 1: Write Modul 15 with 7-layer structure & best practices**
- [ ] **Step 2: Write Modul 16 with 7-layer structure & best practices**
- [ ] **Step 3: Write Modul 17 with 7-layer structure & best practices**
- [ ] **Step 4: Write Modul 18 with 7-layer structure & best practices**
- [ ] **Step 5: Write Modul 19 with 7-layer structure & best practices**
- [ ] **Step 6: Verify build with `npm run build`**

---

### Task 7: Implement Part 6 (Modul 20 – 22) — Enterprise WAN & Cloud WAN

**Files:**
- Create/Modify: `docs/modules/20-transit-gateway-core-routing.md`
- Create/Modify: `docs/modules/21-tgw-appliance-multicast-connect.md`
- Create/Modify: `docs/modules/22-cloud-wan-mesh-policy.md`

**Content Requirements:**
- Modul 20: AWS Transit Gateway (TGW) Core Routing, Hyperplane underlay router, Route Tables, Associations/Propagations, Blackhole routes, Inter-Region Peering (MTU 8500).
- Modul 21: TGW Advanced: Appliance Mode (Stateful Firewall Symmetry), Multicast Routing (IGMPv2), TGW Connect (Native GRE + BGP for SD-WAN), Network Manager.
- Modul 22: AWS Cloud WAN Global Backbone, Core Network Engine (CNE), JSON Declarative Network Policies, Dynamic Segments (`production`, `development`, `sharedservices`, `inspection`), Segment Actions (`share`, `isolate`, `send-via`), Core Network Edges, embedded `<TopologyExplorer />`.

- [ ] **Step 1: Write Modul 20 with 7-layer structure & best practices**
- [ ] **Step 2: Write Modul 21 with 7-layer structure & best practices**
- [ ] **Step 3: Write Modul 22 with 7-layer structure & best practices**
- [ ] **Step 4: Verify build with `npm run build`**

---

### Task 8: Implement Part 7 (Modul 23 – 26) — Application Networking, DNS & Edge

**Files:**
- Create/Modify: `docs/modules/23-load-balancing-alb-nlb-mtls.md`
- Create/Modify: `docs/modules/24-route53-resolver-dns-firewall.md`
- Create/Modify: `docs/modules/25-cloudfront-global-accelerator.md`
- Create/Modify: `docs/modules/26-vpc-lattice-container-cni.md`

**Content Requirements:**
- Modul 23: Elastic Load Balancing (ALB L7 vs NLB L4), Proxy Protocol v2, Cross-Zone Load Balancing, mTLS termination, SNI multi-certificate, Connection Draining / Deregistration Delay.
- Modul 24: Amazon Route 53, Public/Private Hosted Zones, Split-Horizon DNS, Route 53 Resolver (Inbound/Outbound Endpoints, Resolver Rules), Route 53 DNS Firewall, DNSSEC.
- Modul 25: Amazon CloudFront Anycast Edge (Edge locations, REC, Origin Shield) & AWS Global Accelerator (Static Anycast IPs, 5-tuple flow hashing, Traffic Dials).
- Modul 26: AWS VPC Lattice (Service Networks, Auth Policies, IAM SigV4) & Modern Container Networking (Amazon VPC CNI, Prefix Delegation, Pod Security Groups).

- [ ] **Step 1: Write Modul 23 with 7-layer structure & best practices**
- [ ] **Step 2: Write Modul 24 with 7-layer structure & best practices**
- [ ] **Step 3: Write Modul 25 with 7-layer structure & best practices**
- [ ] **Step 4: Write Modul 26 with 7-layer structure & best practices**
- [ ] **Step 5: Verify build with `npm run build`**

---

### Task 9: Implement Part 8 (Modul 27 – 34) — Security, Observability, Interconnect & 15 War Rooms

**Files:**
- Create/Modify: `docs/modules/27-security-groups-nacls-conntrack.md`
- Create/Modify: `docs/modules/28-network-firewall-suricata-ips.md`
- Create/Modify: `docs/modules/29-waf-shield-ddos-defense.md`
- Create/Modify: `docs/modules/30-observability-flow-logs-analyzer.md`
- Create/Modify: `docs/modules/31-super-enterprise-backbone.md`
- Create/Modify: `docs/modules/32-banking-partner-interconnect.md`
- Create/Modify: `docs/modules/33-multi-cloud-interconnect.md`
- Create/Modify: `docs/modules/34-troubleshooting-war-rooms.md`

**Content Requirements:**
- Modul 27: Security Groups vs NACLs, Stateful Conntrack engine & table limits, untracked connections, SG Referencing across peering/TGW, Stateless NACL ephemeral ports (1024-65535).
- Modul 28: AWS Network Firewall, Stateful/Stateless Rule Groups, Suricata 5-tuple & IPS rules, Domain List Filtering (SNI & TLS Decryption), Centralized vs Distributed Inspection topologies.
- Modul 29: AWS WAF (WebACLs, Rate-based rules, Managed Rules) & AWS Shield Advanced (L3/L4/L7 DDoS mitigation, SRT engagement, Route 53 protection).
- Modul 30: Custom VPC Flow Logs (`tcp-flags`, `pkt-srcaddr`, Athena SQL), Traffic Mirroring (VXLAN sessions), VPC Reachability Analyzer & Network Access Analyzer.
- Modul 31: Super Enterprise Multi-Account Hub-and-Spoke Architecture (Control Tower, Central Egress, Central Ingress DMZ, East-West Inspection).
- Modul 32: Financial & Banking Partner Interconnect (BI-FAST, ISO 8583, Private NAT Gateways, Bidirectional NAT, HSM segmentation).
- Modul 33: Multi-Cloud Backbone Interconnect (AWS + Azure ExpressRoute + GCP Interconnect via Equinix Fabric / Megaport).
- Modul 34: 15 Principal SEV-1 Troubleshooting War Rooms with full 7-Section Incident Post-Mortem & Triage Runbook format + embedded `<TroubleshootingDrills />`.

- [ ] **Step 1: Write Modul 27 with 7-layer structure & best practices**
- [ ] **Step 2: Write Modul 28 with 7-layer structure & best practices**
- [ ] **Step 3: Write Modul 29 with 7-layer structure & best practices**
- [ ] **Step 4: Write Modul 30 with 7-layer structure & best practices**
- [ ] **Step 5: Write Modul 31 with 7-layer structure & best practices**
- [ ] **Step 6: Write Modul 32 with 7-layer structure & best practices**
- [ ] **Step 7: Write Modul 33 with 7-layer structure & best practices**
- [ ] **Step 8: Write Modul 34 with 15 complete SEV-1 War Room post-mortems**
- [ ] **Step 9: Verify build with `npm run build`**

---

### Task 10: Implement Interactive Simulators Suite & Quick Reference Cheat Sheet

**Files:**
- Create/Modify: `docs/interactive/cidr-calculator.md`
- Create/Modify: `docs/interactive/bgp-simulator.md`
- Create/Modify: `docs/interactive/packet-tracer.md`
- Create/Modify: `docs/interactive/aws-sandbox.md`
- Create/Modify: `docs/interactive/topology-explorer.md`
- Create/Modify: `docs/interactive/troubleshooting-drills.md`
- Create: `docs/interactive/dx-community-calc.md`
- Create: `docs/interactive/conntrack-calculator.md`
- Modify: `docs/reference/cheat-sheet.md`

- [ ] **Step 1: Implement & verify all 8 interactive tool pages in `docs/interactive/`**
- [ ] **Step 2: Expand `docs/reference/cheat-sheet.md` with complete 34-module SME reference tables**
- [ ] **Step 3: Verify build with `npm run build`**

---

### Task 11: Implement 7 Production Terraform IaC Blueprints & Guides

**Files:**
- Create/Modify: `labs/01-enterprise-ipam-vpc/` & `docs/labs/01-enterprise-ipam-vpc.md`
- Create/Modify: `labs/02-tgw-gwlb-appliance-mode/` & `docs/labs/02-tgw-gwlb-appliance-mode.md`
- Create/Modify: `labs/03-cloud-wan-core-network/` & `docs/labs/03-cloud-wan-core-network.md`
- Create/Modify: `labs/04-financial-partner-private-nat/` & `docs/labs/04-financial-partner-private-nat.md`
- Create/Modify: `labs/05-hybrid-direct-connect-vpn-bfd/` & `docs/labs/05-hybrid-direct-connect-vpn-bfd.md`
- Create: `labs/06-vpc-lattice-microservices/` & `docs/labs/06-vpc-lattice-microservices.md`
- Create: `labs/07-centralized-ingress-egress-firewall/` & `docs/labs/07-centralized-ingress-egress-firewall.md`

- [ ] **Step 1: Write production code and guides for Lab 01 to 05**
- [ ] **Step 2: Create Lab 06 (VPC Lattice Microservices) code and guide**
- [ ] **Step 3: Create Lab 07 (Centralized Ingress/Egress Firewall) code and guide**
- [ ] **Step 4: Verify all Terraform configurations and documentation build**

---

### Task 12: End-to-End Build Verification & Quality Review Gate

- [ ] **Step 1: Run `npm run build` and ensure exit code 0 with 0 SSR/hydration errors**
- [ ] **Step 2: Review all 34 modules, 8 interactive tools, and 7 labs against language and technical standards**
- [ ] **Step 3: Final commit and push / verification**
