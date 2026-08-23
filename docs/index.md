---
layout: home

hero:
  name: "Cloud Network Engineering Mastery"
  text: "Teori Protokol Jaringan Lanjut & AWS Enterprise Cloud Backbone"
  tagline: "Kurikulum komprehensif level Principal & SME: Dari fundamental RFC dan hardware underlay Nitro, hingga orkestrasi enterprise cloud backbone skala global."
  image:
    src: /logo-network.svg
    alt: Cloud Network Engineering
  actions:
    - theme: brand
      text: "Mulai Belajar: Modul 01"
      link: /modules/01-subnetting-vlsm-ipam
    - theme: alt
      text: "Interactive Lab Tools"
      link: /interactive/cidr-calculator
    - theme: alt
      text: "SME Cheat Sheet"
      link: /reference/cheat-sheet
    - theme: alt
      text: "15 SEV-1 War Rooms"
      link: /interactive/troubleshooting-drills

features:
  - title: "Part 1: Protocol Theory & Underlay Physics"
    details: "Subnetting biner, supernetting, VLSM, IPv6, TCP windowing, PMTUD, BGP 13-step best path selection, BFD sub-second failover, dan GENEVE/VXLAN encapsulation."
  - title: "Part 2: Hardware Underlay & VPC Core"
    details: "Nitro System, ENA Express (SRD), Hyperplane flow state machine, ENI deep-dive, EFA untuk AI/HPC clusters, Prefix Delegation, IPv6-only VPC, dan RAM Subnet Sharing."
  - title: "Part 3: VPC Routing & Edge Gateways"
    details: "Longest Prefix Match (LPM) priority engine, Ingress Edge Route Tables, IGW/EIGW stateless NAT mechanics, Public & Private NAT Gateways, dan VPC Peering underlay mesh."
  - title: "Part 4: Private Connectivity & PrivateLink"
    details: "Gateway VPC Endpoints (S3 & DynamoDB), AWS PrivateLink Hyperplane ENIs, Cross-Account Endpoint Services, dan GWLB inline inspection (1-Arm / 2-Arm)."
  - title: "Part 5: Hybrid Interconnect & Direct Connect"
    details: "Dedicated & Hosted Direct Connect, LAG, IEEE 802.1AE MACsec 10G/100G encryption, Private/Transit/Public VIFs, Direct Connect Gateway, Accelerated VPN, dan Client VPN / Verified Access (ZTNA)."
  - title: "Part 6: Enterprise WAN & Cloud WAN"
    details: "Transit Gateway Core Routing, Appliance Mode symmetric hashing, Multicast IGMPv2, TGW Connect GRE/BGP, dan AWS Cloud WAN Global Backbone berbasis Core Network Policy."
  - title: "Part 7: Application Networking & Edge"
    details: "ALB vs NLB, mTLS, Proxy Protocol v2, Route 53 Resolver Inbound/Outbound Endpoints & DNS Firewall, CloudFront Anycast Edge, Global Accelerator, dan AWS VPC Lattice microservices mesh."
  - title: "Part 8: Security, Telemetry & War Rooms"
    details: "Security Groups vs NACLs conntrack limits, AWS Network Firewall Suricata IPS, WAF & Shield Advanced DDoS, Custom Flow Logs, Reachability Analyzer, dan 15 SEV-1 Incident Post-Mortems."
---

<div class="home-roadmap-container">

## Peta Jalan Kurikulum Master (8-Part, 34-Module Roadmap)

Kurikulum ini dirancang dengan metodologi **7-Layer Deep Technical Architecture**: setiap modul menyajikan teori protokol standar RFC, rancang bangun underlay AWS, analisis batas performa (*hard limits*), alur paket *hop-by-hop*, blueprint Terraform siap pakai, skenario *failure modes* produksi, serta kerangka *tradeoff* arsitektur level Principal.

```mermaid
graph TD
    subgraph Part1["Part 1: Foundations & Protocol Physics"]
        M01["01. Subnetting & IPAM"] --> M02["02. TCP & PMTUD"] --> M03["03. Advanced BGP-4"] --> M04["04. Overlays & SDN"]
    end

    subgraph Part2["Part 2: Hardware Underlay & VPC Core"]
        M05["05. Nitro & Hyperplane"] --> M06["06. ENI, EFA & Prefix"] --> M07["07. VPC & RAM Sharing"]
    end

    subgraph Part3["Part 3: VPC Routing & Edge Gateways"]
        M08["08. Route Tables & LPM"] --> M09["09. IGW & EIGW"] --> M10["10. NAT Gateways"] --> M11["11. VPC Peering"]
    end

    subgraph Part4["Part 4: PrivateLink & GWLB"]
        M12["12. Gateway Endpoints"] --> M13["13. AWS PrivateLink"] --> M14["14. GWLB & NGFW"]
    end

    subgraph Part5["Part 5: Hybrid & Direct Connect"]
        M15["15. DX & MACsec"] --> M16["16. VIFs & BGP Policies"] --> M17["17. DX Gateway Backbone"] --> M18["18. VPN & Accelerated VPN"] --> M19["19. Client VPN & ZTNA"]
    end

    subgraph Part6["Part 6: Enterprise WAN & Cloud WAN"]
        M20["20. TGW Core Routing"] --> M21["21. TGW Appliance & Connect"] --> M22["22. Cloud WAN Global Mesh"]
    end

    subgraph Part7["Part 7: Application Networking & DNS"]
        M23["23. ALB, NLB & mTLS"] --> M24["24. Route 53 Resolver"] --> M25["25. CloudFront & AGA"] --> M26["26. VPC Lattice & CNI"]
    end

    subgraph Part8["Part 8: Security & War Rooms"]
        M27["27. SG, NACL & Conntrack"] --> M28["28. Network Firewall"] --> M29["29. WAF & Shield"] --> M30["30. Flow Logs & Forensics"] --> M31["31. Multi-Account Backbone"] --> M32["32. Partner Interconnect & NAT"] --> M33["33. Multi-Cloud Mesh"] --> M34["34. 15 SEV-1 War Rooms"]
    end

    M04 --> M05
    M07 --> M08
    M11 --> M12
    M14 --> M15
    M19 --> M20
    M22 --> M23
    M26 --> M27
```

<div class="grid-2 mt-6">
  <div class="p-4 bg-[var(--vp-c-bg-alt)] rounded-xl border border-[var(--vp-c-divider)]">
    <h3 class="text-sm font-bold text-blue-400 mb-2">Standar Bahasa & Terminologi</h3>
    <p class="text-xs text-[var(--vp-c-text-2)] leading-relaxed">
      Disajikan dalam <strong>Bahasa Indonesia</strong> teknis profesional, dengan 100% terminologi industri menggunakan istilah asli <strong>English</strong> (<em>subnet, route table, autonomous system, packet, handshake, payload, throughput, peering, advertisement, encapsulation</em>).
    </p>
  </div>
  <div class="p-4 bg-[var(--vp-c-bg-alt)] rounded-xl border border-[var(--vp-c-divider)]">
    <h3 class="text-sm font-bold text-emerald-400 mb-2">Kompetensi Inti</h3>
    <p class="text-xs text-[var(--vp-c-text-2)] leading-relaxed">
      Menguasai perancangan alokasi IP enterprise skala besar, konfigurasi Direct Connect & Cloud WAN dengan failover sub-second, inspeksi traffic tersentralisasi menggunakan Next-Gen Firewall, serta investigasi insiden jaringan kritis secara independen.
    </p>
  </div>
</div>

</div>

