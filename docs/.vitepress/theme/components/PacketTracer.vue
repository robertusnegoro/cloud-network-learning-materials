<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

interface Hop {
  nodeName: string
  nodeType: 'EC2' | 'ENI' | 'HYPERPLANE' | 'TGW' | 'GWLB' | 'FIREWALL' | 'DXGW' | 'ONPREM' | 'CLOUD_WAN' | 'PRIVATE_NAT'
  title: string
  action: string
  l2: string
  l3Src: string
  l3Dst: string
  l4: string
  overlay?: string
  mtu: number
  ttl: number
  deepExplanation: string
}

interface Scenario {
  id: string
  title: string
  description: string
  hops: Hop[]
}

const scenarios: Scenario[] = [
  {
    id: 'hybrid-gwlb-dx',
    title: '1. Spoke VPC to On-Prem via TGW, GWLB (GENEVE) & Direct Connect',
    description: 'Traverse dari EC2 di Spoke VPC, melewati inspeksi firewall terpusat via Gateway Load Balancer, lalu di-forward ke on-premises data center melalui Direct Connect Transit VIF.',
    hops: [
      {
        nodeName: 'EC2 App Host (10.10.1.50)',
        nodeType: 'EC2',
        title: 'Step 1: Inisiasi Paket di Kernel OS EC2',
        action: 'Aplikasi mengirim TCP SYN request ke on-prem database (192.168.10.100:3306). Kernel Linux melakukan route table lookup di OS.',
        l2: 'Src: 06:12:34:56:78:9a (EC2 ENI MAC) ➔ Dst: 12:34:56:78:9a:bc (AWS VPC Gateway MAC)',
        l3Src: '10.10.1.50',
        l3Dst: '192.168.10.100',
        l4: 'TCP SYN [Seq=0, Port 49152 ➔ 3306]',
        mtu: 9001,
        ttl: 64,
        deepExplanation: 'EC2 kernel menyusun packet dengan Jumbo Frame MTU 9001. Gateway ARP di-resolve ke virtual router MAC address yang disediakan oleh Nitro System.'
      },
      {
        nodeName: 'VPC ENI & Nitro Controller',
        nodeType: 'ENI',
        title: 'Step 2: Nitro ASIC Packet Ingestion & Security Group Evaluation',
        action: 'Nitro card membaca Security Group state table (stateful connection tracking) dan mengarahkan paket ke AWS Hyperplane flow table.',
        l2: 'Nitro Internal Virtual Tagging',
        l3Src: '10.10.1.50',
        l3Dst: '192.168.10.100',
        l4: 'TCP SYN [Port 49152 ➔ 3306]',
        mtu: 9001,
        ttl: 64,
        deepExplanation: 'Nitro offloads packet processing tanpa membebani vCPU instance. Security Group dievaluasi secara stateless/stateful di level hardware ASIC.'
      },
      {
        nodeName: 'AWS Transit Gateway (TGW Attachment)',
        nodeType: 'TGW',
        title: 'Step 3: TGW Route Table Lookup & Appliance Mode Hash',
        action: 'TGW menerima packet di Spoke Route Table. Route menunjukkan destination 192.168.10.0/24 harus di-forward ke Inspection VPC (GWLB Attachment).',
        l2: 'AWS TGW Fabric Inner Tag',
        l3Src: '10.10.1.50',
        l3Dst: '192.168.10.100',
        l4: 'TCP SYN [Port 49152 ➔ 3306]',
        mtu: 8500,
        ttl: 63,
        deepExplanation: 'TGW mengenkapsulasi packet di dalam AWS network fabric dengan MTU 8500. Jika Appliance Mode aktif, flow 5-tuple di-hash secara simetris ke AZ yang sama.'
      },
      {
        nodeName: 'Gateway Load Balancer (GWLB)',
        nodeType: 'GWLB',
        title: 'Step 4: GENEVE Encapsulation (TLV 0x0108 metadata)',
        action: 'GWLB menerima packet, menambahkan GENEVE tunnel header (UDP port 6081) berisi VPC Endpoint ID & ENI metadata, lalu mengirimkannya ke appliance firewall.',
        l2: 'GWLB ENI MAC ➔ Firewall Appliance ENI MAC',
        l3Src: '10.10.1.50 (Inner) | 10.99.1.10 (GWLB Outer IP)',
        l3Dst: '192.168.10.100 (Inner) | 10.99.1.20 (Firewall Outer IP)',
        l4: 'UDP Port 6081 (GENEVE)',
        overlay: 'GENEVE Header [VNI: 0x000001, Option TLV Class: 0x0108 (AWS ENI ID Metadata)]',
        mtu: 8500,
        ttl: 63,
        deepExplanation: 'GENEVE tunnel membungkus L3 packet asli tanpa melakukan NAT. Firewall dapat menginspeksi original IP header dan mengembalikan packet dengan metadata yang utuh.'
      },
      {
        nodeName: 'Palo Alto / Fortinet Firewall Appliance',
        nodeType: 'FIREWALL',
        title: 'Step 5: Next-Gen Deep Packet & IPS Inspection',
        action: 'Firewall meng-unpack GENEVE tunnel, menginspeksi L7 traffic & signature malware, mengizinkan flow, lalu membungkus kembali paket ke GENEVE tunnel menuju GWLB.',
        l2: 'Firewall ENI MAC ➔ GWLB ENI MAC',
        l3Src: '10.10.1.50 (Inner) | 10.99.1.20 (Firewall Outer IP)',
        l3Dst: '192.168.10.100 (Inner) | 10.99.1.10 (GWLB Outer IP)',
        l4: 'UDP Port 6081 (GENEVE)',
        overlay: 'GENEVE Encap [Echoing TLV 0x0108 back to GWLB]',
        mtu: 8500,
        ttl: 63,
        deepExplanation: 'Firewall mempertahankan stateful session table. Karena TLV metadata di-echo kembali, GWLB dapat mengembalikan paket ke routing flow asalnya tanpa loop.'
      },
      {
        nodeName: 'Direct Connect Gateway & Transit VIF',
        nodeType: 'DXGW',
        title: 'Step 6: Dedicated Fiber 802.1Q Egress & MACsec Encryption',
        action: 'DXGW menerima paket yang telah diinspeksi, menambahkan 802.1Q VLAN Tag, mengenkripsi frame via IEEE 802.1AE MACsec, dan mentransmisikannya ke fiber optik on-premises.',
        l2: '802.1Q Tag (VLAN 400) + MACsec 128/256-bit GCM-AES',
        l3Src: '10.10.1.50',
        l3Dst: '192.168.10.100',
        l4: 'TCP SYN [Port 49152 ➔ 3306]',
        mtu: 1500,
        ttl: 62,
        deepExplanation: 'Direct Connect Transit VIF mengenkapsulasi paket dengan VLAN ID. Jika MSS Clamping aktif, MSS disesuaikan ke 1460 bytes untuk mencegah PMTUD black hole.'
      },
      {
        nodeName: 'On-Premises Core Database Server',
        nodeType: 'ONPREM',
        title: 'Step 7: Ingestion di On-Premises Kernel & TCP SYN-ACK Reply',
        action: 'Database server on-premises menerima TCP SYN, mengalokasikan socket connection di kernel Linux, dan mengirimkan paket balasan TCP SYN-ACK kembali ke 10.10.1.50.',
        l2: 'Database Server NIC MAC ➔ On-Prem Core Switch MAC',
        l3Src: '192.168.10.100',
        l3Dst: '10.10.1.50',
        l4: 'TCP SYN-ACK [Seq=0, Ack=1, Port 3306 ➔ 49152]',
        mtu: 1500,
        ttl: 64,
        deepExplanation: 'Return path mengikuti route table simetris via Transit VIF ➔ TGW Appliance Mode ➔ GWLB ➔ Spoke EC2 tanpa session drop.'
      }
    ]
  },
  {
    id: 'private-nat-partner',
    title: '2. Private NAT Gateway CGNAT (100.64.0.0/10) Interconnect',
    description: 'Penanganan overlapping IP antara VPC AWS (10.0.0.0/16) dengan Switching Network Partner Perbankan (10.0.0.0/16) melalui Private NAT Gateway CGNAT.',
    hops: [
      {
        nodeName: 'Fintech Transaction EC2 (10.0.1.25)',
        nodeType: 'EC2',
        title: 'Step 1: Kirim Transaksi ke Virtual Partner IP (100.64.10.50)',
        action: 'Aplikasi fintech memanggil endpoint switching bank di alamat CGNAT non-overlapping (100.64.10.50:8583).',
        l2: 'EC2 ENI MAC ➔ Private NAT GW ENI MAC',
        l3Src: '10.0.1.25',
        l3Dst: '100.64.10.50',
        l4: 'TCP SYN [Port 18450 ➔ 8583 (ISO 8583)]',
        mtu: 9001,
        ttl: 64,
        deepExplanation: 'Aplikasi tidak mengetahui IP overlapping partner secara langsung, melainkan mengirim paket ke CGNAT pool yang dialokasikan oleh tim Enterprise Network.'
      },
      {
        nodeName: 'AWS Private NAT Gateway (Hyperplane SNAT)',
        nodeType: 'PRIVATE_NAT',
        title: 'Step 2: Source IP Translation ke CGNAT Elastic IP Pool (100.64.1.100)',
        action: 'Private NAT Gateway mentranslasikan source IP 10.0.1.25 menjadi assigned private IPv4 100.64.1.100 untuk mencegah collision di sisi partner.',
        l2: 'Private NAT GW MAC ➔ TGW Attachment MAC',
        l3Src: '100.64.1.100 (Translated SNAT)',
        l3Dst: '100.64.10.50',
        l4: 'TCP SYN [Port 18450 ➔ 8583]',
        mtu: 1500,
        ttl: 63,
        deepExplanation: 'Private NAT Gateway tidak memiliki Internet Gateway attachment. NAT dikerjakan langsung oleh Hyperplane cluster dengan kapasitas hingga puluhan Gbps.'
      },
      {
        nodeName: 'Bank / Switching Network Edge (Arthajasa/BI-FAST)',
        nodeType: 'ONPREM',
        title: 'Step 3: Partner Ingress DNAT & Processing di Core Switch',
        action: 'Partner Core Router mentranslasikan destination 100.64.10.50 ke real server IP mereka (10.0.5.20) dan mengembalikan respons SYN-ACK melalui symmetrical path.',
        l2: 'Partner Router MAC ➔ Partner Switch Server MAC',
        l3Src: '100.64.1.100',
        l3Dst: '10.0.5.20 (Partner Local IP)',
        l4: 'TCP SYN [Port 18450 ➔ 8583]',
        mtu: 1500,
        ttl: 62,
        deepExplanation: 'Dual-NAT / Bi-directional NAT sukses menjembatani dua enterprise dengan IP subnet yang identik tanpa perlu melakukan re-IPing skala masif.'
      }
    ]
  }
]

