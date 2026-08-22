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
    inspectCli: 'aws ec2 describe-network-interfaces --network-interface-ids eni-xxx',
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
    description: 'Menjembatani Transit VIF fisik ke banyak Transit Gateway di seluruh dunia dengan BGP Dynamic Routing.'
  },
  onprem_core: {
    id: 'onprem_core',
    label: 'On-Premises Core Router',
    type: 'Enterprise Data Center Demarcation',
    underlay: 'Cisco ASR 9000 / Juniper MX Series',
    mtu: '1500 / 9001 Bytes',
    limits: 'Physical Line-Rate',
    haModel: 'Dual-Chassis Active/Standby HSRP/VRRP',
    inspectCli: 'show ip bgp summary && show ip bgp neighbors 169.254.240.1 routes',
    description: 'Router inti data center perusahaan yang menjalankan BGP eBGP peering, BFD sub-second failover, dan MACsec L2 encryption.'
  },
  priv_nat_gw: {
    id: 'priv_nat_gw',
    label: 'AWS Private NAT Gateway (RFC 6598)',
    type: 'Overlapping IP Resolver',
    underlay: 'AWS Hyperplane Private Pool',
    mtu: '1500 Bytes',
    limits: '100 Gbps tanpa Internet Gateway',
    haModel: 'Multi-AZ Deployment',
    inspectCli: 'aws ec2 describe-nat-gateways --filter Name=connectivity-type,Values=private',
    description: 'Melakukan translasi 1:1 bi-directional SNAT ke alokasi CGNAT (100.64.0.0/10) untuk menghubungkan partner finansial yang memiliki IP bentrok.'
  },
  cloud_wan_cne: {
    id: 'cloud_wan_cne',
    label: 'AWS Cloud WAN Core Network Edge (CNE)',
    type: 'Global SD-WAN Mesh',
    underlay: 'AWS Global Mesh Backbone',
    mtu: '8500 Bytes',
    limits: 'Multi-terabit Global Mesh',
    haModel: 'Global Built-in Redundancy',
    inspectCli: 'aws networkmanager get-core-network-policy',
    description: 'Orkestrasi routing deklaratif global multi-region berdasarkan JSON policy documents dan isolated segments.'
  }
}

