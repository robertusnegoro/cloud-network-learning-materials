<script setup lang="ts">
import { ref, computed } from 'vue'

interface TopologyNode {
  id: string
  label: string
  type: string
  underlay: string
  mtu: string
  limits: string
  haModel: string
  inspectCli: string
  description: string
}

interface TrafficPattern {
  id: string
  title: string
  subtitle: string
  nodes: string[]
  flowDesc: string
  asymmetricRisk: string
}

const nodes: Record<string, TopologyNode> = {
  ec2_spoke: {
    id: 'ec2_spoke',
    label: 'Spoke EC2 (10.10.1.50)',
    type: 'Workload Instance',
    underlay: 'AWS Nitro System (PCIe Hardware Offload)',
    mtu: '9001 Bytes (Jumbo Frame)',
    limits: 'Up to 100 Gbps via ENA Express (SRD)',
    haModel: 'Single AZ Placement (Spanned by ASG)',
    inspectCli: 'ip route show && ethtool -S ens5',
    description: 'Instance komputasi beban kerja aplikasi di subnet privat Spoke VPC. Memulai sesi TCP dan menegosiasikan MSS.'
  },
  eni_nitro: {
    id: 'eni_nitro',
    label: 'VPC ENI & Nitro Security Group',
    type: 'Interface Controller',
    underlay: 'Nitro Card for VPC (Hardware ASIC)',
    mtu: '9001 Bytes',
    limits: 'Line-rate evaluation tanpa latency CPU',
    haModel: 'High Availability di level hardware rack',
    inspectCli: 'aws ec2 describe-network-interfaces --network-interface-ids eni-0123456789abcdef0',
    description: 'Hardware controller yang mengevaluasi aturan Security Group secara stateful dan merutekan traffic ke VPC Route Table.'
  },
  tgw_hub: {
    id: 'tgw_hub',
    label: 'AWS Transit Gateway (TGW)',
    type: 'Regional Virtual Router',
    underlay: 'AWS Hyperplane Regional Fabric',
    mtu: '8500 Bytes',
    limits: '50 Gbps burst per VPC Attachment',
    haModel: 'Multi-AZ Active-Active Native Sharding',
    inspectCli: 'aws ec2 describe-transit-gateways && aws ec2 get-transit-gateway-route-table-propagations',
    description: 'Virtual hub terpusat dengan routing domain terisolasi. Mendukung Appliance Mode untuk menjamin simetri flow firewall.'
  },
  gwlb_engine: {
    id: 'gwlb_engine',
    label: 'Gateway Load Balancer (GWLB)',
    type: 'L3/L4 Transparent Load Balancer',
    underlay: 'AWS Hyperplane Flow Engine',
    mtu: '8500 Bytes',
    limits: 'Terabits per second scale per AZ',
    haModel: 'Multi-AZ Redundant Target Groups',
    inspectCli: 'aws elbv2 describe-load-balancers --names gwlb-prod',
    description: 'Menerima traffic via GWLB Endpoint (PrivateLink) dan membungkus paket ke tunnel GENEVE (UDP 6081) dengan TLV 0x0108.'
  },
  palo_alto: {
    id: 'palo_alto',
    label: 'NGFW Cluster (Palo Alto / Fortinet)',
    type: 'Stateful Security Appliance',
    underlay: 'EC2 c6in.4xlarge Autoscaling Group',
    mtu: '8500 Bytes (GENEVE De-encapsulation)',
    limits: '10 Gbps per firewall instance',
    haModel: 'Active-Active GWLB Target Group',
    inspectCli: 'show running session table (Palo Alto CLI)',
    description: 'Inspeksi mendalam L7, threat prevention, SSL decryption, dan policy compliance. Menjaga session table stateful.'
  },
  nat_gw: {
    id: 'nat_gw',
    label: 'AWS Central NAT Gateway',
    type: 'Egress NAT Engine',
    underlay: 'AWS Hyperplane 100G Pool',
    mtu: '1500 Bytes',
    limits: '55,000 concurrent flows per Elastic IP (Up to 8 IPs = 440k)',
    haModel: 'Zonal Redundancy (Deploy 1 per AZ)',
    inspectCli: 'aws ec2 describe-nat-gateways',
    description: 'Mentranslasikan IP privat internal menjadi Public IP untuk akses ke internet publik dengan proteksi outbound murni.'
  },
  dx_gateway: {
    id: 'dx_gateway',
    label: 'Direct Connect Gateway (DXGW)',
    type: 'Global Hybrid Hub',
    underlay: 'AWS Global Fiber Infrastructure',
    mtu: '1500 / 9001 Bytes',
    limits: 'Hingga 100 Gbps dedicated circuits',
    haModel: 'Global Multi-Region Association',
    inspectCli: 'aws directconnect describe-direct-connect-gateways',
    description: 'Global gateway terkelola yang menghubungkan Transit Gateway dan Virtual Private Gateway ke private/transit virtual interface.'
  },
  onprem_core: {
    id: 'onprem_core',
    label: 'On-Premises Core Router & DC',
    type: 'Enterprise DC Gateway',
    underlay: 'Customer Edge BGP Router (AS 65001)',
    mtu: '1500 Bytes (Clamped MSS 1460)',
    limits: 'Physical Transceiver SFP+ / QSFP28',
    haModel: 'Dual-CPE Active-Standby / ECMP BGP',
    inspectCli: 'show ip bgp neighbors 169.254.250.1 routes (Cisco IOS-XE)',
    description: 'Border router enterprise data center. Memproses BGP communities (7224:7300), IPsec encryption, dan terminasi 802.1Q VLAN.'
  }
}

