<script setup lang="ts">
import { ref, computed } from 'vue'

const ipInput = ref('10.200.0.0')
const prefixInput = ref(20)

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

const rfcUsableHosts = computed(() => {
  if (prefix.value >= 31) return prefix.value === 31 ? 2 : 1
  return Math.max(0, totalAddresses.value - 2)
})

const awsUsableHosts = computed(() => {
  if (prefix.value > 28) return 0 // AWS VPC minimum subnet size is /28
  return Math.max(0, totalAddresses.value - 5)
})

const isAwsValidVpc = computed(() => {
  return prefix.value >= 16 && prefix.value <= 28
})

// AWS Reserved IPs
const awsReservedIps = computed(() => {
  if (prefix.value > 28) return []
  return [
    { ip: intToIp(networkInt.value), role: 'Network Address', desc: 'Selalu merupakan IP pertama di CIDR block, tidak dapat di-assign ke ENI.' },
    { ip: intToIp(networkInt.value + 1), role: 'VPC Router / Default Gateway', desc: 'Reserved oleh AWS untuk internal router gateway VPC.' },
    { ip: intToIp(networkInt.value + 2), role: 'Amazon Provided DNS (Route 53 Resolver)', desc: 'Base subnet IP + 2 untuk recursive internal DNS resolution (AmazonProvidedDNS).' },
    { ip: intToIp(networkInt.value + 3), role: 'Future AWS Internal Use', desc: 'Dicadangkan oleh AWS untuk ekspansi fitur infrastruktur di masa depan.' },
    { ip: intToIp(broadcastInt.value), role: 'Network Broadcast Address', desc: 'IP terakhir subnet. Walaupun AWS VPC tidak mendukung broadcast L2, IP ini tetap di-reserve.' }
  ]
})

// Binary representation with split
const binaryOctets = computed(() => {
  const netBin = intToBinary(networkInt.value).join('')
  const pref = prefix.value
  return {
    netPart: netBin.slice(0, pref),
    hostPart: netBin.slice(pref)
  }
})

// Subnet Partitioning Tool
const splitPrefix = ref(24)
const splitSubnets = computed(() => {
  const sp = Number(splitPrefix.value)
  if (sp <= prefix.value || sp > 28) return []
  const count = Math.min(64, Math.pow(2, sp - prefix.value))
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
        ? `⚠️ OVERLAP DETECTED! Rentang ${checkIpA.value} (${intToIp(a.net)} - ${intToIp(a.bcast)}) dan ${checkIpB.value} (${intToIp(b.net)} - ${intToIp(b.bcast)}) saling beririsan. Jangan gunakan dalam satu VPC / Route Table TGW tanpa NAT!` 
        : `✅ CLEAN / NON-OVERLAPPING. Kedua CIDR block independen dan aman untuk di-peer / di-attach ke Transit Gateway.`
    }
  } catch (e) {
    return { valid: false, overlap: false, msg: 'Format CIDR tidak valid. Gunakan format X.X.X.X/YY' }
  }
})
</script>

