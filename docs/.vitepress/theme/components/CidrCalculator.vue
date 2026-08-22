<script setup lang="ts">
import { ref, computed } from 'vue'

const ipInput = ref('10.200.0.0')
const prefixInput = ref(20)
const copyToast = ref('')

// Helper functions for IP manipulation
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0)
}

function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255
  ].join('.')
}

function intToBinary(int: number): string[] {
  return [
    ((int >>> 24) & 255).toString(2).padStart(8, '0'),
    ((int >>> 16) & 255).toString(2).padStart(8, '0'),
    ((int >>> 8) & 255).toString(2).padStart(8, '0'),
    (int & 255).toString(2).padStart(8, '0')
  ]
}

const prefix = computed(() => {
  const p = Number(prefixInput.value)
  return isNaN(p) ? 24 : Math.min(32, Math.max(0, p))
})

const maskInt = computed(() => {
  if (prefix.value === 0) return 0
  return ((0xFFFFFFFF << (32 - prefix.value)) >>> 0)
})

const wildcardInt = computed(() => {
  return (~maskInt.value) >>> 0
})

const parsedIpInt = computed(() => {
  const clean = ipInput.value.trim()
  const parts = clean.split('.')
  if (parts.length !== 4) return ipToInt('10.0.0.0')
  for (const part of parts) {
    const num = parseInt(part, 10)
    if (isNaN(num) || num < 0 || num > 255) return ipToInt('10.0.0.0')
  }
  return ipToInt(clean)
})

const networkInt = computed(() => {
  return (parsedIpInt.value & maskInt.value) >>> 0
})

const broadcastInt = computed(() => {
  return (networkInt.value | wildcardInt.value) >>> 0
})

const totalAddresses = computed(() => {
  return Math.pow(2, 32 - prefix.value)
})

const awsUsableHosts = computed(() => {
  if (prefix.value > 28) return 0 // AWS VPC minimum subnet size is /28
  return Math.max(0, totalAddresses.value - 5)
})

const isAwsValidVpc = computed(() => {
  return prefix.value >= 16 && prefix.value <= 28
})

// 32 individual bits for interactive bitboard
const bitboard = computed(() => {
  const netBin = intToBinary(networkInt.value).join('')
  const bits: { index: number; bit: string; isNetwork: boolean; octetIndex: number }[] = []
  for (let i = 0; i < 32; i++) {
    bits.push({
      index: i + 1,
      bit: netBin[i] || '0',
      isNetwork: i < prefix.value,
      octetIndex: Math.floor(i / 8)
    })
  }
  return bits
})

function setPrefix(newPrefix: number) {
  prefixInput.value = newPrefix
}

// AWS Reserved IPs
const awsReservedIps = computed(() => {
  if (prefix.value > 28) return []
  return [
    { ip: intToIp(networkInt.value), role: 'Network Address', offset: 'Base + 0', desc: 'Selalu merupakan IP pertama di CIDR block, tidak dapat di-assign ke ENI.' },
    { ip: intToIp(networkInt.value + 1), role: 'VPC Router / Default Gateway', offset: 'Base + 1', desc: 'Reserved oleh AWS untuk internal router gateway VPC.' },
    { ip: intToIp(networkInt.value + 2), role: 'Amazon Provided DNS (Route 53 Resolver)', offset: 'Base + 2', desc: 'Base subnet IP + 2 untuk recursive internal DNS resolution (AmazonProvidedDNS).' },
    { ip: intToIp(networkInt.value + 3), role: 'Future AWS Internal Use', offset: 'Base + 3', desc: 'Dicadangkan oleh AWS untuk ekspansi fitur infrastruktur di masa depan.' },
    { ip: intToIp(broadcastInt.value), role: 'Network Broadcast Address', offset: 'Last IP', desc: 'IP terakhir subnet. Walaupun AWS VPC tidak mendukung broadcast L2, IP ini tetap di-reserve.' }
  ]
})

// Subnet Partitioning Tool
const splitPrefix = ref(24)
const splitSubnets = computed(() => {
  const sp = Number(splitPrefix.value)
  if (sp <= prefix.value || sp > 28) return []
  const count = Math.min(32, Math.pow(2, sp - prefix.value))
  const step = Math.pow(2, 32 - sp)
  const result = []
  for (let i = 0; i < count; i++) {
    const net = (networkInt.value + (i * step)) >>> 0
    const bcast = (net + step - 1) >>> 0
    result.push({
      cidr: `${intToIp(net)}/${sp}`,
      network: intToIp(net),
      range: `${intToIp(net + 4)} - ${intToIp(bcast - 1)}`,
      awsUsable: step - 5,
      broadcast: intToIp(bcast)
    })
  }
  return result
})

