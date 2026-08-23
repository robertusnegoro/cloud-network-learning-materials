<script setup lang="ts">
import { ref, computed } from 'vue'

const srcIp = ref('10.10.1.25')
const dstIp = ref('192.168.100.50')

const dxState = ref<'UP' | 'DOWN'>('UP')
const vpnState = ref<'UP' | 'DOWN'>('UP')
const tgwApplianceMode = ref<boolean>(true)

interface RouteEntry {
  prefix: string
  maskLength: number
  target: string
  status: string
}

const vpcRoutes = ref<RouteEntry[]>([
  { prefix: '10.10.0.0/16', maskLength: 16, target: 'local (Nitro VPC Delivery)', status: 'Active (Immutable)' },
  { prefix: '10.0.0.0/8', maskLength: 8, target: 'tgw-attach-01', status: 'Active' },
  { prefix: '192.168.0.0/16', maskLength: 16, target: 'tgw-attach-01', status: 'Active' },
  { prefix: '0.0.0.0/0', maskLength: 0, target: 'nat-0123456789abcdef', status: 'Active' }
])

const tgwRoutes = computed<RouteEntry[]>(() => {
  const list: RouteEntry[] = [
    { prefix: '10.10.0.0/16', maskLength: 16, target: 'vpc-spoke-1', status: 'Propagated' },
    { prefix: '10.20.0.0/16', maskLength: 16, target: 'vpc-spoke-2', status: 'Propagated' },
    { prefix: '10.99.0.0/16', maskLength: 16, target: 'vpc-inspection (GWLB)', status: 'Propagated' }
  ]

  if (dxState.value === 'UP') {
    list.push({ prefix: '192.168.100.0/24', maskLength: 24, target: 'dxgw-transit-vif (AS 64512)', status: 'Active (BGP Best Path)' })
  }
  if (vpnState.value === 'UP') {
    list.push({
      prefix: '192.168.100.0/24',
      maskLength: 24,
      target: 'vpn-backup-tunnel (AS 64512)',
      status: dxState.value === 'UP' ? 'Standby (AS-Prepended / Lower Local-Pref)' : 'Active (Failover Engaged)'
    })
  }

  return list
})

// Check if IP is in CIDR
function ipInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bitsStr] = cidr.split('/')
    const bits = parseInt(bitsStr, 10)
    if (bits === 0) return true

    const ipParts = ip.trim().split('.').map(Number)
    const rangeParts = range.trim().split('.').map(Number)
    if (ipParts.length !== 4 || rangeParts.length !== 4) return false

    const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
    const rangeInt = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3]
    const mask = bits === 0 ? 0 : (~0 << (32 - bits))

    return (ipInt & mask) === (rangeInt & mask)
  } catch {
    return false
  }
}

// LPM Trie Candidates evaluation
const lpmMatches = computed(() => {
  const allCandidates: { prefix: string; maskLength: number; target: string; isMatch: boolean; scope: 'VPC' | 'TGW' }[] = []

  vpcRoutes.value.forEach(r => {
    allCandidates.push({
      prefix: r.prefix,
      maskLength: r.maskLength,
      target: r.target,
      isMatch: ipInCidr(dstIp.value, r.prefix),
      scope: 'VPC'
    })
  })

  tgwRoutes.value.forEach(r => {
    allCandidates.push({
      prefix: r.prefix,
      maskLength: r.maskLength,
      target: r.target,
      isMatch: ipInCidr(dstIp.value, r.prefix),
      scope: 'TGW'
    })
  })

  const matched = allCandidates.filter(c => c.isMatch).sort((a, b) => b.maskLength - a.maskLength)
  const winningPrefix = matched[0] || null

  return {
    candidates: allCandidates,
    matched,
    winningPrefix
  }
})

const simulationResult = computed(() => {
  const steps: string[] = []
  let reached = false
  let failureReason = ''

  steps.push(`[VPC Subnet Lookup] Mengevaluasi paket dari ${srcIp.value} ke ${dstIp.value}`)

  // LPM on VPC Route Table
  if (dstIp.value.startsWith('10.10.')) {
    steps.push(`[LPM Match: /16] Matched '10.10.0.0/16' -> Target: local (L2 Nitro Intra-VPC Delivery)`)
    reached = true
  } else if (dstIp.value.startsWith('192.168.')) {
    steps.push(`[LPM Match: /16] Matched '192.168.0.0/16' -> Target: tgw-attach-01 (Forwarding to AWS Transit Gateway)`)
    
    // TGW Lookup
    steps.push(`[TGW Route Table Lookup] Memeriksa TGW Spoke Association Table (LPM /24)...`)
    
    if (dxState.value === 'UP') {
      steps.push(`[TGW Forwarding] TGW Best Path: dxgw-transit-vif (Direct Connect Dedicated Circuit)`)
      steps.push(`[Transport Layer] 802.1Q Encapsulation + AWS Private Backbone ➔ On-Prem Router`)
      reached = true
    } else if (vpnState.value === 'UP') {
      steps.push(`[Failover Event] Direct Connect DOWN! Failover otomatis dialihkan ke IPSec Backup VPN Tunnel.`)
      steps.push(`[TGW Forwarding] TGW Path: vpn-backup-tunnel via AWS Accelerated Site-to-Site VPN`)
      reached = true
    } else {
      steps.push(`[CRITICAL DROP] Direct Connect DOWN dan Backup VPN DOWN!`)
      failureReason = 'BGP Route Black Hole: Tidak ada route aktif menuju 192.168.100.0/24 di TGW.'
    }
  } else if (dstIp.value === '0.0.0.0' || !dstIp.value.startsWith('10.')) {
    steps.push(`[LPM Match: /0] Matched '0.0.0.0/0' -> Target: nat-0123456789abcdef (Egress to Internet via NAT Gateway)`)
    reached = true
  } else {
    steps.push(`[LPM Match: /8] Matched '10.0.0.0/8' -> Target: tgw-attach-01`)
    reached = true
  }

  return { reached, steps, failureReason }
})
</script>