const patterns: TrafficPattern[] = [
  {
    id: 'east_west_gwlb',
    title: '1. East-West Spoke-to-Spoke with Central GWLB Inspection',
    subtitle: 'Traffic antar-VPC melintasi TGW dan diinspeksi secara simetris oleh cluster firewall GWLB.',
    nodes: ['ec2_spoke', 'eni_nitro', 'tgw_hub', 'gwlb_engine', 'palo_alto', 'gwlb_engine', 'tgw_hub'],
    flowDesc: 'Spoke VPC A ➔ Nitro SG ➔ TGW Attachment ➔ GWLB (GENEVE) ➔ Palo Alto ➔ Return via Appliance Mode ➔ Spoke VPC B',
    asymmetricRisk: 'Wajib mengaktifkan Transit Gateway Appliance Mode pada Inspection VPC Attachment untuk mencegah drop session pada firewall multi-AZ.'
  },
  {
    id: 'hybrid_direct_connect',
    title: '2. Hybrid Cloud AWS-to-On-Premises via Direct Connect',
    subtitle: 'Traffic dari Spoke VPC menuju Data Center lokal melalui Dedicated Transit VIF & MACsec.',
    nodes: ['ec2_spoke', 'eni_nitro', 'tgw_hub', 'dx_gateway', 'onprem_core'],
    flowDesc: 'Spoke EC2 ➔ TGW ➔ DXGW ➔ Dedicated 10G/100G Direct Connect Circuit ➔ Customer DC Core Router',
    asymmetricRisk: 'Perbedaan MTU (9001 vs 1500) dapat memicu PMTUD Black Hole jika ICMP Type 3 Code 4 di-drop oleh on-prem firewall.'
  },
  {
    id: 'central_egress',
    title: '3. Centralized Internet Egress via Inspection Hub',
    subtitle: 'Semua outbound traffic Spoke VPC dipaksa melalui cluster Firewall L7 sebelum keluar via NAT GW.',
    nodes: ['ec2_spoke', 'tgw_hub', 'gwlb_engine', 'palo_alto', 'nat_gw'],
    flowDesc: 'Spoke EC2 ➔ TGW ➔ Inspection VPC (GWLB) ➔ Firewall IPS ➔ Egress Route Table ➔ Central NAT Gateway ➔ Internet Gateway',
    asymmetricRisk: 'Monitor metrik ErrorPortAllocation pada NAT Gateway saat traffic concurrent flow melebihi 55.000 tuples per IP.'
  }
]

