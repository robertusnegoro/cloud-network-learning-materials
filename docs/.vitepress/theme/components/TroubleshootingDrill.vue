<script setup lang="ts">
import { ref, computed } from 'vue'

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
    category: 'Direct Connect & MTU',
    background: 'Aplikasi microservice di AWS dapat melakukan ping dan koneksi SSH/HTTP payload kecil ke database on-premise melalui Direct Connect, tetapi ketika melakukan query SELECT data besar atau file transfer, koneksi langsung hang tanpa error eksplisit.',
    logs: `// Linux Client Traceroute & ICMP Probe
$ ping -M do -s 1472 192.168.10.100  --> SUCCESS (1500 bytes wire)
$ ping -M do -s 8972 192.168.10.100  --> Packet needs to be fragmented but DF set (ICMP Type 3, Code 4 dropped by on-prem ACL)
$ curl -k https://192.168.10.100/export.csv --> HANGS FOREVER (Window stuck)`,
    question: 'Mengapa file transfer besar hang sementara koneksi kecil berhasil?',
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
    category: 'Egress & NAT GW',
    background: 'Saat flash sale, ribuan container di EKS private subnet melakukan panggilan API keluar ke payment gateway eksternal (IP tunggal 203.0.113.50:443). Muncul error "Connection timed out" secara masif di microservice.',
    logs: `// CloudWatch Metric: AWS/NATGateway
ErrorPortAllocation: 45,210 occurrences/min
ActiveConnectionCount: 55,000 (Saturation reached for single destination IP:Port)`,
    question: 'Bagaimana solusi permanen level senior network engineer untuk mengatasi limit 55,000 concurrent connection ke single destination IP pada AWS NAT Gateway?',
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
    category: 'BGP & Direct Connect',
    background: 'Kabel fiber fisik Direct Connect mengalami degradasi sinyal transien (flapping 5x dalam 2 menit). Meskipun link fiber sudah stabil kembali, rute menuju AWS menghilang dari tabel routing core router on-premise selama 45 menit ke depan.',
    logs: `// Cisco Router BGP Flap Statistics
# show ip bgp flap-statistics 10.100.0.0/16
 BGP routing table entry for 10.100.0.0/16, version 892
 Paths: (1 available, best #1)
  64512
    169.254.240.1 from 169.254.240.1 (169.254.240.1)
    Flaps: 5, Penalty: 3200, Status: Dampened, Suppressed for 00:43:12`,
    question: 'Mengapa prefix AWS di-suppress dan apa langkah operasional terbaik untuk mencegah kejadian serupa di masa depan?',
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
    category: 'Hybrid Failover & BGP',
    background: 'Perusahaan memiliki Primary link Direct Connect dan Backup IPsec Site-to-Site VPN yang terhubung ke TGW. Saat link DX down, traffic failover ke VPN dengan lancar. Namun ketika link DX pulih (UP), terjadi packet drop 100% pada traffic outbound dari on-premise ke AWS.',
    logs: `// On-Premises Router BGP Table (Post-Recovery)
# show ip bgp 10.100.0.0/16
*> 169.254.240.1 (via DX)   Local-Pref: 200, AS-Path: 64512
*  169.254.242.1 (via VPN)  Local-Pref: 100, AS-Path: 64512 64512 64512

// AWS TGW Ingress Inspection
Traffic dari On-Prem masuk via DX (Sesuai Local-Pref 200).
Namun return traffic dari AWS ke On-Prem masih mengalir lewat VPN karena AWS TGW belum menerima BGP update propagation dari DXGW!`,
    question: 'Apa langkah konfigurasi BGP yang wajib diterapkan agar failback dari VPN ke Direct Connect berlangsung deterministik tanpa traffic loss?',
    options: [
      {
        text: 'Menggunakan BGP Community tags AWS (7224:9300 untuk Primary DX, 7224:9100 untuk Secondary VPN) yang dipasangkan dengan AS-Path Prepending simetris di kedua arah, serta mengonfigurasi BGP Graceful Restart & BFD.',
        isCorrect: true,
        explanation: 'BENAR! Sinyal Local Preference AWS harus dikontrol secara eksplisit menggunakan community tags 7224:9300 (Local-Pref 90) dan 7224:9100 (Local-Pref 70) agar AWS TGW dan On-Premises router mengubah status Best Path secara simetris dan sinkron.'
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
    category: 'DNS & Route 53',
    background: 'Setelah mengonfigurasi Route 53 Outbound Endpoint untuk me-forward query internal ke domain controller on-premise, CPU pada server DNS Active Directory on-premise melonjak ke 100% dan seluruh query DNS perusahaan mengalami timeout total.',
    logs: `// BIND / Active Directory DNS Server Query Log
2026/08/22 15:20:01 query: app.corp.internal IN A + (10.100.1.2)
2026/08/22 15:20:01 query: app.corp.internal IN A + (10.100.1.2)
[100,000 queries per second detected originating from Route 53 Outbound Endpoint ENI!]`,
    question: 'Apa penyebab terjadinya infinite loop pada DNS hybrid dan bagaimana solusinya?',
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
    category: 'TGW & Appliance Mode',
    background: 'Setelah mengaktifkan TGW Appliance Mode untuk meningkatkan performa firewall, tim developer melaporkan bahwa koneksi antar service di Spoke VPC justru mengalami error TCP connection reset yang lebih parah.',
    logs: `// AWS CLI Configuration Inspection
$ aws ec2 describe-transit-gateway-vpc-attachments
[
  { "AttachmentId": "tgw-attach-spoke1", "ApplianceModeSupport": "enable" }, // WRONG!
  { "AttachmentId": "tgw-attach-spoke2", "ApplianceModeSupport": "enable" }, // WRONG!
  { "AttachmentId": "tgw-attach-inspection", "ApplianceModeSupport": "disable" } // WRONG!
]`,
    question: 'Mengapa konfigurasi TGW Appliance Mode di atas salah fatal dan bagaimana perbaikannya?',
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
    category: 'Financial Interconnect',
    background: 'Aplikasi transaksi fintech di AWS perlu terhubung ke switching network nasional (Arthajasa / BI-FAST). Namun pihak Bank/Switching menggunakan alokasi IP 10.0.0.0/16 yang sama persis dengan CIDR Primary VPC AWS. Akibatnya route tidak dapat diinjeksi ke TGW.',
    logs: `// AWS TGW Route Table Error
$ aws ec2 create-transit-gateway-route --destination-cidr-block 10.0.0.0/16 ...
An error occurred (RouteAlreadyExists): The route 10.0.0.0/16 already exists in the Transit Gateway Route Table (Attached to Spoke-Core-VPC).`,
    question: 'Bagaimana solusi arsitektur terbaik tanpa mengharuskan salah satu pihak melakukan re-IPing skala besar pada ribuan server mereka?',
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
    category: 'PrivateLink & IAM',
    background: 'Tim Core Services di AWS Account A membuat VPC Endpoint Service (PrivateLink) dan membagikannya ke Account B. Namun instance di Account B tidak dapat me-resolve nama private DNS default dari service tersebut.',
    logs: `// Client DNS Lookup in Account B
$ nslookup payment.service.internal
Server: 10.200.0.2
** server can't find payment.service.internal: NXDOMAIN`,
    question: 'Langkah apa yang terlewat dalam setup cross-account PrivateLink Private DNS?',
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
    category: 'Cloud WAN & Policy',
    background: 'Setelah mengunggah versi baru Core Network Policy JSON di AWS Network Manager, segmen Development tiba-tiba dapat mengakses database di segmen Production secara langsung tanpa melalui firewall, melanggar standar kepatuhan Zero Trust.',
    logs: `// Core Network Policy Diff View
- "segment-actions": [ { "action": "send-via", "segment": "production", "via": "firewall-group" } ]
+ "segment-actions": [ { "action": "share", "segment": "production", "share-with": ["*"] } ] // CATASTROPHIC LEAK!`,
    question: 'Bagaimana mekanisme governance dan CI/CD guardrail yang benar untuk mencegah insiden policy leak pada AWS Cloud WAN?',
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
  }
]

