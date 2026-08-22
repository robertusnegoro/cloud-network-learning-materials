<script setup lang="ts">
import { ref, computed } from 'vue'

const selectedInstance = ref<'small' | 'medium' | 'large' | 'metal'>('medium')
const concurrentConns = ref(350000)
const untrackedRatio = ref(20)
const natCount = ref(2)
const secondaryIps = ref(1)

const maxInstanceConntrack = computed(() => {
  if (selectedInstance.value === 'small') return 250000
  if (selectedInstance.value === 'medium') return 500000
  if (selectedInstance.value === 'large') return 1000000
  return 2000000
})

const trackedConnections = computed(() => {
  return Math.round(concurrentConns.value * (1 - untrackedRatio.value / 100))
})

const conntrackUtilPercent = computed(() => {
  return Math.min(100, Math.round((trackedConnections.value / maxInstanceConntrack.value) * 100))
})

const conntrackStatusText = computed(() => {
  if (conntrackUtilPercent.value > 85) return 'text-rose-400'
  if (conntrackUtilPercent.value > 65) return 'text-amber-400'
  return 'text-emerald-400'
})

const conntrackStatusBorder = computed(() => {
  if (conntrackUtilPercent.value > 85) return 'border-rose-500/40 bg-rose-950/10'
  if (conntrackUtilPercent.value > 65) return 'border-amber-500/40 bg-amber-950/10'
  return 'border-emerald-500/40 bg-emerald-950/10'
})

const totalIpsPerNat = computed(() => 1 + secondaryIps.value)
const totalNatPorts = computed(() => natCount.value * totalIpsPerNat.value * 64512)

const natPortUtilPercent = computed(() => {
  // Assuming 60% of connections go out via NAT GW
  const egressNatConns = Math.round(concurrentConns.value * 0.6)
  return Math.min(100, Math.round((egressNatConns / totalNatPorts.value) * 100))
})

const natStatusText = computed(() => {
  if (natPortUtilPercent.value > 80) return 'text-rose-400'
  if (natPortUtilPercent.value > 60) return 'text-amber-400'
  return 'text-emerald-400'
})

const natStatusBorder = computed(() => {
  if (natPortUtilPercent.value > 80) return 'border-rose-500/40 bg-rose-950/10'
  if (natPortUtilPercent.value > 60) return 'border-amber-500/40 bg-amber-950/10'
  return 'border-blue-500/40 bg-blue-950/10'
})

const natStatusMessage = computed(() => {
  if (natPortUtilPercent.value > 80) return 'Tingkat bahaya tinggi: risiko ErrorPortAllocation!'
  if (natPortUtilPercent.value > 60) return 'Waspada: Port mendekati batas rekomendasi.'
  return 'Kapasitas SNAT port aman dan optimal.'
})

function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}
</script>