const currentPatternId = ref<string>(patterns[0].id)
const selectedNodeId = ref<string>(patterns[0].nodes[0])
const copyToast = ref('')

const currentPattern = computed(() => {
  return patterns.find(p => p.id === currentPatternId.value) || patterns[0]
})

const selectedNode = computed(() => {
  return nodes[selectedNodeId.value] || nodes['ec2_spoke']
})

function selectPattern(id: string) {
  currentPatternId.value = id
  const p = patterns.find(item => item.id === id)
  if (p && p.nodes.length > 0) {
    selectedNodeId.value = p.nodes[0]
  }
}

function selectNode(id: string) {
  selectedNodeId.value = id
}

function copyCli() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(selectedNode.value.inspectCli)
    copyToast.value = 'Perintah Tersalin!'
    setTimeout(() => { copyToast.value = '' }, 2500)
  }
}
</script>

<template>
  <div class="interactive-card">
    <!-- Header -->
    <div class="interactive-card-header">
      <div class="interactive-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 3a9 9 0 0 0-9 9m18 0a9 9 0 0 0-9-9m0 18a9 9 0 0 0 9-9M3 12a9 9 0 0 0 9 9"/>
        </svg>
        <span>Enterprise Cloud Network Topology & Underlay Node Explorer</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge-sme">SME Architecture</span>
        <span class="badge-aws">Multi-Tier Hub-and-Spoke</span>
      </div>
    </div>

    <p class="interactive-desc">
      Pilih pola arsitektur enterprise di bawah ini untuk melihat jalur aliran paket (<em>packet traversal path</em>), rincian teknologi underlay di setiap node, batas MTU/Throughput, dan perintah inspeksi AWS CLI.
    </p>

    <!-- Pattern Selector Tabs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-6">
      <button
        v-for="p in patterns"
        :key="p.id"
        :class="[
          'p-3.5 rounded-xl border text-left transition-all',
          currentPatternId === p.id
            ? 'bg-blue-600/10 border-blue-600 ring-1 ring-blue-600 shadow-sm'
            : 'bg-[var(--vp-c-bg-alt)] border-[var(--vp-c-divider)] hover:border-blue-400 opacity-80'
        ]"
        @click="selectPattern(p.id)"
      >
        <div class="text-xs font-bold text-[var(--vp-c-text-1)] mb-1">{{ p.title }}</div>
        <div class="text-[11px] text-[var(--vp-c-text-2)] line-clamp-2 leading-relaxed">{{ p.subtitle }}</div>
      </button>
    </div>

    <!-- Active Topology Flow Bar -->
    <div class="bg-[var(--vp-c-bg-alt)] p-4 rounded-xl border border-[var(--vp-c-divider)] mb-6">
      <div class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-3)] mb-2.5 flex justify-between items-center">
        <span>Active Packet Journey Path</span>
        <span class="text-blue-500 font-mono font-bold">{{ currentPattern.nodes.length }} Hops</span>
      </div>

      <!-- Node Chain -->
      <div class="flex flex-wrap items-center gap-2 py-2">
        <template v-for="(nodeKey, idx) in currentPattern.nodes" :key="idx">
          <button
            :class="[
              'px-3 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5',
              selectedNodeId === nodeKey
                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/50'
                : 'bg-[var(--vp-c-bg)] text-[var(--vp-c-text-1)] border-[var(--vp-c-divider)] hover:border-blue-400'
            ]"
            @click="selectNode(nodeKey)"
          >
            <span class="w-2 h-2 rounded-full" :class="selectedNodeId === nodeKey ? 'bg-white' : 'bg-blue-400'"></span>
            <span>{{ nodes[nodeKey]?.label?.split('(')[0] || nodeKey }}</span>
          </button>
          <span v-if="idx < currentPattern.nodes.length - 1" class="text-gray-400 font-bold text-xs">➔</span>
        </template>
      </div>

      <div class="mt-3 pt-3 border-t border-[var(--vp-c-divider)] text-xs text-[var(--vp-c-text-2)] leading-relaxed">
        <strong class="text-[var(--vp-c-text-1)]">Flow Sequence:</strong> {{ currentPattern.flowDesc }}
      </div>
      <div class="mt-1.5 text-xs text-amber-400 leading-relaxed flex items-center gap-1.5">
        <svg width="14" height="14" class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span><strong>Asymmetric Risk Assessment:</strong> {{ currentPattern.asymmetricRisk }}</span>
      </div>
    </div>

    <!-- Node Deep Inspector -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Left: Node Specifications -->
      <div class="bg-[var(--vp-c-bg-alt)] p-4 rounded-xl border border-[var(--vp-c-divider)] space-y-3">
        <div class="flex items-center justify-between pb-2.5 border-b border-[var(--vp-c-divider)]">
          <div>
            <span class="text-[10px] uppercase font-bold text-blue-500 block font-mono">{{ selectedNode.type }}</span>
            <h4 class="text-sm font-bold text-[var(--vp-c-text-1)]">{{ selectedNode.label }}</h4>
          </div>
          <span class="badge-aws font-mono text-[11px]">{{ selectedNode.mtu }}</span>
        </div>

        <p class="text-xs text-[var(--vp-c-text-2)] leading-relaxed">
          {{ selectedNode.description }}
        </p>

        <div class="grid grid-cols-2 gap-2 text-xs pt-1">
          <div class="stat-box">
            <div class="stat-label">Underlay Engine</div>
            <div class="text-[11px] font-semibold text-[var(--vp-c-text-1)]">{{ selectedNode.underlay }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Throughput / Limits</div>
            <div class="text-[11px] font-semibold text-emerald-400">{{ selectedNode.limits }}</div>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-label">High Availability Architecture</div>
          <div class="text-[11px] font-semibold text-[var(--vp-c-text-1)]">{{ selectedNode.haModel }}</div>
        </div>
      </div>

      <!-- Right: Operational Inspection Terminal -->
      <div class="terminal-window flex flex-col justify-between">
        <div>
          <div class="terminal-header">
            <div class="terminal-dots">
              <div class="terminal-dot dot-red"></div>
              <div class="terminal-dot dot-yellow"></div>
              <div class="terminal-dot dot-green"></div>
            </div>
            <span class="terminal-title">SME Diagnostic & Telemetry Inspection</span>
          </div>
          <div class="terminal-body font-mono text-xs text-gray-300 space-y-3">
            <div>
              <div class="text-gray-400 text-[11px] mb-1.5 flex items-center justify-between">
                <span># Command untuk memeriksa state node ini via AWS CLI / OS:</span>
                <button @click="copyCli" class="text-blue-400 hover:text-blue-300 text-[10px] underline font-sans">
                  {{ copyToast || 'Salin Command' }}
                </button>
              </div>
              <div class="text-amber-400 bg-gray-900/90 p-2.5 rounded-lg border border-gray-800 break-all select-all leading-relaxed">
                $ {{ selectedNode.inspectCli }}
              </div>
            </div>

            <div>
              <div class="text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                <span>▼</span> Protocol Specifications:
              </div>
              <div class="text-gray-300 text-[11px] space-y-1 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80">
                <div>• MTU Capability: <span class="text-emerald-400">{{ selectedNode.mtu }}</span></div>
                <div>• Architecture Domain: <span class="text-blue-400">{{ selectedNode.underlay }}</span></div>
                <div>• Resiliency Model: <span class="text-purple-400">{{ selectedNode.haModel }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-3 bg-gray-950/80 border-t border-gray-800 text-[11px] font-mono text-gray-400">
          Tip: Klik pada node mana saja di rantai flow di atas untuk membedah spesifikasi teknisnya.
        </div>
      </div>
    </div>
  </div>
</template>
