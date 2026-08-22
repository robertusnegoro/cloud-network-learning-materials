<template>
  <div class="conntrack-calc-container p-6 bg-[var(--vp-c-bg-soft)] rounded-xl border border-[var(--vp-c-divider)] my-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-bold text-[var(--vp-c-text-1)] flex items-center gap-2">
          🛡️ Security Group Conntrack & NAT Gateway Port Calculator
        </h3>
        <p class="text-xs text-[var(--vp-c-text-2)] mt-1">
          Kalkulator kapasitas connection tracking Nitro Card, saturasi port SNAT NAT Gateway, dan mitigasi `ErrorPortAllocation`.
        </p>
      </div>
      <span class="px-2.5 py-1 text-xs font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
        Nitro Underlay & Hyperplane
      </span>
    </div>

    <!-- Inputs Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- EC2 Instance Type -->
      <div class="p-3 bg-[var(--vp-c-bg-alt)] rounded-lg border border-[var(--vp-c-divider)]">
        <label class="block text-xs font-semibold text-[var(--vp-c-text-2)] mb-2">
          EC2 Instance Size / Family
        </label>
        <select v-model="selectedInstance" class="w-full text-xs p-2 rounded bg-[var(--vp-c-bg)] border border-[var(--vp-c-divider)] text-[var(--vp-c-text-1)]">
          <option value="small">Small (t3.small / c6i.large) ~ 250k Conntrack</option>
          <option value="medium">Medium (c6i.4xlarge / m6i.4xlarge) ~ 500k Conntrack</option>
          <option value="large">Large (c6i.16xlarge / c7g.16xlarge) ~ 1M Conntrack</option>
          <option value="metal">Metal / 32xlarge (2M+ Conntrack)</option>
        </select>
        <p class="text-[10px] text-[var(--vp-c-text-3)] mt-2">
          Setiap instance Nitro memiliki kuota hard limit pelacakan koneksi stateful (tracked connections).
        </p>
      </div>

      <!-- Concurrent Connections -->
      <div class="p-3 bg-[var(--vp-c-bg-alt)] rounded-lg border border-[var(--vp-c-divider)]">
        <label class="block text-xs font-semibold text-[var(--vp-c-text-2)] mb-1">
          Concurrent Active Connections: <span class="font-bold text-purple-400">{{ formatNumber(concurrentConns) }}</span>
        </label>
        <input type="range" min="10000" max="2000000" step="10000" v-model.number="concurrentConns" class="w-full mb-2" />
        
        <label class="block text-xs font-semibold text-[var(--vp-c-text-2)] mb-1">
          % Untracked Flow (TCP In+Out Allowed 0.0.0.0/0): <span class="font-bold text-emerald-400">{{ untrackedRatio }}%</span>
        </label>
        <input type="range" min="0" max="100" step="5" v-model.number="untrackedRatio" class="w-full" />
      </div>

      <!-- NAT Gateway Architecture -->
      <div class="p-3 bg-[var(--vp-c-bg-alt)] rounded-lg border border-[var(--vp-c-divider)]">
        <label class="block text-xs font-semibold text-[var(--vp-c-text-2)] mb-1">
          NAT Gateway Count (AZs): <span class="font-bold text-blue-400">{{ natCount }}</span>
        </label>
        <input type="range" min="1" max="4" v-model.number="natCount" class="w-full mb-2" />
        
        <label class="block text-xs font-semibold text-[var(--vp-c-text-2)] mb-1">
          Secondary Elastic IPs per NAT GW: <span class="font-bold text-blue-400">{{ secondaryIps }}</span>
        </label>
        <input type="range" min="0" max="7" v-model.number="secondaryIps" class="w-full" />
      </div>
    </div>

    <!-- Metric Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- Conntrack Utilization -->
      <div class="p-4 bg-[var(--vp-c-bg-alt)] rounded-lg border" :class="conntrackStatusBorder">
        <span class="text-xs text-[var(--vp-c-text-2)] block">Nitro Conntrack Utilization:</span>
        <div class="text-2xl font-bold font-mono mt-1" :class="conntrackStatusText">
          {{ conntrackUtilPercent }}%
        </div>
        <span class="text-[11px] block mt-1 text-[var(--vp-c-text-3)]">
          {{ formatNumber(trackedConnections) }} tracked / {{ formatNumber(maxInstanceConntrack) }} limit
        </span>
      </div>

      <!-- NAT Port Capacity -->
      <div class="p-4 bg-[var(--vp-c-bg-alt)] rounded-lg border" :class="natStatusBorder">
        <span class="text-xs text-[var(--vp-c-text-2)] block">NAT SNAT Total Port Pool:</span>
        <div class="text-2xl font-bold font-mono mt-1 text-blue-400">
          {{ formatNumber(totalNatPorts) }} ports
        </div>
        <span class="text-[11px] block mt-1 text-[var(--vp-c-text-3)]">
          {{ totalIpsPerNat }} IP per NAT GW × {{ natCount }} NAT GWs (64,512/IP)
        </span>
      </div>

      <!-- NAT Port Saturation -->
      <div class="p-4 bg-[var(--vp-c-bg-alt)] rounded-lg border" :class="natStatusBorder">
        <span class="text-xs text-[var(--vp-c-text-2)] block">Egress NAT Port Saturation:</span>
        <div class="text-2xl font-bold font-mono mt-1" :class="natStatusText">
          {{ natPortUtilPercent }}%
        </div>
        <span class="text-[11px] block mt-1 text-[var(--vp-c-text-3)]">
          {{ natStatusMessage }}
        </span>
      </div>
    </div>

    <!-- Recommendations & Engineering Insights -->
    <div class="p-4 rounded-lg bg-[var(--vp-c-bg)] border border-[var(--vp-c-divider)] text-xs text-[var(--vp-c-text-2)] leading-relaxed">
      <h4 class="font-bold text-[var(--vp-c-text-1)] mb-2 flex items-center gap-1.5">
        💡 Rekomendasi Principal Network Engineer:
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
  if (natPortUtilPercent.value > 80) return '🚨 Tingkat bahaya tinggi: risiko ErrorPortAllocation!'
  if (natPortUtilPercent.value > 60) return '⚠️ Waspada: Port mendekati batas rekomendasi.'
  return '✅ Kapasitas SNAT port aman dan optimal.'
})

function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}
</script>
