<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Incident {
  id: number
  title: string
  severity: 'SEV-1 CRITICAL' | 'SEV-2 HIGH' | 'SEV-3 MEDIUM'
  category: string
  background: string
  logs: string
  question: string
  options: {
    text: string
    isCorrect: boolean
    explanation: string
  }[]
  cliCommands?: Record<string, string>
}

const incidents: Incident[] = [
  {
    id: 1,
    title: 'The Asymmetric Routing Trap in Multi-AZ GWLB Inspection Hub',
    severity: 'SEV-1 CRITICAL',
    category: 'Inspection & GWLB',
    background: 'Workload di Spoke VPC AZ-A mengirim traffic ke Spoke VPC AZ-B melewati Central Inspection VPC dengan Gateway Load Balancer dan Palo Alto firewall cluster. Koneksi TCP SYN berhasil dikirim, tetapi client selalu mengalami TCP RST atau connection timeout acak (50% kegagalan).',
    logs: `// VPC Flow Logs (Inspection ENI AZ-A)
2 123456789012 eni-0a1b2c3d4e 10.10.1.50 10.20.2.80 49152 443 6 1 60 1620000000 1620000060 ACCEPT OK (SYN)

// Firewall Logs (Palo Alto Appliance AZ-B)
2026/08/22 14:10:02 [DROP] TCP flow 10.20.2.80:443 -> 10.10.1.50:49152: Reason: Non-SYN packet received for non-existing session (Stateful TCP Inspection Failure)`,
    question: 'Apa akar masalah arsitektural (root-cause) dari kegagalan stateful inspection ini dan apa solusinya?',
    cliCommands: {
      'aws ec2 describe-transit-gateway-vpc-attachments --filters "Name=vpc-id,Values=vpc-inspection"': `{\n  "TransitGatewayVpcAttachments": [{\n    "TransitGatewayAttachmentId": "tgw-attach-insp-01",\n    "VpcId": "vpc-inspection",\n    "Options": {\n      "ApplianceModeSupport": "disable",\n      "Ipv6Support": "enable"\n    }\n  }]\n}`,
      'traceroute 10.20.2.80': 'traceroute to 10.20.2.80 (10.20.2.80), 30 hops max\n 1  10.10.1.1 (VPC Gateway)  0.42 ms\n 2  tgw-attach-spoke1 (TGW)  0.95 ms\n 3  10.99.1.20 (PaloAlto AZ-A)  1.45 ms\n 4  10.20.2.80 (Target)  2.10 ms'
    },
    options: [
      {
        text: 'AWS Transit Gateway Appliance Mode belum diaktifkan pada attachment Inspection VPC. Solusi: Aktifkan TGW Appliance Mode agar flow forward & return selalu diarahkan ke ENI pada Availability Zone yang sama.',
        isCorrect: true,
        explanation: 'BENAR! Tanpa TGW Appliance Mode, return traffic dari AZ-B akan di-hash oleh TGW ke AZ-B gateway ENI, bukan ke AZ-A firewall tempat session SYN pertama kali tercatat. Stateful firewall di AZ-B menolak paket SYN-ACK/ACK karena tidak menemukan entry di session table.'
      },
      {
        text: 'Security Group pada Gateway Load Balancer memblokir traffic TCP port 443. Solusi: Tambahkan ingress rule 0.0.0.0/0 pada SG GWLB.',
        isCorrect: false,
        explanation: 'SALAH. Gateway Load Balancer beroperasi di L3/L4 dan tidak memiliki Security Group sendiri; SG dievaluasi di level EC2 target atau Endpoint ENI, bukan penyebab asimetris session state.'
      },
      {
        text: 'MTU pada GENEVE tunnel melebihi batas 1500 bytes. Solusi: Turunkan MTU pada client menjadi 1400.',
        isCorrect: false,
        explanation: 'SALAH. Masalah ini disebabkan oleh asimetri stateful session pada firewall multi-AZ, bukan karena packet fragmentation/drop MTU.'
      }
    ]
  },
  {
    id: 2,
    title: 'The MTU 1500 vs 9001 Black Hole over Direct Connect',
    severity: 'SEV-1 CRITICAL',
    category: 'Direct Connect & BGP',
    background: 'Aplikasi microservice di AWS dapat melakukan ping dan koneksi SSH/HTTP payload kecil ke database on-premise melalui Direct Connect, tetapi ketika melakukan query SELECT data besar atau file transfer, koneksi langsung hang tanpa error eksplisit.',
    logs: `// Linux Client Traceroute & ICMP Probe
$ ping -M do -s 1472 192.168.10.100  --> SUCCESS (1500 bytes wire)
$ ping -M do -s 8972 192.168.10.100  --> Packet needs to be fragmented but DF set (ICMP Type 3, Code 4 dropped by on-prem ACL)
$ curl -k https://192.168.10.100/export.csv --> HANGS FOREVER (Window stuck)`,
    question: 'Mengapa file transfer besar hang sementara koneksi kecil berhasil?',
    cliCommands: {
      'ping -M do -s 8972 192.168.10.100': 'PING 192.168.10.100 (192.168.10.100) 8972(9000) bytes of data.\nFrom 169.254.240.2: icmp_seq=1 Frag needed and DF set (mtu = 1500)\n--- 192.168.10.100 ping statistics ---\n1 packets transmitted, 0 received, +1 errors, 100% packet loss',
      'ip link show ens5': '2: ens5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9001 qdisc mq state UP mode DEFAULT group default qlen 1000\n    link/ether 06:12:34:56:78:9a brd ff:ff:ff:ff:ff:ff'
    },
    options: [
      {
        text: 'EC2 instance menggunakan Jumbo Frames (MTU 9001) secara default di VPC, dan router perantara/Direct Connect memiliki MTU 1500 sementara ICMP Type 3 Code 4 (Fragmentation Needed) di-drop oleh firewall/ACL on-premise (PMTUD Black Hole).',
        isCorrect: true,
        explanation: 'BENAR! Ini adalah Path MTU Discovery (PMTUD) Black Hole klasik. Ketika TCP negotiation menegosiasikan MSS besar berdasarkan MTU 9001 EC2, paket besar di-drop saat menyentuh link MTU 1500 karena DF (Don\'t Fragment) bit aktif dan ICMP Type 3 Code 4 di-drop oleh security policy.'
      },
      {
        text: 'Direct Connect connection mengalami BGP route dampening akibat flapping link.',
        isCorrect: false,
        explanation: 'SALAH. Jika BGP flapping/dampened, koneksi SSH/ping kecil pun tidak akan bisa tembus sama sekali.'
      },
      {
        text: 'NAT Gateway kehabisan ephemeral ports untuk koneksi data besar.',
        isCorrect: false,
        explanation: 'SALAH. Direct Connect tidak melalui NAT Gateway.'
      }
    ]
  },
  {
    id: 3,
    title: 'NAT Gateway Ephemeral Port Exhaustion under Flash Crowd',
    severity: 'SEV-2 HIGH',
    category: 'Egress & NAT',
    background: 'Saat flash sale, ribuan container di EKS private subnet melakukan panggilan API keluar ke payment gateway eksternal (IP tunggal 203.0.113.50:443). Muncul error "Connection timed out" secara masif di microservice.',
    logs: `// CloudWatch Metric: AWS/NATGateway
ErrorPortAllocation: 45,210 occurrences/min
ActiveConnectionCount: 55,000 (Saturation reached for single destination IP:Port)`,
    question: 'Bagaimana solusi permanen level senior network engineer untuk mengatasi limit 55,000 concurrent connection ke single destination IP pada AWS NAT Gateway?',
    cliCommands: {
      'aws ec2 describe-nat-gateways --nat-gateway-ids nat-0123456789': `{\n  "NatGateways": [{\n    "NatGatewayId": "nat-0123456789",\n    "NatGatewayAddresses": [{\n      "AllocationId": "eipalloc-01",\n      "PublicIp": "198.51.100.25"\n    }],\n    "State": "available"\n  }]\n}`
    },
    options: [
      {
        text: 'Mengasosiasikan Multiple Secondary Private IPv4/Elastic IPs pada NAT Gateway (hingga 8 IP = 440,000 connection tuples) atau menggunakan PrivateLink / Interface VPC Endpoint ke payment gateway jika didukung.',
        isCorrect: true,
        explanation: 'BENAR! NAT Gateway memiliki limit 55,000 concurrent connection per unique destination endpoint (IP:Port) per Elastic IP. Dengan menambahkan secondary EIPs pada NAT GW atau beralih ke PrivateLink, pool 5-tuple diperbesar secara signifikan.'
      },
      {
        text: 'Membuat EC2 NAT Instance custom menggunakan iptables tanpa limit.',
        isCorrect: false,
        explanation: 'SALAH. EC2 NAT Instance memiliki throughput jauh lebih rendah, single point of failure, dan tidak scalable untuk enterprise flash crowd dibandingkan Hyperplane NAT GW.'
      },
      {
        text: 'Membuka Security Group egress port 0-65535 pada instance EKS.',
        isCorrect: false,
        explanation: 'SALAH. SG tidak mengubah ketersediaan source port allocation pada NAT Gateway Hyperplane.'
      }
    ]
  },
  {
    id: 4,
    title: 'BGP Route Flapping & Route Dampening Disaster over DX',
    severity: 'SEV-1 CRITICAL',
    category: 'Direct Connect & BGP',
    background: 'Kabel fiber fisik Direct Connect mengalami degradasi sinyal transien (flapping 5x dalam 2 menit). Meskipun link fiber sudah stabil kembali, rute menuju AWS menghilang dari tabel routing core router on-premise selama 45 menit ke depan.',
    logs: `// Cisco Router BGP Flap Statistics
# show ip bgp flap-statistics 10.100.0.0/16
 BGP routing table entry for 10.100.0.0/16, version 892
 Paths: (1 available, best #1)
  64512
    169.254.240.1 from 169.254.240.1 (169.254.240.1)
    Flaps: 5, Penalty: 3200, Status: Dampened, Suppressed for 00:43:12`,
    question: 'Mengapa prefix AWS di-suppress dan apa langkah operasional terbaik untuk mencegah kejadian serupa di masa depan?',
    cliCommands: {
      'show ip bgp summary': 'BGP router identifier 192.168.10.1, local AS number 65000\nNeighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n169.254.240.1   4 64512    1245    1250      892    0    0 00:02:14 (Flap Dampened)'
    },
    options: [
      {
        text: 'Router menerapkan BGP Route Flap Dampening (RFC 2439) yang menghukum prefix yang sering flap dengan penalty suppress. Solusi: Bersihkan flap statistics dengan "clear ip bgp flap-statistics" dan aktifkan BFD (Bidirectional Forwarding Detection) dengan sub-second timers untuk mendeteksi link failure lebih awal tanpa micro-flapping.',
        isCorrect: true,
        explanation: 'BENAR! BGP Route Flap Dampening menghukum prefix yang berulang kali berfluktuasi agar tidak membebani internet/core router. Mengaktifkan BFD memungkinkan failover seketika sebelum BGP FSM mengalami flapping berkali-kali.'
      },
      {
        text: 'Direct Connect Gateway secara otomatis memblokir ASN pelanggan setelah 5 kali disconnect. Solusi: Ajukan AWS Support ticket untuk unblock ASN.',
        isCorrect: false,
        explanation: 'SALAH. DXGW tidak memblokir ASN; dampening terjadi di router customer / telco transit provider.'
      },
      {
        text: 'BGP Keepalive timer terlalu kecil sehingga session kedaluwarsa. Solusi: Tingkatkan Keepalive ke 600 detik.',
        isCorrect: false,
        explanation: 'SALAH. Meningkatkan keepalive justru membuat deteksi putusnya link menjadi sangat lambat (hingga 30 menit).'
      }
    ]
  },
  {
    id: 5,
    title: 'Direct Connect to VPN Failover Routing Asymmetry & Sub-Optimal Return Path',
    severity: 'SEV-1 CRITICAL',
    category: 'Direct Connect & BGP',
    background: 'Perusahaan memiliki Primary link Direct Connect dan Backup IPsec Site-to-Site VPN yang terhubung ke TGW. Saat link DX down, traffic failover ke VPN dengan lancar. Namun ketika link DX pulih (UP), terjadi packet drop 100% pada traffic outbound dari on-premise ke AWS.',
    logs: `// On-Premises Router BGP Table (Post-Recovery)
# show ip bgp 10.100.0.0/16
*> 169.254.240.1 (via DX)   Local-Pref: 200, AS-Path: 64512
*  169.254.242.1 (via VPN)  Local-Pref: 100, AS-Path: 64512 64512 64512

// AWS TGW Ingress Inspection
Traffic dari On-Prem masuk via DX (Sesuai Local-Pref 200).
Namun return traffic dari AWS ke On-Prem masih mengalir lewat VPN karena AWS TGW belum menerima BGP update propagation dari DXGW!`,
    question: 'Apa langkah konfigurasi BGP yang wajib diterapkan agar failback dari VPN ke Direct Connect berlangsung deterministik tanpa traffic loss?',
    cliCommands: {
      'show ip bgp 10.100.0.0/16': 'BGP routing table entry for 10.100.0.0/16\nPaths: (2 available, best #1)\n  64512\n    169.254.240.1 (metric 10) from 169.254.240.1\n      Origin IGP, metric 10, localpref 200, valid, external, best\n      Community: 7224:7300'
    },
    options: [
      {
        text: 'Menggunakan BGP Community tags AWS (7224:7300 untuk Primary DX, 7224:7100 untuk Secondary VPN) yang dipasangkan dengan AS-Path Prepending simetris di kedua arah, serta mengonfigurasi BGP Graceful Restart & BFD.',
        isCorrect: true,
        explanation: 'BENAR! Sinyal Local Preference AWS harus dikontrol secara eksplisit menggunakan community tags 7224:7300 (Local-Pref 90) dan 7224:7100 (Local-Pref 70) agar AWS TGW dan On-Premises router mengubah status Best Path secara simetris dan sinkron.'
      },
      {
        text: 'Menghapus session BGP pada VPN dan menggantinya dengan static routing.',
        isCorrect: false,
        explanation: 'SALAH. Static routing tidak mendukung failover dinamis dan memiliki SLA recovery yang jauh lebih buruk.'
      },
      {
        text: 'Mengubah MTU pada VPN tunnel menjadi 9001 bytes.',
        isCorrect: false,
        explanation: 'SALAH. VPN berjalan di atas public internet yang tidak mendukung MTU 9001.'
      }
    ]
  },
  {
    id: 6,
    title: 'Route 53 Split-Horizon DNS Forwarding Infinite Recursive Loop',
    severity: 'SEV-1 CRITICAL',
    category: 'DNS & PrivateLink',
    background: 'Setelah mengonfigurasi Route 53 Outbound Endpoint untuk me-forward query internal ke domain controller on-premise, CPU pada server DNS Active Directory on-premise melonjak ke 100% dan seluruh query DNS perusahaan mengalami timeout total.',
    logs: `// BIND / Active Directory DNS Server Query Log
2026/08/22 15:20:01 query: app.corp.internal IN A + (10.100.1.2)
2026/08/22 15:20:01 query: app.corp.internal IN A + (10.100.1.2)
[100,000 queries per second detected originating from Route 53 Outbound Endpoint ENI!]`,
    question: 'Apa penyebab terjadinya infinite loop pada DNS hybrid dan bagaimana solusinya?',
    cliCommands: {
      'dig @10.100.1.2 app.corp.internal': ';; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 48192\n;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 0\n;; Query time: 2004 msec\n;; SERVER: 10.100.1.2#53(10.100.1.2)'
    },
    options: [
      {
        text: 'Terjadi circular forwarding: Route 53 Resolver Rule meneruskan domain "corp.internal" ke on-premise DNS, sementara on-premise DNS memiliki conditional forwarder untuk "*.internal" kembali ke Route 53 Inbound Endpoint. Solusi: Gunakan subdomain yang jelas terpisah (misal: "aws.corp.internal" untuk AWS dan "onprem.corp.internal" untuk DC lokal).',
        isCorrect: true,
        explanation: 'BENAR! Circular DNS Forwarding terjadi ketika kedua resolver saling melempar query yang sama bolak-balik tanpa akhir hingga kapasitas queue dan CPU exhausted. Penataan zona namespace domain terpisah adalah best-practice mutlak.'
      },
      {
        text: 'Route 53 Outbound Endpoint tidak mendukung query tipe A record.',
        isCorrect: false,
        explanation: 'SALAH. Route 53 Resolver mendukung semua record tipe standar DNS (A, AAAA, CNAME, PTR, SRV, TXT).'
      },
      {
        text: 'Security Group pada Outbound Endpoint memblokir port UDP 53.',
        isCorrect: false,
        explanation: 'SALAH. Jika port UDP 53 diblokir, query akan langsung drop (timeout), bukan menghasilkan 100,000 query loop per detik.'
      }
    ]
  },
  {
    id: 7,
    title: 'TGW Appliance Mode Misconfiguration Causing Random TCP Resets',
    severity: 'SEV-2 HIGH',
    category: 'Inspection & GWLB',
    background: 'Setelah mengaktifkan TGW Appliance Mode untuk meningkatkan performa firewall, tim developer melaporkan bahwa koneksi antar service di Spoke VPC justru mengalami error TCP connection reset yang lebih parah.',
    logs: `// AWS CLI Configuration Inspection
$ aws ec2 describe-transit-gateway-vpc-attachments
[
  { "AttachmentId": "tgw-attach-spoke1", "ApplianceModeSupport": "enable" }, // WRONG!
  { "AttachmentId": "tgw-attach-spoke2", "ApplianceModeSupport": "enable" }, // WRONG!
  { "AttachmentId": "tgw-attach-inspection", "ApplianceModeSupport": "disable" } // WRONG!
]`,
    question: 'Mengapa konfigurasi TGW Appliance Mode di atas salah fatal dan bagaimana perbaikannya?',
    cliCommands: {
      'aws ec2 describe-transit-gateway-vpc-attachments': '[\n  { "AttachmentId": "tgw-attach-spoke1", "ApplianceModeSupport": "enable" },\n  { "AttachmentId": "tgw-attach-spoke2", "ApplianceModeSupport": "enable" },\n  { "AttachmentId": "tgw-attach-inspection", "ApplianceModeSupport": "disable" }\n]'
    },
    options: [
      {
        text: 'Appliance Mode diaktifkan pada Spoke VPC bukan pada Inspection VPC. Appliance Mode HANYA boleh diaktifkan pada VPC Attachment yang menampung cluster Firewall/GWLB appliance, sedangkan Spoke VPC harus tetap disabled.',
        isCorrect: true,
        explanation: 'BENAR! Mengaktifkan Appliance Mode pada Spoke VPC akan merusak flow hashing default TGW untuk komunikasi normal. Appliance Mode secara khusus dirancang untuk Inspection VPC Attachment agar forward & return flow dipaksa melalui ENI AZ yang simetris.'
      },
      {
        text: 'Appliance Mode memerlukan lisensi tambahan dari AWS Marketplace.',
        isCorrect: false,
        explanation: 'SALAH. Appliance Mode adalah fitur bawaan AWS Transit Gateway tanpa biaya lisensi tambahan.'
      },
      {
        text: 'Appliance Mode hanya bekerja jika seluruh Spoke VPC berada di 1 AZ saja.',
        isCorrect: false,
        explanation: 'SALAH. Justru Appliance Mode diciptakan untuk menyelesaikan masalah multi-AZ cross-zone routing.'
      }
    ]
  },
  {
    id: 8,
    title: 'Overlapping Partner CIDR Routing Conflict in Financial Switch',
    severity: 'SEV-1 CRITICAL',
    category: 'Cloud WAN & Security',
    background: 'Aplikasi transaksi fintech di AWS perlu terhubung ke switching network nasional (Arthajasa / BI-FAST). Namun pihak Bank/Switching menggunakan alokasi IP 10.0.0.0/16 yang sama persis dengan CIDR Primary VPC AWS. Akibatnya route tidak dapat diinjeksi ke TGW.',
    logs: `// AWS TGW Route Table Error
$ aws ec2 create-transit-gateway-route --destination-cidr-block 10.0.0.0/16 ...
An error occurred (RouteAlreadyExists): The route 10.0.0.0/16 already exists in the Transit Gateway Route Table (Attached to Spoke-Core-VPC).`,
    question: 'Bagaimana solusi arsitektur terbaik tanpa mengharuskan salah satu pihak melakukan re-IPing skala besar pada ribuan server mereka?',
    cliCommands: {
      'aws ec2 describe-transit-gateway-route-tables': '{\n  "TransitGatewayRouteTables": [{\n    "TransitGatewayRouteTableId": "tgw-rtb-01",\n    "Routes": [{ "DestinationCidrBlock": "10.0.0.0/16", "State": "active", "Type": "propagated" }]\n  }]\n}'
    },
    options: [
      {
        text: 'Terapkan AWS Private NAT Gateway dengan alokasi Carrier-Grade NAT (RFC 6598 100.64.0.0/10) atau assigned non-overlapping partner pool, lalu lakukan 1:1 bi-directional SNAT/DNAT translation.',
        isCorrect: true,
        explanation: 'BENAR! Private NAT Gateway yang dikombinasikan dengan alokasi CGNAT (RFC 6598) memungkinkan translasi alamat IP privat tanpa mengekspos IP internal atau mengubah arsitektur IP masing-masing pihak (Zero Re-IPing).'
      },
      {
        text: 'Ubah Subnet Mask VPC AWS menjadi /8 agar bisa mencakup semua IP.',
        isCorrect: false,
        explanation: 'SALAH. /8 justru semakin memperluas overlap dan tidak menyelesaikan konflik rute.'
      },
      {
        text: 'Gunakan Public Elastic IP untuk setiap instance database.',
        isCorrect: false,
        explanation: 'SALAH. Melanggar kepatuhan PCI-DSS dan regulasi Bank Indonesia untuk sistem perbankan tertutup.'
      }
    ]
  },
  {
    id: 9,
    title: 'PrivateLink Cross-Account DNS Resolution Failure',
    severity: 'SEV-2 HIGH',
    category: 'DNS & PrivateLink',
    background: 'Tim Core Services di AWS Account A membuat VPC Endpoint Service (PrivateLink) dan membagikannya ke Account B. Namun instance di Account B tidak dapat me-resolve nama private DNS default dari service tersebut.',
    logs: `// Client DNS Lookup in Account B
$ nslookup payment.service.internal
Server: 10.200.0.2
** server can't find payment.service.internal: NXDOMAIN`,
    question: 'Langkah apa yang terlewat dalam setup cross-account PrivateLink Private DNS?',
    cliCommands: {
      'nslookup payment.service.internal': 'Server:\t\t10.200.0.2\nAddress:\t10.200.0.2#53\n\n** server can\'t find payment.service.internal: NXDOMAIN'
    },
    options: [
      {
        text: 'Fitur "Enable Private DNS" pada cross-account Interface Endpoint memerlukan verifikasi Domain Ownership atau asosiasi Private Hosted Zone yang diotorisasi via "aws route53 create-vpc-association-authorization" dari Account A ke VPC Account B.',
        isCorrect: true,
        explanation: 'BENAR! Secara default, Private DNS cross-account tidak aktif otomatis sebelum ada otorisasi asosiasi Route 53 Private Hosted Zone antar-account untuk mengizinkan Account B me-resolve nama host privat tersebut.'
      },
      {
        text: 'Instance di Account B harus di-restart agar cache DNS terhapus.',
        isCorrect: false,
        explanation: 'SALAH. Masalah ada di layer konfigurasi asosiasi Route 53 IAM cross-account, bukan cache OS.'
      },
      {
        text: 'PrivateLink hanya mendukung konektivitas dalam 1 AWS Account yang sama.',
        isCorrect: false,
        explanation: 'SALAH. PrivateLink justru dirancang sebagai fondasi utama cross-account & third-party SaaS interconnect di AWS.'
      }
    ]
  },
  {
    id: 10,
    title: 'Cloud WAN Segment Routing Leak & Core Network Policy Crash',
    severity: 'SEV-1 CRITICAL',
    category: 'Cloud WAN & Security',
    background: 'Setelah mengunggah versi baru Core Network Policy JSON di AWS Network Manager, segmen Development tiba-tiba dapat mengakses database di segmen Production secara langsung tanpa melalui firewall, melanggar standar kepatuhan Zero Trust.',
    logs: `// Core Network Policy Diff View
- "segment-actions": [ { "action": "send-via", "segment": "production", "via": "firewall-group" } ]
+ "segment-actions": [ { "action": "share", "segment": "production", "share-with": ["*"] } ] // CATASTROPHIC LEAK!`,
    question: 'Bagaimana mekanisme governance dan CI/CD guardrail yang benar untuk mencegah insiden policy leak pada AWS Cloud WAN?',
    cliCommands: {
      'aws networkmanager get-core-network-policy --core-network-id core-network-01': '{\n  "CoreNetworkPolicy": {\n    "PolicyVersionId": 3,\n    "PolicyDocument": "{\\"segments\\": [{\\"name\\": \\"development\\"}, {\\"name\\": \\"production\\"}]}"\n  }\n}'
    },
    options: [
      {
        text: 'Menggunakan fitur Change Set & Policy Staging di AWS Cloud WAN, menerapkan CI/CD policy linting dengan OPA (Open Policy Agent) / Conftest untuk memvalidasi segment isolation rules sebelum deployment, dan mewajibkan multi-party approval.',
        isCorrect: true,
        explanation: 'BENAR! Core Network Policy dokumen mengontrol routing seluruh dunia. Menguji policy di Staging environment dengan automated static analysis (OPA/Conftest) dan review change-set adalah standar operasional wajib bagi Senior Network Engineer.'
      },
      {
        text: 'Menghapus AWS Cloud WAN dan beralih kembali ke manual VPC Peering.',
        isCorrect: false,
        explanation: 'SALAH. Peering manual antar ratusan VPC menciptakan kompleksitas $N(N-1)/2$ yang jauh lebih rentan terhadap human error.'
      },
      {
        text: 'Mengubah ASN Cloud WAN menjadi public ASN.',
        isCorrect: false,
        explanation: 'SALAH. ASN tidak mempengaruhi evaluasi segment action share/send-to di dalam Cloud WAN.'
      }
    ]
  },
  {
    id: 11,
    title: 'Direct Connect BFD Sub-second Timers & Asymmetric Interval Mismatch',
    severity: 'SEV-1 CRITICAL',
    category: 'Direct Connect & BGP',
    background: 'Setelah mengaktifkan Bidirectional Forwarding Detection (BFD) pada Direct Connect Virtual Interface (VIF) untuk mempercepat failover, session BGP justru mengalami flap terus-menerus setiap 900ms.',
    logs: `// Cisco Router BFD Diagnostics
# show bfd neighbors details
Neighbor: 169.254.240.1, Interface: TenGigE0/0/0.100
State: Down, Down count: 142 (Flapping)
Local Min Tx: 100ms, Local Min Rx: 100ms, Multiplier: 3 (Hold time: 300ms)
Remote Min Tx: 300ms, Remote Min Rx: 300ms, Multiplier: 3 (AWS Minimum Interval)
Diagnostic: Echo Function Failed / Packet Timeout`,
    question: 'Mengapa session BFD mengalami flapping konstan dan berapa interval minimum yang didukung AWS Direct Connect?',
    cliCommands: {
      'show bfd neighbors': 'IPv4 Neighbors Table\nIP Address           Interface      Holddown(ms) State\n169.254.240.1        Te0/0/0.100    0            Down (Timer Neg Fail)'
    },
    options: [
      {
        text: 'AWS Direct Connect BFD memiliki batas minimum transmit interval 300ms dan multiplier 3 (detection time 900ms). Jika router on-premise dikonfigurasi terlalu agresif (misal 100ms/300ms hold time), router on-premise menyatakan down sebelum AWS sempat merespons. Solusi: Set interval router on-premise menjadi Min Tx 300ms, Min Rx 300ms, Multiplier 3.',
        isCorrect: true,
        explanation: 'BENAR! AWS Direct Connect Virtual Interfaces mendukung BFD dengan minimum interval 300ms dan multiplier 3. Mengatur timer lebih rendah di sisi router customer akan memicu false-positive failure karena hardware BFD offload AWS bekerja pada batas 300ms.'
      },
      {
        text: 'AWS Direct Connect tidak mendukung protokol BFD sama sekali.',
        isCorrect: false,
        explanation: 'SALAH. AWS Direct Connect mendukung BFD untuk Private, Public, dan Transit VIFs.'
      },
      {
        text: 'BFD harus menggunakan port TCP 179.',
        isCorrect: false,
        explanation: 'SALAH. BFD adalah protokol layer L4 berbasis UDP (port 3784 single-hop / 4784 multi-hop), sedangkan TCP 179 adalah BGP.'
      }
    ]
  },
  {
    id: 12,
    title: 'AWS Network Firewall TLS Inspection SNI Domain Dropped under HTTP/2 Multiplexing',
    severity: 'SEV-1 CRITICAL',
    category: 'Inspection & GWLB',
    background: 'Setelah mengaktifkan TLS/SSL Inspection pada AWS Network Firewall, request microservice keluar menuju domain partner perbankan yang menggunakan HTTP/2 mengalami drop total secara intermiten.',
    logs: `// AWS Network Firewall Flow & TLS Alert Logs
{
  "event_type": "tls",
  "src_ip": "10.10.2.14",
  "dest_ip": "198.51.100.88",
  "tls": {
    "sni": "api.partner-bank.com",
    "version": "TLSv1.3",
    "action": "DROP",
    "reason": "Revocation check timeout / Missing Intermediate CA Certificate in Trust Store"
  }
}`,
    question: 'Apa penyebab AWS Network Firewall TLS Decryption me-reject session TLS 1.3 dan bagaimana solusinya?',
    cliCommands: {
      'curl -Iv --tlsv1.3 https://api.partner-bank.com': '* TLSv1.3 (OUT), TLS handshake, Client hello (1):\n* LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to api.partner-bank.com:443'
    },
    options: [
      {
        text: 'Trust Store pada TLS Inspection Configuration di AWS Network Firewall belum memuat Intermediate CA penerbit sertifikat partner, atau OCSP/CRL revocation check gagal karena Network Firewall tidak memiliki route outbound untuk memverifikasi OCSP responder.',
        isCorrect: true,
        explanation: 'BENAR! Saat TLS Inspection diaktifkan, AWS Network Firewall bertindak sebagai forward-proxy yang memvalidasi rantai sertifikat server upstream secara lengkap. Jika Intermediate CA hilang dari Trust Store atau OCSP query di-drop oleh routing lokal, koneksi TLS di-drop sebagai langkah mitigasi security.'
      },
      {
        text: 'AWS Network Firewall tidak mendukung enkripsi TLS 1.3.',
        isCorrect: false,
        explanation: 'SALAH. AWS Network Firewall mendukung TLS 1.3 forward inspection.'
      },
      {
        text: 'Security Group pada Network Firewall memblokir HTTP/2.',
        isCorrect: false,
        explanation: 'SALAH. HTTP/2 berjalan di atas layer TCP/TLS port 443 yang sama dan dievaluasi di level L7 engine Suricata.'
      }
    ]
  },
  {
    id: 13,
    title: 'GWLB Cross-Zone Flow Asymmetry with Stateful Firewall SNAT Bypass Trap',
    severity: 'SEV-2 HIGH',
    category: 'Inspection & GWLB',
    background: 'Untuk menghemat biaya NAT Gateway, tim arsitek menonaktifkan Cross-Zone Load Balancing pada GWLB. Namun, setelah perubahan tersebut, traffic antar AZ yang melewati Firewall mengalami asymmetric routing loop.',
    logs: `// VPC Flow Logs (AZ-1 GWLB Endpoint vs AZ-2 Target)
AZ-1: eni-gwlbe-az1 [SYN] -> Forwarded to Firewall in AZ-2 (Cross-AZ Target)
AZ-2: Firewall returns [SYN-ACK] -> Returned directly to Spoke AZ-2 Subnet (Bypassing AZ-1 GWLB Endpoint!)`,
    question: 'Bagaimana keterkaitan antara GWLB Cross-Zone Support dengan Transit Gateway Appliance Mode dalam mencegah asimetri?',
    cliCommands: {
      'aws elbv2 describe-load-balancer-attributes --load-balancer-arn arn:aws:elasticloadbalancing:...': '{\n  "Attributes": [\n    { "Key": "load_balancing.cross_zone.enabled", "Value": "false" }\n  ]\n}'
    },
    options: [
      {
        text: 'GWLB Endpoint beroperasi secara Zonal. Jika Cross-Zone pada GWLB dimatikan tetapi TGW Appliance Mode aktif, traffic dapat masuk via AZ-1 GWLBe dan return via AZ-2 tanpa session state simetris. Solusi: Pertahankan Cross-Zone GWLB aktif dan pastikan arsitektur inspeksi menggunakan TGW Appliance Mode simetris.',
        isCorrect: true,
        explanation: 'BENAR! Gateway Load Balancer Endpoint (GWLBe) meneruskan flow ke target pool. Menjaga cross-zone settings selaras dengan TGW Appliance Mode adalah syarat mutlak agar forward flow dan reverse flow melintasi ENI zonal yang simetris.'
      },
      {
        text: 'GWLB tidak dapat beroperasi jika ada lebih dari 1 Availability Zone.',
        isCorrect: false,
        explanation: 'SALAH. GWLB dirancang khusus untuk high-availability multi-AZ deployment.'
      },
      {
        text: 'Firewall harus selalu melakukan Full SNAT pada seluruh traffic private.',
        isCorrect: false,
        explanation: 'SALAH. SNAT pada private-to-private traffic merusak visibilitas source IP client untuk logging dan compliance PCI-DSS.'
      }
    ]
  },
  {
    id: 14,
    title: 'AWS Global Accelerator Anycast Hash Polarization on Long-Lived WebSocket Streams',
    severity: 'SEV-2 HIGH',
    category: 'Cloud WAN & Security',
    background: 'Aplikasi realtime financial trading menggunakan AWS Global Accelerator di depan ALB. Selama market open, 80% dari total 100.000 koneksi WebSocket menumpuk di 1 EC2 instance di AZ-1, sementara EC2 di AZ-2 hampir idle (0% CPU).',
    logs: `// ALB Target Group Metric:
Target-AZ1-01: 82,410 Active WebSocket Connections (Memory: 98%, CPU: 95%)
Target-AZ2-01: 3,120 Active WebSocket Connections (Memory: 12%, CPU: 8%)
// Client source IP analysis:
90% client terhubung melalui corporate proxy tunggal dengan Source IP 198.51.100.10`,
    question: 'Mengapa load balancing mengalami polarisasi ekstrim dan apa konfigurasi mitigasinya?',
    cliCommands: {
      'aws globalaccelerator describe-accelerator-attributes --accelerator-arn arn:aws:...': '{\n  "AcceleratorAttributes": {\n    "FlowLogsEnabled": true\n  }\n}'
    },
    options: [
      {
        text: 'Global Accelerator dan ALB menggunakan 5-tuple hash (Source IP, Source Port, Dest IP, Dest Port, Protocol) atau Source IP affinity. Ketika puluhan ribu koneksi berasal dari single corporate proxy/NAT, hash terpolarasi ke target yang sama. Solusi: Nonaktifkan Sticky Sessions pada ALB Target Group, gunakan Least Outstanding Requests routing algorithm pada ALB, dan implementasikan graceful connection rebalancing.',
        isCorrect: true,
        explanation: 'BENAR! Polarisasi hash terjadi ketika jutaan koneksi memiliki source IP yang sama (akibat client proxy/NAT besar). Beralih ke algoritma "Least Outstanding Requests" pada Application Load Balancer secara otomatis mendistribusikan request baru ke instance dengan active load terendah.'
      },
      {
        text: 'Global Accelerator hanya mendukung 1 backend instance per Region.',
        isCorrect: false,
        explanation: 'SALAH. Global Accelerator dapat me-route traffic ke beberapa Regional Endpoint groups dengan banyak ALB/NLB.'
      },
      {
        text: 'WebSocket tidak didukung melalui AWS Global Accelerator.',
        isCorrect: false,
        explanation: 'SALAH. AWS Global Accelerator mendukung protokol TCP/UDP penuh termasuk WebSocket handshake.'
      }
    ]
  },
  {
    id: 15,
    title: 'Inter-Region VPC Peering Jumbo Frame MTU Drop & PMTUD Failure',
    severity: 'SEV-1 CRITICAL',
    category: 'Direct Connect & BGP',
    background: 'Database replication antar AWS Region (ap-southeast-3 Jakarta ke ap-southeast-1 Singapore) via Inter-Region VPC Peering mengalami replication lag parah dan koneksi TLS terputus setiap beberapa menit.',
    logs: `// Linux Replication Diagnostic Probe
$ ping -M do -s 8972 10.200.1.50 (Singapore DB)
PING 10.200.1.50: 8972 data bytes.
From 10.100.1.1: icmp_seq=1 Frag needed and DF set (mtu = 1500)
// MySQL Replication Error Log:
[ERROR] Slave I/O for channel '': Read error packet from server: Lost connection to MySQL server during query (errno 2013)`,
    question: 'Berapa batas Maximum Transmission Unit (MTU) pada AWS Inter-Region VPC Peering dan bagaimana mengatasinya?',
    cliCommands: {
      'ping -M do -s 8972 10.200.1.50': 'From 10.100.1.1: icmp_seq=1 Frag needed and DF set (mtu = 1500)',
      'ip route get 10.200.1.50': '10.200.1.50 dev ens5 src 10.100.1.25 metric 100 mtu 1500'
    },
    options: [
      {
        text: 'Inter-Region VPC Peering memiliki batas hard MTU 1500 bytes (Jumbo Frames MTU 9001 HANYA didukung pada Intra-Region VPC Peering). Jika instance EC2 mengirim paket dengan ukuran 9001 bytes dan Path MTU Discovery (PMTUD) terhalang, packet besar di-drop. Solusi: Turunkan MTU interface route pada OS instance menjadi 1500 bytes khusus untuk CIDR destination region lain (misal via "ip route add 10.200.0.0/16 dev ens5 mtu 1500") atau gunakan AWS Transit Gateway / Cloud WAN yang mendukung MTU 8500.',
        isCorrect: true,
        explanation: 'BENAR! Inter-Region VPC Peering melintasi backbone global AWS dengan batas MTU 1500 bytes. Mengonfigurasi MTU 1500 pada route OS EC2 secara khusus untuk remote region mencegah terjadinya PMTUD black hole tanpa mengorbankan performa Jumbo Frame 9001 di dalam local VPC.'
      },
      {
        text: 'Inter-Region VPC Peering memerlukan lisensi Direct Connect.',
        isCorrect: false,
        explanation: 'SALAH. Inter-Region VPC Peering adalah fitur native VPC di atas backbone AWS tanpa memerlukan Direct Connect.'
      },
      {
        text: 'MySQL replication tidak dapat berjalan di atas VPC Peering.',
        isCorrect: false,
        explanation: 'SALAH. MySQL replication bekerja transparan di atas layer L3/L4 TCP.'
      }
    ]
  }
]

