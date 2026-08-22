<script setup lang="ts">
import { ref, computed } from 'vue'

const srcIp = ref('10.10.1.25')
const dstIp = ref('192.168.100.50')

const dxState = ref<'UP' | 'DOWN'>('UP')
const vpnState = ref<'UP' | 'DOWN'>('UP')
const tgwApplianceMode = ref<boolean>(true)
const asymmetricCheck = ref<boolean>(false)

interface RouteEntry {
  prefix: string
  target: string
  status: string
}

const vpcRoutes = ref<RouteEntry[]>([
  { prefix: '10.10.0.0/16', target: 'local', status: 'Active (Immutable)' },
  { prefix: '10.0.0.0/8', target: 'tgw-attach-01', status: 'Active' },
  { prefix: '192.168.0.0/16', target: 'tgw-attach-01', status: 'Active' },
  { prefix: '0.0.0.0/0', target: 'nat-0123456789abcdef', status: 'Active' }
])

const tgwRoutes = computed<RouteEntry[]>(() => {
  const list: RouteEntry[] = [
    { prefix: '10.10.0.0/16', target: 'vpc-spoke-1', status: 'Propagated' },
    { prefix: '10.20.0.0/16', target: 'vpc-spoke-2', status: 'Propagated' },
    { prefix: '10.99.0.0/16', target: 'vpc-inspection (GWLB)', status: 'Propagated' }
  ]

  if (dxState.value === 'UP') {
    list.push({ prefix: '192.168.100.0/24', target: 'dxgw-transit-vif (AS 64512)', status: 'Active (BGP Best Path)' })
  }
  if (vpnState.value === 'UP') {
    list.push({
      prefix: '192.168.100.0/24',
      target: 'vpn-backup-tunnel (AS 64512)',
      status: dxState.value === 'UP' ? 'Standby (AS-Prepended / Lower Local-Pref)' : 'Active (Failover Engaged)'
    })
  }

  return list
})

const simulationResult = computed(() => {
  const steps: string[] = []
  let reached = false
  let failureReason = ''

  steps.push(`[VPC Subnet Lookup] Mengevaluasi paket dari ${srcIp.value} ke ${dstIp.value}`)

  // LPM on VPC Route Table
  if (dstIp.value.startsWith('10.10.')) {
    steps.push(`✔ Matched '10.10.0.0/16' -> Target: local (L2 Nitro Intra-VPC Delivery)`)
    reached = true
  } else if (dstIp.value.startsWith('192.168.')) {
    steps.push(`✔ Matched '192.168.0.0/16' -> Target: tgw-attach-01 (Forwarding to AWS Transit Gateway)`)
    
    // TGW Lookup
    steps.push(`[TGW Route Table Lookup] Memeriksa TGW Spoke Association Table...`)
    
    if (dxState.value === 'UP') {
      steps.push(`✔ TGW Best Path: dxgw-transit-vif (Direct Connect Dedicated Circuit)`)
      steps.push(`✔ Transport: 802.1Q Encapsulation + AWS Private Backbone ➔ On-Prem Router`)
      reached = true
    } else if (vpnState.value === 'UP') {
      steps.push(`⚠️ Direct Connect DOWN! Failover otomatis dialihkan ke IPSec Backup VPN Tunnel.`)
      steps.push(`✔ TGW Path: vpn-backup-tunnel via AWS Accelerated Site-to-Site VPN`)
      reached = true
    } else {
      steps.push(`✖ CRITICAL: Direct Connect DOWN dan Backup VPN DOWN!`)
      failureReason = 'BGP Route Black Hole: Tidak ada route aktif menuju 192.168.100.0/24 di TGW.'
    }
  } else if (dstIp.value === '0.0.0.0' || !dstIp.value.startsWith('10.')) {
    steps.push(`✔ Matched '0.0.0.0/0' -> Target: nat-0123456789abcdef (Egress to Internet via NAT Gateway)`)
    reached = true
  } else {
    steps.push(`✔ Matched '10.0.0.0/8' -> Target: tgw-attach-01`)
    reached = true
  }

  return { reached, steps, failureReason }
})
</script>