// Overlap checker
const checkIpA = ref('10.100.0.0/16')
const checkIpB = ref('10.100.64.0/18')

const overlapResult = computed(() => {
  try {
    const parse = (cidr: string) => {
      const [ip, pStr] = cidr.trim().split('/')
      const p = parseInt(pStr, 10)
      const ipN = ipToInt(ip)
      const mask = p === 0 ? 0 : ((0xFFFFFFFF << (32 - p)) >>> 0)
      const net = (ipN & mask) >>> 0
      const bcast = (net | ((~mask) >>> 0)) >>> 0
      return { net, bcast, p }
    }
    const a = parse(checkIpA.value)
    const b = parse(checkIpB.value)
    const isOverlapping = (a.net <= b.bcast) && (b.net <= a.bcast)
    return {
      valid: true,
      overlap: isOverlapping,
      msg: isOverlapping 
        ? `⚠️ OVERLAP DETECTED: Rentang ${checkIpA.value} (${intToIp(a.net)} - ${intToIp(a.bcast)}) dan ${checkIpB.value} (${intToIp(b.net)} - ${intToIp(b.bcast)}) saling beririsan. Jangan gunakan dalam satu VPC / Route Table TGW tanpa NAT!` 
        : `✅ CLEAN & NON-OVERLAPPING: Kedua CIDR block independen dan aman untuk di-peer / di-attach ke Transit Gateway.`
    }
  } catch (e) {
    return { valid: false, overlap: false, msg: 'Format CIDR tidak valid. Gunakan format X.X.X.X/YY' }
  }
})

// IaC Exporter Formats
const exportFormat = ref<'terraform' | 'json' | 'awscli'>('terraform')
const exportedCode = computed(() => {
  if (exportFormat.value === 'terraform') {
    const subs = splitSubnets.value.length > 0 ? splitSubnets.value : [{ cidr: `${intToIp(networkInt.value)}/${prefix.value}`, awsUsable: awsUsableHosts.value }]
    const list = subs.map(s => `    "${s.cidr}", // ${s.awsUsable} Usable Hosts`).join('\n')
    return `# Terraform AWS Subnet CIDR Map\nlocals {\n  vpc_cidr = "${intToIp(networkInt.value)}/${prefix.value}"\n  subnets  = [\n${list}\n  ]\n}`
  }
  if (exportFormat.value === 'json') {
    return JSON.stringify({
      vpc_cidr: `${intToIp(networkInt.value)}/${prefix.value}`,
      netmask: intToIp(maskInt.value),
      total_ips: totalAddresses.value,
      aws_usable_hosts: awsUsableHosts.value,
      reserved_ips: awsReservedIps.value
    }, null, 2)
  }
  return `aws ec2 create-vpc --cidr-block ${intToIp(networkInt.value)}/${prefix.value} --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=Enterprise-VPC}]'`
})

function copyExport() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(exportedCode.value)
    copyToast.value = 'Tersalin ke Clipboard!'
    setTimeout(() => { copyToast.value = '' }, 2500)
  }
}
</script>