const selectedCategory = ref('All')
const categories = ['All', 'Inspection & GWLB', 'Direct Connect & BGP', 'Egress & NAT', 'DNS & PrivateLink', 'Cloud WAN & Security']

const filteredIncidents = computed(() => {
  if (selectedCategory.value === 'All') return incidents
  return incidents.filter(inc => inc.category === selectedCategory.value)
})

const activeIndex = ref(0)
const selectedAnswers = ref<Record<number, number>>({})
const showResults = ref<Record<number, boolean>>({})
const cliInput = ref('')
const cliOutput = ref('')

const currentIncident = computed(() => filteredIncidents.value[activeIndex.value] || incidents[0])

const totalCorrect = computed(() => {
  return Object.keys(selectedAnswers.value).reduce((acc, key) => {
    const incId = Number(key)
    const inc = incidents.find(i => i.id === incId)
    if (inc && inc.options[selectedAnswers.value[incId]]?.isCorrect) {
      return acc + 1
    }
    return acc
  }, 0)
})

function selectOption(incidentId: number, optionIdx: number) {
  selectedAnswers.value[incidentId] = optionIdx
  showResults.value[incidentId] = true
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('sme_drill_answers', JSON.stringify(selectedAnswers.value))
  }
}

function runCli(cmd: string) {
  cliInput.value = cmd
  const match = currentIncident.value.cliCommands?.[cmd]
  if (match) {
    cliOutput.value = match
  } else {
    // Generate intelligent simulated response
    if (cmd.startsWith('ping')) {
      cliOutput.value = `PING executed to target host:\n64 bytes from target: icmp_seq=1 ttl=63 time=1.42 ms\n--- ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss`
    } else if (cmd.startsWith('traceroute')) {
      cliOutput.value = `traceroute to destination, 30 hops max\n 1  10.10.1.1 (VPC Gateway)  0.35 ms\n 2  tgw-attachment (AWS Backbone)  0.92 ms\n 3  target-node  1.85 ms`
    } else {
      cliOutput.value = `Command executed: ${cmd}\nExit Code: 0 (Simulated CLI telemetry capture)`
    }
  }
}