<template>
  <div class="interactive-card">
    <div class="interactive-card-header">
      <div class="interactive-title">
        <span>🧪</span>
        <span>AWS Hybrid Routing & Direct Connect Failover Sandbox</span>
      </div>
      <div class="flex gap-2">
        <span class="badge-aws">TGW & DXGW Engine</span>
        <span class="badge-sme">LPM Resolver</span>
      </div>
    </div>

    <p class="text-sm text-[var(--vp-c-text-2)] mb-4">
      Uji skenario routing multi-VPC, resolusi <em>Longest Prefix Match (LPM)</em>, serta simulasi failover seketika ketika link Direct Connect mengalami degradasi/down ke VPN backup.
    </p>

    <!-- Circuit State Toggles -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      <div class="bg-[var(--vp-c-bg-alt)] p-3 rounded-lg border border-[var(--vp-c-divider)] flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-[var(--vp-c-text-3)]">Primary Circuit</div>
          <div class="text-xs font-bold text-[var(--vp-c-text-1)]">Direct Connect Transit VIF</div>
        </div>
        <button
          :class="[
            'text-xs font-bold px-3 py-1 rounded transition-all',
            dxState === 'UP' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          ]"
          @click="dxState = dxState === 'UP' ? 'DOWN' : 'UP'"
        >
          {{ dxState }}
        </button>
      </div>

      <div class="bg-[var(--vp-c-bg-alt)] p-3 rounded-lg border border-[var(--vp-c-divider)] flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-[var(--vp-c-text-3)]">Backup Circuit</div>
          <div class="text-xs font-bold text-[var(--vp-c-text-1)]">IPSec Site-to-Site VPN</div>
        </div>
        <button
          :class="[
            'text-xs font-bold px-3 py-1 rounded transition-all',
            vpnState === 'UP' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          ]"
          @click="vpnState = vpnState === 'UP' ? 'DOWN' : 'UP'"
        >
          {{ vpnState }}
        </button>
      </div>

      <div class="bg-[var(--vp-c-bg-alt)] p-3 rounded-lg border border-[var(--vp-c-divider)] flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-[var(--vp-c-text-3)]">TGW Inspection Feature</div>
          <div class="text-xs font-bold text-[var(--vp-c-text-1)]">Appliance Mode</div>
        </div>
        <button
          :class="[
            'text-xs font-bold px-3 py-1 rounded transition-all',
            tgwApplianceMode ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
          ]"
          @click="tgwApplianceMode = !tgwApplianceMode"
        >
          {{ tgwApplianceMode ? 'ENABLED' : 'DISABLED' }}
        </button>
      </div>
    </div>

    <!-- Packet Injection Inputs -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1">
          Source Packet IP (Spoke VPC Instance)
        </label>
        <input v-model="srcIp" type="text" class="ui-input text-xs" />
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1">
          Destination Packet IP (On-Premises Target)
        </label>
        <input v-model="dstIp" type="text" class="ui-input text-xs" />
      </div>
    </div>

    <!-- Route Tables Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <!-- VPC Route Table -->
      <div class="border border-[var(--vp-c-divider)] rounded-lg overflow-hidden">
        <div class="bg-[var(--vp-c-bg-alt)] p-2.5 border-b border-[var(--vp-c-divider)] text-xs font-bold text-[var(--vp-c-text-1)] flex justify-between">
          <span>VPC Spoke Route Table (rtb-0123)</span>
          <span class="text-[10px] text-blue-400 font-mono">Local VPC</span>
        </div>
        <table class="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr class="bg-[var(--vp-c-bg-mute)] border-b border-[var(--vp-c-divider)] text-[var(--vp-c-text-2)]">
              <th class="p-2">Destination Prefix</th>
              <th class="p-2">Target</th>
              <th class="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in vpcRoutes" :key="i" class="border-b border-[var(--vp-c-divider)]">
              <td class="p-2 text-blue-400 font-bold">{{ r.prefix }}</td>
              <td class="p-2 text-[var(--vp-c-text-1)]">{{ r.target }}</td>
              <td class="p-2 text-[var(--vp-c-text-3)]">{{ r.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TGW Route Table -->
      <div class="border border-[var(--vp-c-divider)] rounded-lg overflow-hidden">
        <div class="bg-[var(--vp-c-bg-alt)] p-2.5 border-b border-[var(--vp-c-divider)] text-xs font-bold text-[var(--vp-c-text-1)] flex justify-between">
          <span>TGW Core Spoke Route Table (tgw-rtb-0abc)</span>
          <span class="text-[10px] text-purple-400 font-mono">TGW Fabric</span>
        </div>
        <table class="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr class="bg-[var(--vp-c-bg-mute)] border-b border-[var(--vp-c-divider)] text-[var(--vp-c-text-2)]">
              <th class="p-2">Destination Prefix</th>
              <th class="p-2">Next Hop Attachment</th>
              <th class="p-2">BGP Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in tgwRoutes" :key="i" class="border-b border-[var(--vp-c-divider)]">
              <td class="p-2 text-purple-400 font-bold">{{ r.prefix }}</td>
              <td class="p-2 text-[var(--vp-c-text-1)]">{{ r.target }}</td>
              <td class="p-2 text-[10px]" :class="r.status.includes('Active') ? 'text-emerald-400 font-bold' : 'text-[var(--vp-c-text-3)]'">
                {{ r.status }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Execution Simulation Trace -->
    <div class="terminal-window">
      <div class="terminal-header">
        <div class="flex gap-1.5">
          <div class="terminal-dot dot-red"></div>
          <div class="terminal-dot dot-yellow"></div>
          <div class="terminal-dot dot-green"></div>
        </div>
        <span class="text-xs text-gray-400 font-mono">AWS Route Engine Trace & Forwarding Decision</span>
      </div>
      <div class="terminal-body space-y-1.5">
        <div v-for="(step, idx) in simulationResult.steps" :key="idx" class="text-xs font-mono text-gray-300">
          {{ step }}
        </div>
        <div v-if="simulationResult.failureReason" class="mt-2 text-xs font-mono text-rose-400 font-bold bg-rose-950/40 p-2 rounded border border-rose-800">
          ✖ {{ simulationResult.failureReason }}
        </div>
        <div v-else-if="simulationResult.reached" class="mt-2 text-xs font-mono text-emerald-400 font-bold">
          🎉 FORWARDING SUCCESS: Packet berhasil diteruskan ke tujuan melalui active path.
        </div>
      </div>
    </div>
  </div>
</template>