<template>
  <div class="interactive-card">
    <div class="interactive-card-header">
      <div class="interactive-title">
        <span>🧮</span>
        <span>Interactive Enterprise CIDR & AWS IPAM Allocator</span>
      </div>
      <div class="flex gap-2">
        <span class="badge-sme">SME Tool</span>
        <span class="badge-aws">AWS VPC Engine</span>
      </div>
    </div>

    <p class="text-sm text-[var(--vp-c-text-2)] mb-4">
      Eksplorasi kalkulasi binary subnetting, alokasi VLSM enterprise, serta 5 reserved IP bawaan arsitektur AWS VPC.
    </p>

    <!-- Inputs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1">
          Base IP Address
        </label>
        <input v-model="ipInput" type="text" class="ui-input" placeholder="e.g. 10.200.0.0" />
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1">
          CIDR Prefix (/<span class="text-blue-500 font-bold">{{ prefix }}</span>)
        </label>
        <input v-model.number="prefixInput" type="range" min="0" max="32" class="w-full mt-2" />
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1">
          AWS VPC Compliance
        </label>
        <div class="mt-1">
          <span v-if="isAwsValidVpc" class="inline-flex items-center text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded">
            ✓ Valid AWS Subnet (/16 - /28)
          </span>
          <span v-else class="inline-flex items-center text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded">
            ✕ Di luar batas AWS VPC (/16 - /28)
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
        <div class="stat-value text-emerald-400">{{ awsUsableHosts.toLocaleString() }} <span class="text-xs text-[var(--vp-c-text-3)]">IPs</span></div>
      </div>
    </div>

    <!-- Binary Breakdown Visualization -->
    <div class="mb-6 bg-[var(--vp-c-bg-alt)] p-4 rounded-lg border border-[var(--vp-c-divider)]">
      <div class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-2 flex justify-between">
        <span>32-Bit Binary Representation</span>
        <span>Prefix: <span class="text-blue-400 font-mono">/{{ prefix }}</span></span>
      </div>
      <div class="font-mono text-xs md:text-sm tracking-widest break-all">
        <span class="text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded font-bold">{{ binaryOctets.netPart }}</span>
        <span class="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">{{ binaryOctets.hostPart }}</span>
      </div>
      <div class="flex gap-4 mt-2 text-xs text-[var(--vp-c-text-2)]">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-blue-500/30 border border-blue-500"></span>
          <span>Network Bits ({{ prefix }} bits)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500"></span>
          <span>Host Bits ({{ 32 - prefix }} bits = {{ totalAddresses.toLocaleString() }} Total IPs)</span>
        </div>
      </div>
    </div>

    <!-- AWS 5 Reserved IPs Table -->
    <div class="mb-6">
      <h4 class="text-sm font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] mb-2 flex items-center gap-2">
        <span>🏛️</span>
        <span>AWS VPC Reserved IP Allocations (5 IPs per Subnet)</span>
      </h4>
      <div class="overflow-x-auto border border-[var(--vp-c-divider)] rounded-lg">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-[var(--vp-c-bg-alt)] border-b border-[var(--vp-c-divider)]">
              <th class="p-2.5 font-bold text-[var(--vp-c-text-1)]">Reserved IP</th>
              <th class="p-2.5 font-bold text-[var(--vp-c-text-1)]">Peruntukan / Role</th>
              <th class="p-2.5 font-bold text-[var(--vp-c-text-1)]">Penjelasan Arsitektural AWS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in awsReservedIps" :key="idx" class="border-b border-[var(--vp-c-divider)] hover:bg-[var(--vp-c-bg-mute)]">
              <td class="p-2.5 font-mono font-bold text-amber-400">{{ item.ip }}</td>
              <td class="p-2.5 font-semibold text-[var(--vp-c-text-1)]">{{ item.role }}</td>
              <td class="p-2.5 text-[var(--vp-c-text-2)]">{{ item.desc }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Subnet Partitioning / VLSM Slicing Tool -->
    <div class="mb-6 bg-[var(--vp-c-bg-alt)] p-4 rounded-lg border border-[var(--vp-c-divider)]">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
        <h4 class="text-sm font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] flex items-center gap-2">
          <span>🔪</span>
          <span>VLSM Subnet Partitioning Slicer</span>
        </h4>
        <div class="flex items-center gap-2 text-xs">
          <span>Pecah menjadi subnet:</span>
          <select v-model.number="splitPrefix" class="ui-input !w-auto !py-1 !px-2 text-xs">
            <option v-for="p in [20, 21, 22, 23, 24, 25, 26, 27, 28]" :key="p" :value="p" :disabled="p <= prefix">
              /{{ p }} ({{ Math.max(0, Math.pow(2, 32 - p) - 5) }} AWS Usable Hosts)
            </option>
          </select>
        </div>
      </div>

      <div v-if="splitSubnets.length > 0" class="overflow-x-auto max-h-56 overflow-y-auto border border-[var(--vp-c-divider)] rounded">
        <table class="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr class="bg-[var(--vp-c-bg-mute)] border-b border-[var(--vp-c-divider)] text-[var(--vp-c-text-1)]">
              <th class="p-2">CIDR Subnet</th>
              <th class="p-2">Usable Range (AWS)</th>
              <th class="p-2">Usable Hosts</th>
              <th class="p-2">Broadcast</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sub, i) in splitSubnets" :key="i" class="border-b border-[var(--vp-c-divider)] hover:bg-[var(--vp-c-bg-soft)]">
              <td class="p-2 font-bold text-blue-400">{{ sub.cidr }}</td>
              <td class="p-2 text-[var(--vp-c-text-2)]">{{ sub.range }}</td>
              <td class="p-2 font-bold text-emerald-400">{{ sub.awsUsable }}</td>
              <td class="p-2 text-[var(--vp-c-text-3)]">{{ sub.broadcast }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-xs text-[var(--vp-c-text-3)] italic py-2">
        Pilih prefix partisi yang lebih besar dari base prefix (/{{ prefix }}) untuk melihat hasil partisi.
      </div>
    </div>

    <!-- CIDR Overlap Tester -->
    <div class="bg-[var(--vp-c-bg-alt)] p-4 rounded-lg border border-[var(--vp-c-divider)]">
      <h4 class="text-sm font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] mb-2 flex items-center gap-2">
        <span>🔍</span>
        <span>CIDR Overlap & Routing Conflict Detector</span>
      </h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="block text-xs text-[var(--vp-c-text-2)] mb-1">VPC A / On-Prem CIDR</label>
          <input v-model="checkIpA" type="text" class="ui-input text-xs" />
        </div>
        <div>
          <label class="block text-xs text-[var(--vp-c-text-2)] mb-1">VPC B / Partner CIDR</label>
          <input v-model="checkIpB" type="text" class="ui-input text-xs" />
        </div>
      </div>
      <div :class="[
        'p-3 rounded text-xs font-semibold leading-relaxed border',
        overlapResult.overlap ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      ]">
        {{ overlapResult.msg }}
      </div>
    </div>
  </div>
</template>