<template>
  <div class="interactive-card">
    <!-- Header -->
    <div class="interactive-card-header">
      <div class="interactive-title">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Security Group Conntrack & NAT Gateway Port Calculator</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge-sme">SME Tool</span>
        <span class="badge-aws">Nitro & Hyperplane</span>
      </div>
    </div>

    <p class="interactive-desc">
      Kalkulator kapasitas connection tracking Nitro Card, saturasi port SNAT NAT Gateway, dan mitigasi `ErrorPortAllocation`.
    </p>

    <!-- Inputs Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- EC2 Instance Type -->
      <div class="p-3.5 bg-[var(--vp-c-bg-alt)] rounded-xl border border-[var(--vp-c-divider)]">
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-2">
          EC2 Instance Size / Family
        </label>
        <select v-model="selectedInstance" class="ui-input !py-1.5 text-xs font-mono">
          <option value="small">Small (t3.small / c6i.large) ~ 250k Conntrack</option>
          <option value="medium">Medium (c6i.4xlarge / m6i.4xlarge) ~ 500k Conntrack</option>
          <option value="large">Large (c6i.16xlarge / c7g.16xlarge) ~ 1M Conntrack</option>
          <option value="metal">Metal / 32xlarge (2M+ Conntrack)</option>
        </select>
        <p class="text-[11px] text-[var(--vp-c-text-3)] mt-2 leading-relaxed">
          Setiap instance Nitro memiliki kuota hard limit pelacakan koneksi stateful (tracked connections).
        </p>
      </div>

      <!-- Concurrent Connections -->
      <div class="p-3.5 bg-[var(--vp-c-bg-alt)] rounded-xl border border-[var(--vp-c-divider)]">
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1 flex justify-between">
          <span>Active Connections</span>
          <span class="font-mono text-purple-400 font-bold">{{ formatNumber(concurrentConns) }}</span>
        </label>
        <input type="range" min="10000" max="2000000" step="10000" v-model.number="concurrentConns" class="w-full mb-2" />
        
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1 flex justify-between">
          <span>% Untracked Flow (0.0.0.0/0)</span>
          <span class="font-mono text-emerald-400 font-bold">{{ untrackedRatio }}%</span>
        </label>
        <input type="range" min="0" max="100" step="5" v-model.number="untrackedRatio" class="w-full" />
      </div>

      <!-- NAT Gateway Architecture -->
      <div class="p-3.5 bg-[var(--vp-c-bg-alt)] rounded-xl border border-[var(--vp-c-divider)]">
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1 flex justify-between">
          <span>NAT Gateways (AZs)</span>
          <span class="font-mono text-blue-400 font-bold">{{ natCount }}</span>
        </label>
        <input type="range" min="1" max="4" v-model.number="natCount" class="w-full mb-2" />
        
        <label class="block text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-1 flex justify-between">
          <span>Secondary IPs / NAT GW</span>
          <span class="font-mono text-blue-400 font-bold">{{ secondaryIps }}</span>
        </label>
        <input type="range" min="0" max="7" v-model.number="secondaryIps" class="w-full" />
      </div>
    </div>

    <!-- Metric Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- Conntrack Utilization -->
      <div class="p-4 bg-[var(--vp-c-bg-alt)] rounded-xl border" :class="conntrackStatusBorder">
        <span class="text-xs text-[var(--vp-c-text-2)] font-semibold block">Nitro Conntrack Utilization:</span>
        <div class="text-2xl font-bold font-mono mt-1" :class="conntrackStatusText">
          {{ conntrackUtilPercent }}%
        </div>
        <div class="w-full bg-[var(--vp-c-bg)] h-2 rounded-full overflow-hidden my-2 border border-[var(--vp-c-divider)]">
          <div class="h-full transition-all duration-300" :class="conntrackUtilPercent > 80 ? 'bg-rose-500' : conntrackUtilPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'" :style="{ width: `${conntrackUtilPercent}%` }"></div>
        </div>
        <span class="text-[11px] block text-[var(--vp-c-text-3)] font-mono">
          {{ formatNumber(trackedConnections) }} tracked / {{ formatNumber(maxInstanceConntrack) }} max
        </span>
      </div>

      <!-- NAT Port Capacity -->
      <div class="p-4 bg-[var(--vp-c-bg-alt)] rounded-xl border" :class="natStatusBorder">
        <span class="text-xs text-[var(--vp-c-text-2)] font-semibold block">NAT SNAT Total Port Pool:</span>
        <div class="text-2xl font-bold font-mono mt-1 text-blue-400">
          {{ formatNumber(totalNatPorts) }}
        </div>
        <span class="text-[11px] block mt-2 text-[var(--vp-c-text-3)] font-mono leading-relaxed">
          {{ totalIpsPerNat }} IP per NAT GW × {{ natCount }} NAT GWs (64,512/IP)
        </span>
      </div>

      <!-- NAT Port Saturation -->
      <div class="p-4 bg-[var(--vp-c-bg-alt)] rounded-xl border" :class="natStatusBorder">
        <span class="text-xs text-[var(--vp-c-text-2)] font-semibold block">Egress NAT Port Saturation:</span>
        <div class="text-2xl font-bold font-mono mt-1" :class="natStatusText">
          {{ natPortUtilPercent }}%
        </div>
        <div class="w-full bg-[var(--vp-c-bg)] h-2 rounded-full overflow-hidden my-2 border border-[var(--vp-c-divider)]">
          <div class="h-full transition-all duration-300" :class="natPortUtilPercent > 80 ? 'bg-rose-500' : natPortUtilPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'" :style="{ width: `${natPortUtilPercent}%` }"></div>
        </div>
        <span class="text-[11px] block text-[var(--vp-c-text-3)]">
          {{ natStatusMessage }}
        </span>
      </div>
    </div>

    <!-- Recommendations & Engineering Insights -->
    <div class="p-4 rounded-xl bg-[var(--vp-c-bg-alt)] border border-[var(--vp-c-divider)] text-xs text-[var(--vp-c-text-2)] leading-relaxed">
      <h4 class="font-bold text-[var(--vp-c-text-1)] mb-2 flex items-center gap-1.5">
        <svg class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Rekomendasi Principal Network Engineer:
      </h4>
      <ul class="list-disc list-inside space-y-1.5">
        <li>
          <strong>Untracked Connections:</strong> Untuk koneksi TCP bertrafik tinggi, buat Security Group rule yang mengizinkan inbound dan outbound ke <code>0.0.0.0/0</code> atau CIDR spesifik pada port yang sama untuk bypass tabel conntrack Nitro secara otomatis.
        </li>
        <li>
          <strong>ErrorPortAllocation Prevention:</strong> Jika port utilisasi NAT Gateway melebihi 70%, asosiasikan hingga <strong>7 Secondary Elastic IPs</strong> per NAT Gateway untuk meningkatkan kapasitas hingga 516.096 koneksi TCP per NAT GW.
        </li>
        <li>
          <strong>Linux Kernel Conntrack:</strong> Pada NAT instances atau router VM, pastikan <code>net.netfilter.nf_conntrack_max</code> diset minimal 2x dari estimasi koneksi maksimum (<code>sysctl -w net.netfilter.nf_conntrack_max=1048576</code>).
        </li>
      </ul>
    </div>
  </div>
</template>

