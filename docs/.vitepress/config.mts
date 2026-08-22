import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/cloud-network-learning-materials/',
  title: 'Cloud Network Engineering Mastery',
  description: 'Materi Pembelajaran Komprehensif Teori Jaringan Lanjut & AWS Enterprise Cloud Networking untuk Level SME / Principal Cloud Network Engineer (O\'Reilly / McGraw-Hill Technical Standard)',
  lang: 'id-ID',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    config: (md) => {
      const defaultFence = md.renderer.rules.fence!
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        if (token.info.trim() === 'mermaid') {
          const encoded = encodeURIComponent(token.content)
          return `<ClientOnly><MermaidRenderer code="${encoded}" /></ClientOnly>`
        }
        return defaultFence(tokens, idx, options, env, self)
      }
    }
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 3000
    }
  },
  themeConfig: {
    logo: '🌐',
    siteTitle: 'Cloud Network SME',
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Curriculum (8 Parts)',
        items: [
          { text: 'Part 1: Protocol Theory & Underlay Physics', link: '/modules/01-subnetting-vlsm-ipam' },
          { text: 'Part 2: Hardware Underlay & VPC Core', link: '/modules/05-aws-underlay-hyperplane' },
          { text: 'Part 3: VPC Routing & Edge Gateways', link: '/modules/08-route-tables-lpm-ingress' },
          { text: 'Part 4: Private Connectivity & PrivateLink', link: '/modules/12-gateway-vpc-endpoints' },
          { text: 'Part 5: Hybrid Interconnect & Direct Connect', link: '/modules/15-direct-connect-macsec' },
          { text: 'Part 6: Enterprise WAN & Cloud WAN', link: '/modules/20-transit-gateway-core-routing' },
          { text: 'Part 7: Application Networking, DNS & Edge', link: '/modules/23-load-balancing-alb-nlb-mtls' },
          { text: 'Part 8: Security, Observability & War Rooms', link: '/modules/27-security-groups-nacls-conntrack' }
        ]
      },
      {
        text: 'Interactive Lab Tools',
        items: [
          { text: 'CIDR & IPAM Hierarchy Allocator', link: '/interactive/cidr-calculator' },
          { text: 'BGP 13-Step Decision Simulator', link: '/interactive/bgp-simulator' },
          { text: 'Packet Flow & Encapsulation Tracer', link: '/interactive/packet-tracer' },
          { text: 'AWS Route Table LPM Sandbox', link: '/interactive/aws-sandbox' },
          { text: 'Interactive Topology Explorer', link: '/interactive/topology-explorer' },
          { text: '15 SEV-1 Troubleshooting Drills', link: '/interactive/troubleshooting-drills' },
          { text: 'Direct Connect BGP Community Calculator', link: '/interactive/dx-community-calc' },
          { text: 'Security Group Conntrack & NAT Calculator', link: '/interactive/conntrack-calculator' }
        ]
      },
      {
        text: 'Terraform IaC Labs',
        items: [
          { text: 'Lab 01: Enterprise IPAM & Multi-Tier VPC', link: '/labs/01-enterprise-ipam-vpc' },
          { text: 'Lab 02: TGW Hub & GWLB Appliance Mode', link: '/labs/02-tgw-gwlb-appliance-mode' },
          { text: 'Lab 03: Cloud WAN Global SD-WAN Mesh', link: '/labs/03-cloud-wan-core-network' },
          { text: 'Lab 04: Financial Partner Private NAT Interconnect', link: '/labs/04-financial-partner-private-nat' },
          { text: 'Lab 05: Hybrid Direct Connect & Accelerated VPN', link: '/labs/05-hybrid-direct-connect-vpn-bfd' },
          { text: 'Lab 06: VPC Lattice Microservices Mesh', link: '/labs/06-vpc-lattice-microservices' },
          { text: 'Lab 07: Central Ingress/Egress Inspection Firewall', link: '/labs/07-centralized-ingress-egress-firewall' }
        ]
      },
      { text: '📑 SME Reference', link: '/reference/cheat-sheet' }
    ],
    sidebar: [
      {
        text: '🌟 Getting Started',
        items: [
          { text: 'Executive Overview & 34-Module Roadmap', link: '/' },
          { text: '📑 SME Quick Reference & Cheat Sheets', link: '/reference/cheat-sheet' }
        ]
      },
      {
        text: '🛠️ Interactive Simulators & Tools',
        collapsed: false,
        items: [
          { text: 'CIDR & IPAM Hierarchy Allocator', link: '/interactive/cidr-calculator' },
          { text: 'BGP 13-Step Decision Simulator', link: '/interactive/bgp-simulator' },
          { text: 'Packet Flow & Encapsulation Tracer', link: '/interactive/packet-tracer' },
          { text: 'AWS Hybrid Route LPM Sandbox', link: '/interactive/aws-sandbox' },
          { text: 'Global Topology Explorer', link: '/interactive/topology-explorer' },
          { text: '15 SEV-1 Troubleshooting War Rooms', link: '/interactive/troubleshooting-drills' },
          { text: 'Direct Connect Community Tool', link: '/interactive/dx-community-calc' },
          { text: 'Conntrack & NAT Port Calculator', link: '/interactive/conntrack-calculator' }
        ]
      },
      {
        text: '🏗️ Hands-On Terraform IaC Blueprints',
        collapsed: false,
        items: [
          { text: 'Lab 01: Enterprise IPAM & Multi-Tier VPC', link: '/labs/01-enterprise-ipam-vpc' },
          { text: 'Lab 02: TGW Hub & GWLB Appliance Mode', link: '/labs/02-tgw-gwlb-appliance-mode' },
          { text: 'Lab 03: Cloud WAN Global SD-WAN Mesh', link: '/labs/03-cloud-wan-core-network' },
          { text: 'Lab 04: Financial Partner Private NAT Interconnect', link: '/labs/04-financial-partner-private-nat' },
          { text: 'Lab 05: Hybrid Direct Connect & Accelerated VPN', link: '/labs/05-hybrid-direct-connect-vpn-bfd' },
          { text: 'Lab 06: VPC Lattice Microservices Mesh', link: '/labs/06-vpc-lattice-microservices' },
          { text: 'Lab 07: Central Ingress/Egress Inspection Firewall', link: '/labs/07-centralized-ingress-egress-firewall' }
        ]
      },
      {
        text: '📚 Part 1: Advanced Network Protocols & Theory',
        collapsed: false,
        items: [
          { text: '01. Subnetting, VLSM & Enterprise IPAM', link: '/modules/01-subnetting-vlsm-ipam' },
          { text: '02. TCP Transport, PMTUD & Congestion Control', link: '/modules/02-tcp-mechanics-mtu-mss' },
          { text: '03. Advanced BGP-4 & Dynamic Routing Mastery', link: '/modules/03-dynamic-routing-bgp-mastery' },
          { text: '04. Overlay Networks, SDN & IPsec Internals', link: '/modules/04-overlays-sdn-tunneling' }
        ]
      },
      {
        text: '☁️ Part 2: AWS Hardware Underlay & VPC Core',
        collapsed: false,
        items: [
          { text: '05. AWS Underlay: Nitro, ENA Express & Hyperplane', link: '/modules/05-aws-underlay-hyperplane' },
          { text: '06. Elastic Network Interfaces (ENI) & EFA', link: '/modules/06-eni-efa-prefix-delegation' },
          { text: '07. VPC Architecture, Multi-CIDR & RAM Sharing', link: '/modules/07-vpc-architecture-multi-cidr' }
        ]
      },
      {
        text: '🚦 Part 3: VPC Routing Mechanics & Edge Gateways',
        collapsed: false,
        items: [
          { text: '08. Route Tables, LPM & Ingress Edge Routing', link: '/modules/08-route-tables-lpm-ingress' },
          { text: '09. Internet Gateway (IGW) & Egress-Only IGW', link: '/modules/09-igw-eigw-nat-mechanics' },
          { text: '10. AWS NAT Gateways (Public & Private NAT)', link: '/modules/10-nat-gateways-public-private' },
          { text: '11. VPC Peering Architecture & Underlay Mesh', link: '/modules/11-vpc-peering-underlay-mesh' }
        ]
      },
      {
        text: '🔒 Part 4: Private Connectivity & PrivateLink',
        collapsed: false,
        items: [
          { text: '12. Gateway VPC Endpoints (S3 & DynamoDB)', link: '/modules/12-gateway-vpc-endpoints' },
          { text: '13. AWS PrivateLink & Interface VPC Endpoints', link: '/modules/13-privatelink-interface-endpoints' },
          { text: '14. Gateway Load Balancer (GWLB) & Inline NGFW', link: '/modules/14-gwlb-firewall-insertion' }
        ]
      },
      {
        text: '⚡ Part 5: Hybrid Interconnect & Direct Connect',
        collapsed: false,
        items: [
          { text: '15. AWS Direct Connect (Dedicated, Hosted, MACsec)', link: '/modules/15-direct-connect-macsec' },
          { text: '16. Direct Connect VIFs & BGP Routing Policies', link: '/modules/16-direct-connect-vifs-bgp' },
          { text: '17. Direct Connect Gateway (DXGW) Multi-Region Backbone', link: '/modules/17-direct-connect-gateway-dxgw' },
          { text: '18. AWS Site-to-Site VPN & Accelerated VPN', link: '/modules/18-vpn-accelerated-vpn-ecmp' },
          { text: '19. AWS Client VPN & AWS Verified Access (ZTNA)', link: '/modules/19-client-vpn-verified-access' }
        ]
      },
      {
        text: '🌐 Part 6: Enterprise WAN & Cloud WAN',
        collapsed: false,
        items: [
          { text: '20. AWS Transit Gateway (TGW) Core Routing', link: '/modules/20-transit-gateway-core-routing' },
          { text: '21. TGW Advanced: Appliance Mode, Multicast & Connect', link: '/modules/21-tgw-appliance-multicast-connect' },
          { text: '22. AWS Cloud WAN Global Backbone & Network Policy', link: '/modules/22-cloud-wan-mesh-policy' }
        ]
      },
      {
        text: '🚀 Part 7: Application Networking, DNS & Edge',
        collapsed: false,
        items: [
          { text: '23. Elastic Load Balancing (ALB, NLB, mTLS & Proxy Protocol)', link: '/modules/23-load-balancing-alb-nlb-mtls' },
          { text: '24. Route 53 Resolver, DNS Firewall & Hybrid DNS', link: '/modules/24-route53-resolver-dns-firewall' },
          { text: '25. CloudFront Anycast Edge & AWS Global Accelerator', link: '/modules/25-cloudfront-global-accelerator' },
          { text: '26. AWS VPC Lattice & Modern Container Networking', link: '/modules/26-vpc-lattice-container-cni' }
        ]
      },
      {
        text: '🛡️ Part 8: Security, Observability & War Rooms',
        collapsed: false,
        items: [
          { text: '27. Security Groups vs NACLs & Conntrack Semantics', link: '/modules/27-security-groups-nacls-conntrack' },
          { text: '28. AWS Network Firewall & Suricata Deep IPS', link: '/modules/28-network-firewall-suricata-ips' },
          { text: '29. AWS WAF & AWS Shield Advanced DDoS Defense', link: '/modules/29-waf-shield-ddos-defense' },
          { text: '30. Custom VPC Flow Logs, Traffic Mirroring & Reachability', link: '/modules/30-observability-flow-logs-analyzer' },
          { text: '31. Super Enterprise Multi-Account Hub-and-Spoke', link: '/modules/31-super-enterprise-backbone' },
          { text: '32. Financial & Banking Partner Interconnect (BI-FAST)', link: '/modules/32-banking-partner-interconnect' },
          { text: '33. Multi-Cloud Interconnect (AWS + Azure + GCP via Equinix)', link: '/modules/33-multi-cloud-interconnect' },
          { text: '34. 15 Principal SEV-1 Troubleshooting War Rooms', link: '/modules/34-troubleshooting-war-rooms' }
        ]
      }
    ],
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/robertusnegoro/cloud-network-learning-materials' }
    ],
    footer: {
      message: 'Advanced Cloud Network Engineering Mastery Portal • RFC Deep-Dive to AWS Super Enterprise Scale',
      copyright: 'Copyright © 2026 Cloud Network SME Program'
    },
    docFooter: {
      prev: 'Sebelumnya',
      next: 'Selanjutnya'
    },
    outline: {
      level: [2, 3],
      label: 'Daftar Isi Halaman'
    }
  }
})