<template>
  <div class="interactive-card">
    <!-- Header -->
    <div class="interactive-card-header">
      <div class="interactive-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="m10 15 5-3-5-3v6Z"/>
        </svg>
        <span>AWS Hybrid Routing & Direct Connect Failover Sandbox</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge-aws">TGW & DXGW Engine</span>
        <span class="badge-sme">LPM Resolver</span>
      </div>
    </div>

    <p class="interactive-desc">
      Uji skenario routing multi-VPC, resolusi <em>Longest Prefix Match (LPM)</em> Radix Tree, serta simulasi failover seketika ketika link Direct Connect mengalami degradasi/down ke VPN backup.
    </p>

    <!-- Circuit State Toggles -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
      <div class="bg-[var(--vp-c-bg-alt)] p-3.5 rounded-xl border border-[var(--vp-c-divider)] flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-[var(--vp-c-text-3)] font-mono">Primary Circuit</div>
          <div class="text-xs font-bold text-[var(--vp-c-text-1)]">Direct Connect Transit VIF</div>
        </div>
        <button
          :class="[
            'text-xs font-mono font-bold px-3 py-1.5 rounded-md transition-all shadow-sm',
            dxState === 'UP' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          ]"
          @click="dxState = dxState === 'UP' ? 'DOWN' : 'UP'"
        >
          {{ dxState }}
        </button>
      </div>

      <div class="bg-[var(--vp-c-bg-alt)] p-3.5 rounded-xl border border-[var(--vp-c-divider)] flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-[var(--vp-c-text-3)] font-mono">Backup Circuit</div>
          <div class="text-xs font-bold text-[var(--vp-c-text-1)]">IPSec Site-to-Site VPN</div>
        </div>
        <button
          :class="[
            'text-xs font-mono font-bold px-3 py-1.5 rounded-md transition-all shadow-sm',
            vpnState === 'UP' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          ]"
          @click="vpnState = vpnState === 'UP' ? 'DOWN' : 'UP'"
        >
          {{ vpnState }}
        </button>
      </div>

      <div class="bg-[var(--vp-c-bg-alt)] p-3.5 rounded-xl border border-[var(--vp-c-divider)] flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-[var(--vp-c-text-3)] font-mono">TGW Inspection Feature</div>
          <div class="text-xs font-bold text-[var(--vp-c-text-1)]">Appliance Mode</div>
        </div>
        <button
          :class="[
            'text-xs font-mono font-bold px-3 py-1.5 rounded-md transition-all shadow-sm',
            tgwApplianceMode ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
          ]"
          @click="tgwApplianceMode = !tgwApplianceMode"
        >
          {{ tgwApplianceMode ? 'ENABLED' : 'DISABLED' }}
        </button>
      </div>
    </div>

    <!-- Packet Injection Inputs -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1.5">
          Source Packet IP (Spoke VPC Instance)
        </label>
        <input v-model="srcIp" type="text" class="ui-input text-xs font-mono" />
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1.5">
          Destination Packet IP (On-Premises Target)
        </label>
        <input v-model="dstIp" type="text" class="ui-input text-xs font-mono" />
      </div>
    </div>

    <!-- Longest Prefix Match (LPM) Radix Trie Evaluator -->
    <div class="bg-[var(--vp-c-bg-alt)] p-4 rounded-xl border border-[var(--vp-c-divider)] mb-6">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] flex items-center gap-1.5 font-mono">
          <svg width="16" height="16" class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          LPM Radix Trie Match Inspector for {{ dstIp }}
        </span>
        <span v-if="lpmMatches.winningPrefix" class="badge-sme !bg-emerald-600 !text-white border-none text-[11px]">
          Winner: {{ lpmMatches.winningPrefix.prefix }} (/{{ lpmMatches.winningPrefix.maskLength }})
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <div
          v-for="c in lpmMatches.candidates"
          :key="c.prefix + c.scope"
          :class="[
            'p-2.5 rounded-lg border font-mono text-xs transition-all',
            lpmMatches.winningPrefix?.prefix === c.prefix
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold shadow-sm ring-1 ring-emerald-500/50'
              : c.isMatch
              ? 'bg-blue-500/10 border-blue-400/40 text-blue-300'
              : 'bg-[var(--vp-c-bg)] border-[var(--vp-c-divider)] text-[var(--vp-c-text-3)] opacity-50'
          ]"
        >
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold">{{ c.prefix }}</span>
            <span class="text-[10px] uppercase px-1 py-0.2 rounded bg-[var(--vp-c-bg-soft)] border border-[var(--vp-c-divider)]">{{ c.scope }}</span>
          </div>
          <div class="text-[10px] truncate">{{ c.target }}</div>
          <div class="text-[9px] mt-1 font-sans">
            {{ lpmMatches.winningPrefix?.prefix === c.prefix ? '★ Longest Match (/ ' + c.maskLength + ' bits)' : c.isMatch ? '✔ Encompassing (/ ' + c.maskLength + ' bits)' : '✖ No Match' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Route Tables Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <!-- VPC Route Table -->
      <div class="border border-[var(--vp-c-divider)] rounded-xl overflow-hidden bg-[var(--vp-c-bg-alt)]">
        <div class="bg-[var(--vp-c-bg-soft)] p-2.5 border-b border-[var(--vp-c-divider)] text-xs font-bold text-[var(--vp-c-text-1)] flex justify-between items-center">
          <span>VPC Spoke Route Table (rtb-0123)</span>
          <span class="text-[10px] text-blue-400 font-mono font-bold">Local VPC</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr class="bg-[var(--vp-c-bg)] border-b border-[var(--vp-c-divider)] text-[var(--vp-c-text-2)] text-[11px]">
                <th class="p-2.5 whitespace-nowrap">Destination Prefix</th>
                <th class="p-2.5 whitespace-nowrap">Target</th>
                <th class="p-2.5 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in vpcRoutes" :key="i" class="border-b border-[var(--vp-c-divider)]">
                <td class="p-2.5 text-blue-400 font-bold whitespace-nowrap">{{ r.prefix }}</td>
                <td class="p-2.5 text-[var(--vp-c-text-1)] whitespace-nowrap">{{ r.target }}</td>
                <td class="p-2.5 text-[var(--vp-c-text-3)] text-[11px] whitespace-nowrap">{{ r.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TGW Route Table -->
      <div class="border border-[var(--vp-c-divider)] rounded-xl overflow-hidden bg-[var(--vp-c-bg-alt)]">
        <div class="bg-[var(--vp-c-bg-soft)] p-2.5 border-b border-[var(--vp-c-divider)] text-xs font-bold text-[var(--vp-c-text-1)] flex justify-between items-center">
          <span>TGW Core Route Table (tgw-rtb-0abc)</span>
          <span class="text-[10px] text-purple-400 font-mono font-bold">TGW Fabric</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr class="bg-[var(--vp-c-bg)] border-b border-[var(--vp-c-divider)] text-[var(--vp-c-text-2)] text-[11px]">
                <th class="p-2.5 whitespace-nowrap">Destination Prefix</th>
                <th class="p-2.5 whitespace-nowrap">Next Hop</th>
                <th class="p-2.5 whitespace-nowrap">BGP Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in tgwRoutes" :key="i" class="border-b border-[var(--vp-c-divider)]">
                <td class="p-2.5 text-purple-400 font-bold whitespace-nowrap">{{ r.prefix }}</td>
                <td class="p-2.5 text-[var(--vp-c-text-1)] whitespace-nowrap">{{ r.target }}</td>
                <td class="p-2.5 text-[11px] whitespace-nowrap" :class="r.status.includes('Active') ? 'text-emerald-400 font-bold' : 'text-[var(--vp-c-text-3)]'">
                  {{ r.status }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Execution Simulation Trace -->
    <div class="terminal-window">
      <div class="terminal-header">
        <div class="terminal-dots">
          <div class="terminal-dot dot-red"></div>
          <div class="terminal-dot dot-yellow"></div>
          <div class="terminal-dot dot-green"></div>
        </div>
        <span class="terminal-title">AWS Route Engine Trace & Forwarding Decision</span>
      </div>
      <div class="terminal-body space-y-1.5">
        <div v-for="(step, idx) in simulationResult.steps" :key="idx" class="text-xs font-mono text-gray-300">
          {{ step }}
        </div>
        <div v-if="simulationResult.failureReason" class="mt-2.5 text-xs font-mono text-rose-400 font-bold bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/80">
          ✖ {{ simulationResult.failureReason }}
        </div>
        <div v-else-if="simulationResult.reached" class="mt-2.5 text-xs font-mono text-emerald-400 font-bold bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-800/40">
          FORWARDING SUCCESS: Packet berhasil diteruskan ke destination target melalui active path.
        </div>
      </div>
    </div>
  </div>
</template>