function submitCliInput() {
  if (cliInput.value.trim()) {
    runCli(cliInput.value.trim())
  }
}

function nextIncident() {
  if (activeIndex.value < filteredIncidents.value.length - 1) {
    activeIndex.value++
    cliOutput.value = ''
  }
}

function prevIncident() {
  if (activeIndex.value > 0) {
    activeIndex.value--
    cliOutput.value = ''
  }
}

function jumpToIncident(idx: number) {
  activeIndex.value = idx
  cliOutput.value = ''
}

onMounted(() => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('sme_drill_answers')
    if (saved) {
      try {
        selectedAnswers.value = JSON.parse(saved)
        Object.keys(selectedAnswers.value).forEach(k => {
          showResults.value[Number(k)] = true
        })
      } catch (e) {}
    }
  }
})
</script>

<template>
  <div class="interactive-card">
    <!-- Header -->
    <div class="interactive-card-header">
      <div class="interactive-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>SME Troubleshooting War Rooms: 15 Real-World Incident Drills</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge-sme">SME War Room</span>
        <span :class="currentIncident.severity.includes('SEV-1') ? 'badge-rfc !bg-rose-500/10 !text-rose-400 !border-rose-500/30' : 'badge-aws'">
          {{ currentIncident.severity }}
        </span>
      </div>
    </div>

    <p class="interactive-desc">
      Uji intuisi investigasi root-cause SEV-1 network outage produksi menggunakan log telemetri, inspeksi CLI interaktif, dan validasi mitigasi arsitektur.
    </p>

    <!-- Score & Progress Bar -->
    <div class="mb-4 flex items-center justify-between bg-[var(--vp-c-bg-alt)] p-3 rounded-xl border border-[var(--vp-c-divider)]">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)]">Progress & Score:</span>
        <span class="text-xs font-mono font-bold text-emerald-400">
          {{ totalCorrect }} / {{ incidents.length }} Solved
        </span>
      </div>
      <div class="w-36 bg-[var(--vp-c-bg)] h-2 rounded-full overflow-hidden border border-[var(--vp-c-divider)]">
        <div class="bg-emerald-500 h-full transition-all duration-300" :style="{ width: `${(totalCorrect / incidents.length) * 100}%` }"></div>
      </div>
    </div>

    <!-- Category Filter Tabs -->
    <div class="mb-4 flex flex-wrap gap-1.5">
      <button
        v-for="cat in categories"
        :key="cat"
        class="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
        :class="selectedCategory === cat ? 'bg-blue-600 text-white font-bold' : 'bg-[var(--vp-c-bg-alt)] text-[var(--vp-c-text-2)] hover:bg-[var(--vp-c-divider)] border border-[var(--vp-c-divider)]'"
        @click="selectedCategory = cat; activeIndex = 0"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Quick Case Grid Selector -->
    <div class="mb-4 flex flex-wrap gap-1.5 bg-[var(--vp-c-bg-alt)] p-2.5 rounded-xl border border-[var(--vp-c-divider)]">
      <button
        v-for="(inc, idx) in filteredIncidents"
        :key="inc.id"
        :class="[
          'px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all',
          activeIndex === idx
            ? 'bg-blue-600 text-white shadow-sm'
            : showResults[inc.id] && selectedAnswers[inc.id] !== undefined
            ? inc.options[selectedAnswers[inc.id]].isCorrect
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            : 'bg-[var(--vp-c-bg)] text-[var(--vp-c-text-2)] hover:bg-[var(--vp-c-divider)] border border-[var(--vp-c-divider)]'
        ]"
        @click="jumpToIncident(idx)"
      >
        Case {{ inc.id }}
      </button>
    </div>

    <!-- Navigation Header -->
    <div class="flex items-center justify-between bg-[var(--vp-c-bg-alt)] p-3 rounded-xl border border-[var(--vp-c-divider)] mb-4">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-[var(--vp-c-text-1)]">
          Case {{ currentIncident.id }} of {{ incidents.length }}:
        </span>
        <span class="text-xs font-semibold text-blue-400 truncate max-w-md">{{ currentIncident.title }}</span>
      </div>
      <div class="flex gap-2">
        <button
          :disabled="activeIndex === 0"
          class="ui-button ui-button-secondary !py-1 !px-2.5 text-xs disabled:opacity-30"
          @click="prevIncident"
        >
          ◀ Prev
        </button>
        <button
          :disabled="activeIndex === filteredIncidents.length - 1"
          class="ui-button !py-1 !px-2.5 text-xs disabled:opacity-30"
          @click="nextIncident"
        >
          Next ▶
        </button>
      </div>
    </div>

    <!-- Incident Background -->
    <div class="mb-4">
      <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-3)] mb-1.5">Incident Scenario</h4>
      <p class="text-xs text-[var(--vp-c-text-1)] leading-relaxed bg-[var(--vp-c-bg-alt)] p-3.5 rounded-xl border border-[var(--vp-c-divider)]">
        {{ currentIncident.background }}
      </p>
    </div>

    <!-- Telemetry & Raw Logs Terminal -->
    <div class="terminal-window mb-4">
      <div class="terminal-header">
        <div class="terminal-dots">
          <div class="terminal-dot dot-red"></div>
          <div class="terminal-dot dot-yellow"></div>
          <div class="terminal-dot dot-green"></div>
        </div>
        <span class="terminal-title">Incident Telemetry & Packet Captures</span>
      </div>
      <div class="terminal-body font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
{{ currentIncident.logs }}
      </div>
    </div>

    <!-- Live Interactive CLI Console -->
    <div class="mb-4 bg-[var(--vp-c-bg-alt)] p-3.5 rounded-xl border border-[var(--vp-c-divider)]">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] flex items-center gap-1.5">
          <svg width="14" height="14" class="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          Interactive Diagnostic CLI Probe (Click or type custom command)
        </span>
        <span class="text-[11px] text-[var(--vp-c-text-3)] font-mono">Simulated Device Shell</span>
      </div>

      <!-- Quick Suggested Commands -->
      <div v-if="currentIncident.cliCommands" class="flex flex-wrap gap-1.5 mb-2.5">
        <button
          v-for="(_, cmd) in currentIncident.cliCommands"
          :key="cmd"
          class="px-2 py-1 text-xs font-mono rounded bg-[var(--vp-c-bg)] border border-[var(--vp-c-divider)] hover:border-blue-400 text-blue-400 transition-all text-left"
          @click="runCli(cmd)"
        >
          $ {{ cmd }}
        </button>
      </div>

      <!-- Custom CLI Input Prompt -->
      <div class="flex items-center gap-2 mb-2.5">
        <span class="font-mono text-xs text-emerald-400 font-bold">$</span>
        <input
          v-model="cliInput"
          type="text"
          placeholder="Type diagnostic command (e.g. ping, traceroute, aws ec2...)"
          class="ui-input !py-1 text-xs font-mono flex-1"
          @keyup.enter="submitCliInput"
        />
        <button class="ui-button ui-button-sm !py-1 !px-3" @click="submitCliInput">
          Execute
        </button>
      </div>

      <!-- CLI Output -->
      <div v-if="cliOutput" class="p-3 bg-[#0d1117] text-[#c9d1d9] font-mono text-xs rounded-lg border border-[#30363d] overflow-x-auto whitespace-pre-wrap">
{{ cliOutput }}
      </div>
    </div>

    <!-- Diagnostic Question -->
    <div class="mb-4">
      <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
        <svg width="16" height="16" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Senior SME Diagnosis Question:
      </h4>
      <p class="text-sm font-bold text-[var(--vp-c-text-1)] mb-3">
        {{ currentIncident.question }}
      </p>

      <!-- Options -->
      <div class="space-y-2.5">
        <div
          v-for="(opt, idx) in currentIncident.options"
          :key="idx"
          :class="[
            'p-3.5 rounded-xl border cursor-pointer text-xs transition-all',
            selectedAnswers[currentIncident.id] === idx
              ? opt.isCorrect
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                : 'bg-rose-500/10 border-rose-500 text-rose-400 font-semibold'
              : 'bg-[var(--vp-c-bg-alt)] border-[var(--vp-c-divider)] hover:border-blue-400 text-[var(--vp-c-text-2)]'
          ]"
          @click="selectOption(currentIncident.id, idx)"
        >
          <div class="flex items-start gap-2.5">
            <span class="font-bold font-mono px-1.5 py-0.5 rounded bg-[var(--vp-c-bg)] border border-[var(--vp-c-divider)]">{{ String.fromCharCode(65 + idx) }}</span>
            <span class="leading-relaxed">{{ opt.text }}</span>
          </div>

          <!-- Explanation if clicked -->
          <div
            v-if="showResults[currentIncident.id] && selectedAnswers[currentIncident.id] === idx"
            class="mt-2.5 pt-2.5 border-t border-current/20 text-[11px] leading-relaxed"
          >
            {{ opt.explanation }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-body {
  max-height: 380px;
  overflow-y: auto;
}
</style>


