---
title: Interactive Packet Flow & Encapsulation Tracer
description: Visualisasi hop-by-hop transformasi header L2/L3/L4 dan enkapsulasi overlay (GENEVE, VXLAN, MACsec, IPsec) di infrastruktur AWS.
---

# 📦 Interactive Packet Flow & Encapsulation Tracer

<BadgeLabel type="sme" text="SME Deep Packet Inspection" /> <BadgeLabel type="rfc" text="GENEVE / VXLAN" />

Dalam arsitektur *Software-Defined Networking (SDN)* modern dan *cloud underlay*, sebuah paket data tidak bergerak di atas physical copper/fiber murni, melainkan dibungkus (*encapsulated*) oleh beberapa lapisan *tunnel overlay* dan diproses oleh hardware akselerasi seperti **AWS Nitro System** dan **AWS Hyperplane**.

<PacketTracer />

## 🔬 Anatomi Protokol Enkapsulasi di AWS

```mermaid
graph LR
    subgraph Original Packet
        L3[Original IP Header: 10.10.1.50 -> 192.168.10.100]
        L4[TCP Segment: Port 49152 -> 3306]
        Data[Payload Data]
    end

    subgraph GENEVE Overlay (GWLB)
        OuterIP[Outer IP: 10.99.1.10 -> 10.99.1.20]
        OuterUDP[Outer UDP: Port 6081]
        GENEVEHeader[GENEVE VNI + Option TLV 0x0108 ENI ID]
    end

    OuterIP --> OuterUDP --> GENEVEHeader --> L3 --> L4 --> Data
```

### Mengapa Gateway Load Balancer Menggunakan GENEVE?
Protokol **GENEVE (Generic Network Virtualization Encapsulation - RFC 8926)** dipilih oleh AWS untuk Gateway Load Balancer karena mendukung *variable-length Type-Length-Value (TLV) metadata options*.

- **TLV Class `0x0108`**: Digunakan AWS untuk menyisipkan informasi *VPC Endpoint (GWLBe) ID* dan *Original ENI Attachment ID*.
- Appliance firewall (Palo Alto, Fortinet, Suricata) membaca metadata ini untuk mengetahui dari VPC mana traffic berasal, kemudian me-re-encapsulate packet dengan TLV yang sama saat mengembalikan traffic ke GWLB.
- Hal ini memungkinkan inspeksi *bump-in-the-wire* yang benar-benar transparan tanpa merusak IP asli (*No SNAT needed*).