const currentScenarioId = ref(scenarios[0].id)
const currentHopIndex = ref(0)
const isPlaying = ref(false)
let playTimer: any = null

const activeScenario = computed(() => {
  return scenarios.find(s => s.id === currentScenarioId.value) || scenarios[0]
})

const currentHop = computed(() => {
  return activeScenario.value.hops[currentHopIndex.value]
})

function setScenario(id: string) {
  currentScenarioId.value = id
  currentHopIndex.value = 0
  stopPlay()
}

function nextHop() {
  if (currentHopIndex.value < activeScenario.value.hops.length - 1) {
    currentHopIndex.value++
  } else {
    stopPlay()
  }
}

function prevHop() {
  if (currentHopIndex.value > 0) {
    currentHopIndex.value--
  }
}

function selectHop(idx: number) {
  currentHopIndex.value = idx
}

function togglePlay() {
  if (isPlaying.value) {
    stopPlay()
  } else {
    isPlaying.value = true
    if (currentHopIndex.value >= activeScenario.value.hops.length - 1) {
      currentHopIndex.value = 0
    }
    playTimer = setInterval(() => {
      if (currentHopIndex.value < activeScenario.value.hops.length - 1) {
        currentHopIndex.value++
      } else {
        stopPlay()
      }
    }, 2200)
  }
}