<template>
  <div class="interactive-card">
    <!-- Header -->
    <div class="interactive-card-header">
      <div class="interactive-title">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <span>Enterprise CIDR & AWS IPAM Hierarchy Allocator</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge-sme">SME Standard</span>
        <span class="badge-aws">Nitro VPC Engine</span>
      </div>
    </div>

    <p class="interactive-desc">
      Kalkulator matematika biner subnetting, alokasi VLSM, visualisasi pemetaan memori IP address, dan aturan 5 reserved IP pada arsitektur AWS VPC.
    </p>

    <!-- Controls Input Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1.5">
          Base IPv4 Address
        </label>
        <input v-model="ipInput" type="text" class="ui-input font-mono" placeholder="e.g. 10.200.0.0" />
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1.5 flex justify-between">
          <span>CIDR Prefix Mask</span>
          <span class="font-mono text-blue-500 font-bold">/{{ prefix }}</span>
        </label>
        <input v-model.number="prefixInput" type="range" min="0" max="32" />
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1.5">
          AWS VPC Compliance Check
        </label>
        <div class="mt-1">
          <span v-if="isAwsValidVpc" class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-md">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Valid AWS Subnet (/16 - /28)
          </span>
          <span v-else class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-md">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Di luar batas AWS VPC (/16 - /28)
          </span>
        </div>
      </div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="stat-box">
        <div class="stat-label">Network Address</div>
        <div class="stat-value text-blue-400">{{ intToIp(networkInt) }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Subnet Mask</div>
        <div class="stat-value">{{ intToIp(maskInt) }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Broadcast Address</div>
        <div class="stat-value text-purple-400">{{ intToIp(broadcastInt) }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">AWS Usable Hosts</div>
        <div class="stat-value text-emerald-400">{{ awsUsableHosts.toLocaleString() }} <span class="text-xs text-[var(--vp-c-text-3)] font-normal">IPs</span></div>
      </div>
    </div>

    <!-- Interactive 32-Bit Bitboard -->
    <div class="mb-6 bg-[var(--vp-c-bg-alt)] p-4 rounded-xl border border-[var(--vp-c-divider)]">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/></svg>
          32-Bit Interactive Bitboard (Click bit to toggle prefix)
        </span>
        <span class="text-xs font-mono text-blue-400 font-bold">Network: {{ prefix }} | Host: {{ 32 - prefix }} bits</span>
      </div>

      <!-- 4 Octets -->
      <div class="bit-matrix-board">
        <div v-for="octet in 4" :key="octet" class="bit-octet-box">
          <div class="bit-octet-label">
            <span>Octet {{ octet }}</span>
            <span class="font-mono text-blue-400">.{{ (networkInt >>> ((4 - octet) * 8)) & 255 }}</span>
          </div>
          <div class="bit-cells-row">
            <div 
              v-for="bit in bitboard.filter(b => b.octetIndex === octet - 1)" 
              :key="bit.index"
              class="bit-cell"
              :class="bit.isNetwork ? 'network-bit' : 'host-bit'"
              :title="`Bit #${bit.index} (${bit.isNetwork ? 'Network Bit' : 'Host Bit'}). Click to set prefix to /${bit.index}`"
              @click="setPrefix(bit.index)"
            >
              {{ bit.bit }}
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between text-xs text-[var(--vp-c-text-2)] mt-3">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded bg-blue-500/20 border border-blue-500"></span>
            <span>Network Bits ({{ prefix }} bits)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500"></span>
            <span>Host Bits ({{ 32 - prefix }} bits = {{ totalAddresses.toLocaleString() }} IPs)</span>
          </div>
        </div>
        <span class="text-[11px] text-[var(--vp-c-text-3)] hidden sm:inline">Tip: Klik bit mana saja untuk mengubah prefix mask secara instan</span>
      </div>
    </div>

    <!-- AWS 5 Reserved IPs Table -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2.5">
        <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] flex items-center gap-2">
          <svg class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          AWS VPC Reserved IP Allocations (5 IPs per Subnet)
        </h4>
        <span class="text-xs text-[var(--vp-c-text-3)]">AWS RFC Standard</span>
      </div>
      <div class="overflow-x-auto border border-[var(--vp-c-divider)] rounded-xl">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-[var(--vp-c-bg-alt)] border-b border-[var(--vp-c-divider)]">
              <th class="p-2.5 font-bold text-[var(--vp-c-text-1)]">Reserved IP</th>
              <th class="p-2.5 font-bold text-[var(--vp-c-text-1)]">Offset</th>
              <th class="p-2.5 font-bold text-[var(--vp-c-text-1)]">Role / Peruntukan</th>
              <th class="p-2.5 font-bold text-[var(--vp-c-text-1)]">Penjelasan Arsitektural AWS Underlay</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in awsReservedIps" :key="idx" class="border-b border-[var(--vp-c-divider)] hover:bg-[var(--vp-c-bg-mute)]">
              <td class="p-2.5 font-mono font-bold text-amber-400">{{ item.ip }}</td>
              <td class="p-2.5 font-mono text-[var(--vp-c-text-3)]">{{ item.offset }}</td>
              <td class="p-2.5 font-semibold text-[var(--vp-c-text-1)]">{{ item.role }}</td>
              <td class="p-2.5 text-[var(--vp-c-text-2)]">{{ item.desc }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Subnet Partitioning / VLSM Slicing Tool -->
    <div class="mb-6 bg-[var(--vp-c-bg-alt)] p-4 rounded-xl border border-[var(--vp-c-divider)]">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] flex items-center gap-1.5">
          <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
          VLSM Subnet Partitioning Slicer
        </h4>
        <div class="flex items-center gap-2 text-xs">
          <span>Pecah menjadi subnet:</span>
          <select v-model.number="splitPrefix" class="ui-input !w-auto !py-1 !px-2.5 text-xs font-mono">
            <option v-for="p in [20, 21, 22, 23, 24, 25, 26, 27, 28]" :key="p" :value="p" :disabled="p <= prefix">
              /{{ p }} ({{ Math.max(0, Math.pow(2, 32 - p) - 5) }} AWS Usable Hosts)
            </option>
          </select>
        </div>
      </div>

      <div v-if="splitSubnets.length > 0" class="overflow-x-auto max-h-60 overflow-y-auto border border-[var(--vp-c-divider)] rounded-lg">
        <table class="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr class="bg-[var(--vp-c-bg-soft)] border-b border-[var(--vp-c-divider)] text-[var(--vp-c-text-1)]">
              <th class="p-2.5">CIDR Subnet</th>
              <th class="p-2.5">Usable Range (AWS)</th>
              <th class="p-2.5">Usable Hosts</th>
              <th class="p-2.5">Broadcast</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sub, i) in splitSubnets" :key="i" class="border-b border-[var(--vp-c-divider)] hover:bg-[var(--vp-c-bg-soft)]">
              <td class="p-2.5 font-bold text-blue-400">{{ sub.cidr }}</td>
              <td class="p-2.5 text-[var(--vp-c-text-2)]">{{ sub.range }}</td>
              <td class="p-2.5 font-bold text-emerald-400">{{ sub.awsUsable }}</td>
              <td class="p-2.5 text-[var(--vp-c-text-3)]">{{ sub.broadcast }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-xs text-[var(--vp-c-text-3)] italic py-2">
        Pilih prefix partisi yang lebih besar dari base prefix (/{{ prefix }}) untuk melihat hasil partisi.
      </div>
    </div>

    <!-- CIDR Overlap Tester -->
    <div class="mb-6 bg-[var(--vp-c-bg-alt)] p-4 rounded-xl border border-[var(--vp-c-divider)]">
      <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] mb-2.5 flex items-center gap-1.5">
        <svg class="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        CIDR Overlap & Routing Conflict Detector
      </h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="block text-xs text-[var(--vp-c-text-2)] mb-1">VPC A / On-Prem CIDR</label>
          <input v-model="checkIpA" type="text" class="ui-input text-xs font-mono" />
        </div>
        <div>
          <label class="block text-xs text-[var(--vp-c-text-2)] mb-1">VPC B / Partner CIDR</label>
          <input v-model="checkIpB" type="text" class="ui-input text-xs font-mono" />
        </div>
      </div>
      <div :class="[
        'p-3 rounded-lg text-xs font-semibold leading-relaxed border',
        overlapResult.overlap ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      ]">
        {{ overlapResult.msg }}
      </div>
    </div>

    <!-- IaC & Manifest Exporter -->
    <div class="bg-[var(--vp-c-bg-alt)] p-4 rounded-xl border border-[var(--vp-c-divider)]">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] flex items-center gap-1.5">
          <svg class="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          Export Production Blueprint (IaC / JSON)
        </h4>
        <div class="flex items-center gap-2">
          <div class="flex rounded-md bg-[var(--vp-c-bg)] p-0.5 border border-[var(--vp-c-divider)]">
            <button 
              class="px-2 py-0.5 text-xs rounded" 
              :class="exportFormat === 'terraform' ? 'bg-blue-600 text-white font-bold' : 'text-[var(--vp-c-text-2)]'"
              @click="exportFormat = 'terraform'"
            >
              Terraform
            </button>
            <button 
              class="px-2 py-0.5 text-xs rounded" 
              :class="exportFormat === 'json' ? 'bg-blue-600 text-white font-bold' : 'text-[var(--vp-c-text-2)]'"
              @click="exportFormat = 'json'"
            >
              JSON
            </button>
            <button 
              class="px-2 py-0.5 text-xs rounded" 
              :class="exportFormat === 'awscli' ? 'bg-blue-600 text-white font-bold' : 'text-[var(--vp-c-text-2)]'"
              @click="exportFormat = 'awscli'"
            >
              AWS CLI
            </button>
          </div>
          <button @click="copyExport" class="ui-button ui-button-sm">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            {{ copyToast || 'Salin Code' }}
          </button>
        </div>
      </div>
      <pre class="p-3 bg-[var(--vp-c-bg)] rounded-lg border border-[var(--vp-c-divider)] text-xs font-mono text-[var(--vp-c-text-1)] overflow-x-auto leading-relaxed">{{ exportedCode }}</pre>
    </div>
  </div>
</template>