const patterns: TrafficPattern[] = [
  {
    id: 'egress_inspection',
    title: '1. Centralized Egress to Internet via GWLB & NAT Gateway',
    subtitle: 'Traffic keluar dari workload privat diinspeksi oleh Next-Gen Firewall sebelum melewati NAT Gateway ke Public Internet.',
    nodes: ['ec2_spoke', 'eni_nitro', 'tgw_hub', 'gwlb_engine', 'palo_alto', 'nat_gw'],
    flowDesc: 'EC2 ➔ Nitro SG ➔ TGW Spoke Route Table (0.0.0.0/0 -> Security VPC) ➔ GWLB GENEVE Encap (UDP 6081) ➔ Palo Alto L7 Inspection ➔ Central NAT Gateway ➔ Internet Gateway',
    asymmetricRisk: 'Rendah. Pastikan default route di Spoke VPC mengarah ke TGW Attachment, dan Route Table TGW mengarahkan 0.0.0.0/0 ke Inspection Attachment.'
  },
  {
    id: 'east_west_inspection',
    title: '2. East-West Inter-VPC Inspection with TGW Appliance Mode',
    subtitle: 'Traffic antar dua Spoke VPC (Prod ke Dev) yang wajib melewati firewall stateful terpusat dengan jaminan simetri multi-AZ.',
    nodes: ['ec2_spoke', 'eni_nitro', 'tgw_hub', 'gwlb_engine', 'palo_alto'],
    flowDesc: 'Spoke VPC A ➔ TGW Spoke RTB ➔ Forward ke Inspection VPC ➔ GWLB ➔ Palo Alto AZ-A ➔ TGW Inspection RTB ➔ Deliver ke Spoke VPC B',
    asymmetricRisk: 'KRITIS! Wajib aktifkan TGW Appliance Mode pada attachment Inspection VPC agar paket return dari Spoke B selalu kembali ke firewall di AZ yang sama.'
  },
  {
    id: 'hybrid_direct_connect',
    title: '3. Hybrid Enterprise Backbone via Dedicated Direct Connect & DXGW',
    subtitle: 'Konektivitas privat berkecepatan tinggi antara On-Premises Data Center dan Workload AWS via Transit VIF.',
    nodes: ['onprem_core', 'dx_gateway', 'tgw_hub', 'eni_nitro', 'ec2_spoke'],
    flowDesc: 'On-Prem Core Router ➔ Direct Connect Transit VIF (BGP 65000 -> 64512) ➔ Direct Connect Gateway ➔ AWS Transit Gateway ➔ Spoke VPC',
    asymmetricRisk: 'Sedang. Pastikan BGP Community 7224:9300 disetel untuk primary link dan AS-Path Prepending disetel pada backup link.'
  },
  {
    id: 'financial_interconnect',
    title: '4. Financial Partner Interconnect with Overlapping CIDRs (Arthajasa / BI-FAST)',
    subtitle: 'Koneksi ke mitra perbankan dengan IP yang bentrok menggunakan Private NAT Gateway dan alokasi RFC 6598.',
    nodes: ['ec2_spoke', 'priv_nat_gw', 'cloud_wan_cne', 'dx_gateway', 'onprem_core'],
    flowDesc: 'Core Banking (10.0.5.20) ➔ AWS Private NAT GW (SNAT to 100.64.1.50) ➔ Cloud WAN Partner Segment ➔ Dedicated Circuit ➔ Bank Switch Core',
    asymmetricRisk: 'Tinggi jika DNS tidak sinkron. Gunakan Virtual Alias IP statis pada Bank Partner dan Route 53 Private Hosted Zone.'
  }
]

const currentPatternId = ref(patterns[0].id)
const selectedNodeId = ref('gwlb_engine')

const currentPattern = computed(() => patterns.find(p => p.id === currentPatternId.value) || patterns[0])
const selectedNode = computed(() => nodes[selectedNodeId.value] || nodes.gwlb_engine)

function selectPattern(id: string) {
  currentPatternId.value = id
  if (!currentPattern.value.nodes.includes(selectedNodeId.value)) {
    selectedNodeId.value = currentPattern.value.nodes[0]
  }
}

function selectNode(id: string) {
  selectedNodeId.value = id
}
</script>