const activeIndex = ref(0)
const selectedAnswers = ref<Record<number, number>>({})
const showResults = ref<Record<number, boolean>>({})

const currentIncident = computed(() => incidents[activeIndex.value])

function selectOption(incidentId: number, optionIdx: number) {
  selectedAnswers.value[incidentId] = optionIdx
  showResults.value[incidentId] = true
}

function nextIncident() {
  if (activeIndex.value < incidents.length - 1) {
    activeIndex.value++
  }
}

function prevIncident() {
  if (activeIndex.value > 0) {
    activeIndex.value--
  }
}

function jumpToIncident(idx: number) {
  activeIndex.value = idx
}
</script>

<template>
  <div class="interactive-card">
    <div class="interactive-card-header">
      <div class="interactive-title">
        <span>🚨</span>
        <span>SME Troubleshooting War Rooms: 10 Real-World Incident Drills</span>
      </div>
      <div class="flex gap-2">
        <span class="badge-sme">Senior SME Drill</span>
        <span :class="currentIncident.severity.includes('SEV-1') ? 'badge-warning' : 'badge-aws'">
          {{ currentIncident.severity }}
        </span>
      </div>
    </div>

    <!-- Quick Case Grid Selector -->
    <div class="mb-4 flex flex-wrap gap-1.5 bg-[var(--vp-c-bg-alt)] p-2 rounded-lg border border-[var(--vp-c-divider)]">
      <button
        v-for="(inc, idx) in incidents"
        :key="inc.id"
        :class="[
          'px-2.5 py-1 rounded text-xs font-mono font-bold transition-all',
          activeIndex === idx
            ? 'bg-blue-500 text-white shadow-sm'
            : showResults[inc.id] && selectedAnswers[inc.id] !== undefined
            ? inc.options[selectedAnswers[inc.id]].isCorrect
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            : 'bg-[var(--vp-c-bg-mute)] text-[var(--vp-c-text-2)] hover:bg-[var(--vp-c-divider)]'
        ]"
        @click="jumpToIncident(idx)"
      >
        Case {{ idx + 1 }}
      </button>
    </div>

    <!-- Navigation Header -->
    <div class="flex items-center justify-between bg-[var(--vp-c-bg-alt)] p-3 rounded-lg border border-[var(--vp-c-divider)] mb-4">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-[var(--vp-c-text-1)]">
          Case {{ activeIndex + 1 }} of {{ incidents.length }}:
        </span>
        <span class="text-xs font-semibold text-blue-400 truncate max-w-md">{{ currentIncident.title }}</span>
      </div>
      <div class="flex gap-2">
        <button
          :disabled="activeIndex === 0"
          class="ui-button ui-button-secondary !py-1 !px-2.5 text-xs disabled:opacity-30"
          @click="prevIncident"
        >
          ◀ Prev Case
        </button>
        <button
          :disabled="activeIndex === incidents.length - 1"
          class="ui-button !py-1 !px-2.5 text-xs disabled:opacity-30"
          @click="nextIncident"
        >
          Next Case ▶
        </button>
      </div>
    </div>

    <!-- Incident Background -->
    <div class="mb-4">
      <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-3)] mb-1">Incident Scenario</h4>
      <p class="text-xs text-[var(--vp-c-text-1)] leading-relaxed bg-[var(--vp-c-bg-alt)] p-3 rounded-lg border border-[var(--vp-c-divider)]">
        {{ currentIncident.background }}
      </p>
    </div>

    <!-- Telemetry & Raw Logs -->
    <div class="terminal-window mb-4">
      <div class="terminal-header">
        <div class="flex gap-1.5">
          <div class="terminal-dot dot-red"></div>
          <div class="terminal-dot dot-yellow"></div>
          <div class="terminal-dot dot-green"></div>
        </div>
        <span class="text-xs text-gray-400 font-mono">Incident Telemetry & Packet Dissections</span>
      </div>
      <div class="terminal-body font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
{{ currentIncident.logs }}
      </div>
    </div>

    <!-- Diagnostic Question -->
    <div class="mb-4">
      <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
        🎯 Senior SME Diagnosis Question:
      </h4>
      <p class="text-sm font-bold text-[var(--vp-c-text-1)] mb-3">
        {{ currentIncident.question }}
      </p>

      <!-- Options -->
      <div class="space-y-2">
        <div
          v-for="(opt, idx) in currentIncident.options"
          :key="idx"
          :class="[
            'p-3 rounded-lg border cursor-pointer text-xs transition-all',
            selectedAnswers[currentIncident.id] === idx
              ? opt.isCorrect
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                : 'bg-rose-500/10 border-rose-500 text-rose-400 font-semibold'
              : 'bg-[var(--vp-c-bg-alt)] border-[var(--vp-c-divider)] hover:border-blue-400 text-[var(--vp-c-text-2)]'
          ]"
          @click="selectOption(currentIncident.id, idx)"
        >
          <div class="flex items-start gap-2">
            <span class="font-bold font-mono">{{ String.fromCharCode(65 + idx) }}.</span>
            <span>{{ opt.text }}</span>
          </div>

          <!-- Explanation if clicked -->
          <div
            v-if="showResults[currentIncident.id] && selectedAnswers[currentIncident.id] === idx"
            class="mt-2 pt-2 border-t border-current/20 text-[11px] leading-relaxed"
          >
            {{ opt.explanation }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