function stopPlay() {
  isPlaying.value = false
  if (playTimer) {
    clearInterval(playTimer)
    playTimer = null
  }
}

onUnmounted(() => {
  stopPlay()
})
</script>

<template>
  <div class="interactive-card">
    <!-- Header -->
    <div class="interactive-card-header">
      <div class="interactive-title">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <span>Interactive Deep Packet Flow & Encapsulation Tracer</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge-sme">SME Protocol Engine</span>
        <span class="badge-rfc">GENEVE / VXLAN</span>
      </div>
    </div>

    <p class="interactive-desc">
      Telusuri perjalanan tiap paket data, transformasi header L2/L3/L4, penambahan enkapsulasi overlay (GENEVE TLV 0x0108 / MACsec), dan decrement TTL di tiap hop infrastruktur AWS.
    </p>

    <!-- Scenario Selector & Playback Control -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in scenarios"
          :key="s.id"
          :class="[
            'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
            currentScenarioId === s.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-[var(--vp-c-bg-alt)] text-[var(--vp-c-text-2)] border-[var(--vp-c-divider)] hover:border-blue-400'
          ]"
          @click="setScenario(s.id)"
        >
          {{ s.title.split(':')[0] }}
        </button>
      </div>

      <button class="ui-button ui-button-secondary ui-button-sm" @click="togglePlay">
        <svg v-if="!isPlaying" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        {{ isPlaying ? 'Pause Flow' : 'Auto Play Flow' }}
      </button>
    </div>

    <div class="bg-[var(--vp-c-bg-alt)] p-3 rounded-xl border border-[var(--vp-c-divider)] mb-6 text-xs text-[var(--vp-c-text-2)] leading-relaxed">
      <strong class="text-[var(--vp-c-text-1)]">Skenario Aktif:</strong> {{ activeScenario.description }}
    </div>

    <!-- Visual Hop Timeline -->
    <div class="mb-6 overflow-x-auto pb-2">
      <div class="flex items-center gap-2 min-w-[650px]">
        <template v-for="(hop, idx) in activeScenario.hops" :key="idx">
          <div
            :class="[
              'flex-1 p-2.5 rounded-xl border cursor-pointer transition-all text-center',
              currentHopIndex === idx
                ? 'bg-blue-600/10 border-blue-600 shadow-md ring-1 ring-blue-600'
                : idx < currentHopIndex
                ? 'bg-emerald-500/10 border-emerald-500/40 opacity-80'
                : 'bg-[var(--vp-c-bg-alt)] border-[var(--vp-c-divider)] opacity-60'
            ]"
            @click="selectHop(idx)"
          >
            <div class="text-[10px] font-bold uppercase tracking-wider mb-1" :class="currentHopIndex === idx ? 'text-blue-500' : 'text-[var(--vp-c-text-3)]'">
              Hop {{ idx + 1 }}
            </div>
            <div class="text-xs font-bold truncate text-[var(--vp-c-text-1)]">
              {{ hop.nodeName.split('(')[0] }}
            </div>
          </div>
          <div v-if="idx < activeScenario.hops.length - 1" class="text-gray-400 font-bold text-xs">➔</div>
        </template>
      </div>
    </div>

    <!-- Current Hop Detail & Header Inspector -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <!-- Left: Hop Narrative -->
      <div class="bg-[var(--vp-c-bg-alt)] p-4 rounded-xl border border-[var(--vp-c-divider)] flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-blue-500 font-mono">
              Hop {{ currentHopIndex + 1 }} of {{ activeScenario.hops.length }}
            </span>
            <span class="badge-aws">{{ currentHop.nodeType }}</span>
          </div>
          <h4 class="text-sm font-bold text-[var(--vp-c-text-1)] mb-2">{{ currentHop.title }}</h4>
          <p class="text-xs text-[var(--vp-c-text-2)] mb-3.5 leading-relaxed">{{ currentHop.action }}</p>

          <div class="p-3 bg-[var(--vp-c-bg-soft)] rounded-lg border border-[var(--vp-c-divider)] text-xs text-[var(--vp-c-text-2)] leading-relaxed">
            <span class="font-bold text-amber-400 block mb-1 flex items-center gap-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Deep Architectural Mechanism:
            </span>
            {{ currentHop.deepExplanation }}
          </div>
        </div>

        <div class="flex justify-between items-center mt-4 pt-3 border-t border-[var(--vp-c-divider)]">
          <button
            :disabled="currentHopIndex === 0"
            class="ui-button ui-button-secondary !py-1 !px-3 text-xs disabled:opacity-30"
            @click="prevHop"
          >
            ◀ Previous
          </button>
          <span class="text-xs text-[var(--vp-c-text-3)] font-mono">MTU: {{ currentHop.mtu }}B | TTL: {{ currentHop.ttl }}</span>
          <button
            :disabled="currentHopIndex === activeScenario.hops.length - 1"
            class="ui-button ui-button-secondary !py-1 !px-3 text-xs disabled:opacity-30"
            @click="nextHop"
          >
            Next ▶
          </button>
        </div>
      </div>

      <!-- Right: Real-Time Packet Header Breakdown -->
      <div class="terminal-window">
        <div class="terminal-header">
          <div class="terminal-dots">
            <div class="terminal-dot dot-red"></div>
            <div class="terminal-dot dot-yellow"></div>
            <div class="terminal-dot dot-green"></div>
          </div>
          <span class="terminal-title">RFC Protocol Header Dissector & Frame Inspector</span>
        </div>
        <div class="terminal-body space-y-3">
          <!-- Layer 2 Ethernet Frame -->
          <div class="text-xs font-mono">
            <div class="text-purple-400 font-bold mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1.5"><span>▼</span> Layer 2 Ethernet II & 802.1Q</span>
              <span class="text-[10px] text-gray-500 font-normal">EtherType: 0x0800</span>
            </div>
            <div class="text-gray-300 bg-gray-900/90 p-2.5 rounded-lg border border-gray-800 text-[11px] leading-relaxed">
              {{ currentHop.l2 }}
            </div>
          </div>

          <!-- Overlay Tunnel Header (if any) -->
          <div v-if="currentHop.overlay" class="text-xs font-mono">
            <div class="text-yellow-400 font-bold mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1.5"><span>▼</span> RFC 8926 GENEVE / VXLAN Overlay Tunnel</span>
              <span class="text-[10px] text-yellow-500/80 font-normal">UDP Port 6081</span>
            </div>
            <div class="text-yellow-200/95 bg-yellow-950/30 p-2.5 rounded-lg border border-yellow-800/50 text-[11px] leading-relaxed">
              <div>{{ currentHop.overlay }}</div>
              <div class="mt-1 text-[10px] text-yellow-400/80">AWS Metadata: TLV Class 0x0108 contains Source ENI, VPC Endpoint ID, and Flow Hash Index.</div>
            </div>
          </div>

          <!-- Layer 3 IPv4 Packet -->
          <div class="text-xs font-mono">
            <div class="text-cyan-400 font-bold mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1.5"><span>▼</span> RFC 791 IPv4 Header (20 Bytes)</span>
              <span class="text-[10px] text-gray-500 font-normal">Proto: 6 (TCP) | DF: 1</span>
            </div>
            <div class="text-gray-300 bg-gray-900/90 p-2.5 rounded-lg border border-gray-800 text-[11px] grid grid-cols-2 gap-2">
              <div><span class="text-gray-500">Source IP:</span> <span class="text-emerald-400 font-bold">{{ currentHop.l3Src }}</span></div>
              <div><span class="text-gray-500">Dest IP:</span> <span class="text-rose-400 font-bold">{{ currentHop.l3Dst }}</span></div>
              <div><span class="text-gray-500">TTL Remaining:</span> <span class="text-blue-300 font-bold">{{ currentHop.ttl }}</span></div>
              <div><span class="text-gray-500">MTU Cap:</span> <span class="text-amber-300 font-bold">{{ currentHop.mtu }} bytes</span></div>
            </div>
          </div>

          <!-- Layer 4 TCP Segment -->
          <div class="text-xs font-mono">
            <div class="text-emerald-400 font-bold mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1.5"><span>▼</span> RFC 793 TCP Transport Segment</span>
              <span class="text-[10px] text-gray-500 font-normal">State: ESTABLISHED/SYN</span>
            </div>
            <div class="text-gray-300 bg-gray-900/90 p-2.5 rounded-lg border border-gray-800 text-[11px] leading-relaxed">
              {{ currentHop.l4 }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