<template>
  <div class="interactive-card">
    <div class="interactive-card-header">
      <div class="interactive-title">
        <span>🗺️</span>
        <span>Interactive Enterprise Network Topology Explorer</span>
      </div>
      <div class="flex gap-2">
        <span class="badge-sme">SME Architecture Canvas</span>
        <span class="badge-aws">Multi-Tier Hub-and-Spoke</span>
      </div>
    </div>

    <p class="text-sm text-[var(--vp-c-text-2)] mb-4">
      Pilih pola arsitektur enterprise di bawah ini untuk melihat jalur aliran paket (*packet traversal path*), rincian teknologi underlay di setiap node, batas MTU/Throughput, dan perintah inspeksi AWS CLI.
    </p>

    <!-- Pattern Selector Tabs -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
      <button
        v-for="p in patterns"
        :key="p.id"
        :class="[
          'p-3 rounded-lg border text-left transition-all',
          currentPatternId === p.id
            ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500 shadow-sm'
            : 'bg-[var(--vp-c-bg-alt)] border-[var(--vp-c-divider)] hover:border-blue-400 opacity-80'
        ]"
        @click="selectPattern(p.id)"
      >
        <div class="text-xs font-bold text-[var(--vp-c-text-1)] mb-1">{{ p.title }}</div>
        <div class="text-[11px] text-[var(--vp-c-text-2)] line-clamp-2 leading-relaxed">{{ p.subtitle }}</div>
      </button>
    </div>

    <!-- Active Topology Flow Bar -->
    <div class="bg-[var(--vp-c-bg-alt)] p-4 rounded-lg border border-[var(--vp-c-divider)] mb-6">
      <div class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-3)] mb-2 flex justify-between">
        <span>Active Packet Journey Path</span>
        <span class="text-blue-400 font-mono">{{ currentPattern.nodes.length }} Hops</span>
      </div>

      <!-- Node Chain -->
      <div class="flex flex-wrap items-center gap-2 py-2">
        <template v-for="(nodeKey, idx) in currentPattern.nodes" :key="nodeKey">
          <button
            :class="[
              'px-3 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5',
              selectedNodeId === nodeKey
                ? 'bg-blue-500 text-white border-blue-500 shadow-md ring-2 ring-blue-400/50'
                : 'bg-[var(--vp-c-bg-mute)] text-[var(--vp-c-text-1)] border-[var(--vp-c-divider)] hover:border-blue-400'
            ]"
            @click="selectNode(nodeKey)"
          >
            <span class="w-2 h-2 rounded-full" :class="selectedNodeId === nodeKey ? 'bg-white' : 'bg-blue-400'"></span>
            <span>{{ nodes[nodeKey].label.split('(')[0] }}</span>
          </button>
          <span v-if="idx < currentPattern.nodes.length - 1" class="text-gray-500 font-bold text-xs">➔</span>
        </template>
      </div>

      <div class="mt-3 pt-3 border-t border-[var(--vp-c-divider)] text-xs text-[var(--vp-c-text-2)]">
        <span class="font-bold text-[var(--vp-c-text-1)]">Flow Sequence:</span> {{ currentPattern.flowDesc }}
      </div>
      <div class="mt-1 text-xs text-amber-400">
        <span class="font-bold">⚠️ Asymmetric Risk Assessment:</span> {{ currentPattern.asymmetricRisk }}
      </div>
    </div>

    <!-- Node Deep Inspector -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Left: Node Specifications -->
      <div class="bg-[var(--vp-c-bg-alt)] p-4 rounded-lg border border-[var(--vp-c-divider)] space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--vp-c-divider)]">
          <div>
            <span class="text-[10px] uppercase font-bold text-blue-400 block">{{ selectedNode.type }}</span>
            <h4 class="text-sm font-bold text-[var(--vp-c-text-1)]">{{ selectedNode.label }}</h4>
          </div>
          <span class="badge-aws">{{ selectedNode.mtu }}</span>
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
            <div class="flex gap-1.5">
              <div class="terminal-dot dot-red"></div>
              <div class="terminal-dot dot-yellow"></div>
              <div class="terminal-dot dot-green"></div>
            </div>
            <span class="text-xs text-gray-400 font-mono">SME Live Diagnostic & Telemetry Inspection</span>
          </div>
          <div class="terminal-body font-mono text-xs text-gray-300 space-y-3">
            <div>
              <div class="text-gray-500 text-[11px] mb-1"># Command untuk memeriksa state node ini via AWS CLI / OS:</div>
              <div class="text-amber-400 bg-gray-900 p-2 rounded border border-gray-800 break-all select-all">
                $ {{ selectedNode.inspectCli }}
              </div>
            </div>

            <div>
              <div class="text-cyan-400 font-bold mb-1">▼ Protocol Specifications:</div>
              <div class="text-gray-300 text-[11px] space-y-1 bg-gray-900/60 p-2 rounded">
                <div>• MTU Capability: <span class="text-emerald-400">{{ selectedNode.mtu }}</span></div>
                <div>• Architecture Domain: <span class="text-blue-400">{{ selectedNode.underlay }}</span></div>
                <div>• Resiliency: <span class="text-purple-400">{{ selectedNode.haModel }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-3 bg-gray-950 border-t border-gray-800 text-[11px] font-mono text-gray-400">
          Tip: Klik pada node mana saja di rantai flow di atas untuk membedah spesifikasi teknisnya.
        </div>
      </div>
    </div>
  </div>
</template>
