<script setup lang="ts">
import { ref, computed } from 'vue'

interface BgpRoute {
  id: string
  name: string
  peerType: 'eBGP' | 'iBGP'
  neighborAs: number
  weight: number
  localPref: number
  locallyOriginated: boolean
  asPath: number[]
  origin: 'IGP' | 'EGP' | 'Incomplete'
  med: number
  igpMetric: number
  routerId: string
  peerIp: string
  community: string
}

const ecmpEnabled = ref(false)

const routes = ref<BgpRoute[]>([
  {
    id: 'path-dx-1',
    name: 'Path A: Primary Direct Connect (DX-1 Equinix JK1)',
    peerType: 'eBGP',
    neighborAs: 64512,
    weight: 100,
    localPref: 200,
    locallyOriginated: false,
    asPath: [64512],
    origin: 'IGP',
    med: 10,
    igpMetric: 10,
    routerId: '169.254.240.1',
    peerIp: '169.254.240.1',
    community: '7224:7100 (Local Region)'
  },
  {
    id: 'path-dx-2',
    name: 'Path B: Secondary Direct Connect (DX-2 DCI Cibitung)',
    peerType: 'eBGP',
    neighborAs: 64512,
    weight: 100,
    localPref: 100,
    locallyOriginated: false,
    asPath: [64512, 64512],
    origin: 'IGP',
    med: 20,
    igpMetric: 10,
    routerId: '169.254.241.1',
    peerIp: '169.254.241.1',
    community: '7224:7200 (Home Region)'
  },
  {
    id: 'path-vpn',
    name: 'Path C: Backup Site-to-Site IPsec VPN (via Internet)',
    peerType: 'eBGP',
    neighborAs: 64512,
    weight: 0,
    localPref: 100,
    locallyOriginated: false,
    asPath: [64512, 64512, 64512],
    origin: 'Incomplete',
    med: 100,
    igpMetric: 50,
    routerId: '169.254.242.1',
    peerIp: '169.254.242.1',
    community: 'None'
  }
])

const originScore = (origin: string) => {
  if (origin === 'IGP') return 3
  if (origin === 'EGP') return 2
  return 1
}

const electionSteps = computed(() => {
  const steps: { stepNum: number; stepName: string; winnerIds: string[]; reason: string; eliminatedIds: string[] }[] = []
  let active = [...routes.value]

  // Step 1: Weight
  const maxWeight = Math.max(...active.map(r => r.weight))
  const afterWeight = active.filter(r => r.weight === maxWeight)
  steps.push({
    stepNum: 1,
    stepName: '1. Weight (Highest wins - Local to Router)',
    winnerIds: afterWeight.map(r => r.id),
    reason: `Max Weight adalah ${maxWeight}. ${afterWeight.length === 1 ? `${afterWeight[0].name} menang mutlak di Step 1.` : `${afterWeight.length} route memiliki weight yang sama.`}`,
    eliminatedIds: active.filter(r => r.weight < maxWeight).map(r => r.id)
  })
  active = afterWeight
  if (active.length === 1) return { steps, bestRoute: active[0], ecmpRoutes: [] }

  // Step 2: Local Preference
  const maxLocalPref = Math.max(...active.map(r => r.localPref))
  const afterLocalPref = active.filter(r => r.localPref === maxLocalPref)
  steps.push({
    stepNum: 2,
    stepName: '2. Local Preference (Highest wins - Advertised within AS)',
    winnerIds: afterLocalPref.map(r => r.id),
    reason: `Max Local-Pref adalah ${maxLocalPref}. ${afterLocalPref.length === 1 ? `${afterLocalPref[0].name} terpilih sebagai Best Path.` : `${afterLocalPref.length} route memiliki Local-Pref identik.`}`,
    eliminatedIds: active.filter(r => r.localPref < maxLocalPref).map(r => r.id)
  })
  active = afterLocalPref
  if (active.length === 1) return { steps, bestRoute: active[0], ecmpRoutes: [] }

  // Step 3: Locally Originated
  const localOrig = active.filter(r => r.locallyOriginated)
  if (localOrig.length > 0 && localOrig.length < active.length) {
    steps.push({
      stepNum: 3,
      stepName: '3. Locally Originated',
      winnerIds: localOrig.map(r => r.id),
      reason: 'Route yang originated secara lokal diprioritaskan dibandingkan route yang dipelajari dari BGP neighbor.',
      eliminatedIds: active.filter(r => !r.locallyOriginated).map(r => r.id)
    })
    active = localOrig
    if (active.length === 1) return { steps, bestRoute: active[0], ecmpRoutes: [] }
  } else {
    steps.push({
      stepNum: 3,
      stepName: '3. Locally Originated',
      winnerIds: active.map(r => r.id),
      reason: 'Semua route memiliki status local origination yang sama (Tie).',
      eliminatedIds: []
    })
  }

  // Step 4: AS-Path Length
  const minAsPath = Math.min(...active.map(r => r.asPath.length))
  const afterAsPath = active.filter(r => r.asPath.length === minAsPath)
  steps.push({
    stepNum: 4,
    stepName: '4. AS-Path Length (Shortest wins - AS Prepending Check)',
    winnerIds: afterAsPath.map(r => r.id),
    reason: `AS-Path terpendek adalah ${minAsPath} hop. ${afterAsPath.length === 1 ? `${afterAsPath[0].name} menang karena shortest AS-Path.` : `${afterAsPath.length} route lolos step ini.`}`,
    eliminatedIds: active.filter(r => r.asPath.length > minAsPath).map(r => r.id)
  })
  active = afterAsPath
  if (active.length === 1) return { steps, bestRoute: active[0], ecmpRoutes: [] }

  // Step 5: Origin Code
  const maxOrigin = Math.max(...active.map(r => originScore(r.origin)))
  const afterOrigin = active.filter(r => originScore(r.origin) === maxOrigin)
  steps.push({
    stepNum: 5,
    stepName: '5. Origin Code (IGP < EGP < Incomplete)',
    winnerIds: afterOrigin.map(r => r.id),
    reason: `Origin code terbaik terpilih. ${afterOrigin.length === 1 ? `${afterOrigin[0].name} menang.` : 'Status Origin identik.'}`,
    eliminatedIds: active.filter(r => originScore(r.origin) < maxOrigin).map(r => r.id)
  })
  active = afterOrigin
  if (active.length === 1) return { steps, bestRoute: active[0], ecmpRoutes: [] }

  // Step 6: MED
  const minMed = Math.min(...active.map(r => r.med))
  const afterMed = active.filter(r => r.med === minMed)
  steps.push({
    stepNum: 6,
    stepName: '6. MED / Multi-Exit Discriminator (Lowest wins)',
    winnerIds: afterMed.map(r => r.id),
    reason: `MED terendah adalah ${minMed}. ${afterMed.length === 1 ? `${afterMed[0].name} terpilih.` : 'MED identik.'}`,
    eliminatedIds: active.filter(r => r.med > minMed).map(r => r.id)
  })
  active = afterMed
  if (active.length === 1) return { steps, bestRoute: active[0], ecmpRoutes: [] }

  // Step 7: eBGP over iBGP
  const ebgpOnly = active.filter(r => r.peerType === 'eBGP')
  if (ebgpOnly.length > 0 && ebgpOnly.length < active.length) {
    steps.push({
      stepNum: 7,
      stepName: '7. eBGP over iBGP Neighbor',
      winnerIds: ebgpOnly.map(r => r.id),
      reason: 'eBGP route diprioritaskan dibandingkan iBGP route.',
      eliminatedIds: active.filter(r => r.peerType === 'iBGP').map(r => r.id)
    })
    active = ebgpOnly
    if (active.length === 1) return { steps, bestRoute: active[0], ecmpRoutes: [] }
  } else {
    steps.push({
      stepNum: 7,
      stepName: '7. eBGP over iBGP Neighbor',
      winnerIds: active.map(r => r.id),
      reason: `Semua kandidat adalah ${active[0].peerType} (Tie).`,
      eliminatedIds: []
    })
  }

  // Step 8: IGP Metric to NEXT_HOP
  const minIgp = Math.min(...active.map(r => r.igpMetric))
  const afterIgp = active.filter(r => r.igpMetric === minIgp)
  steps.push({
    stepNum: 8,
    stepName: '8. IGP Metric to BGP NEXT_HOP (Lowest wins)',
    winnerIds: afterIgp.map(r => r.id),
    reason: `IGP metric terendah adalah ${minIgp}.`,
    eliminatedIds: active.filter(r => r.igpMetric > minIgp).map(r => r.id)
  })
  active = afterIgp

  // Step 9: ECMP Multipath Check
  if (ecmpEnabled.value && active.length > 1) {
    steps.push({
      stepNum: 9,
      stepName: '9. Multipath / ECMP Load Balancing',
      winnerIds: active.map(r => r.id),
      reason: `ECMP aktif! ${active.length} jalur memenuhi syarat untuk active-active multi-path forwarding.`,
      eliminatedIds: []
    })
    return { steps, bestRoute: active[0], ecmpRoutes: active }
  }

  // Step 10: Router ID (Lowest wins)
  const sortedByRid = [...active].sort((a, b) => a.routerId.localeCompare(b.routerId))
  const bestByRid = sortedByRid[0]
  steps.push({
    stepNum: 10,
    stepName: '10. BGP Router ID (Lowest wins)',
    winnerIds: [bestByRid.id],
    reason: `Router ID terendah adalah ${bestByRid.routerId} (${bestByRid.name}).`,
    eliminatedIds: active.filter(r => r.id !== bestByRid.id).map(r => r.id)
  })

  return { steps, bestRoute: bestByRid, ecmpRoutes: [] }
})
</script>

<template>
  <div class="interactive-card">
    <div class="interactive-card-header">
      <div class="interactive-title">
        <span>🔄</span>
        <span>RFC 4271 & AWS BGP 13-Step Decision Simulator</span>
      </div>
      <div class="flex gap-2">
        <span class="badge-rfc">RFC 4271</span>
        <span class="badge-aws">Direct Connect BGP</span>
      </div>
    </div>

    <p class="text-sm text-[var(--vp-c-text-2)] mb-4">
      Simulasikan algoritma pemilihan <strong>Best Path BGP</strong> dengan mengatur atribut BGP (Weight, Local-Pref, AS-Path Prepending, MED, Origin, dan BGP Community) secara real-time.
    </p>

    <!-- Global Controls -->
    <div class="flex items-center justify-between bg-[var(--vp-c-bg-alt)] p-3 rounded-lg border border-[var(--vp-c-divider)] mb-4">
      <div class="flex items-center gap-2">
        <input id="ecmp-toggle" v-model="ecmpEnabled" type="checkbox" class="w-4 h-4 rounded cursor-pointer" />
        <label for="ecmp-toggle" class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] cursor-pointer">
          Enable BGP Multipath / ECMP (Equal-Cost Multi-Path)
        </label>
      </div>
      <span class="text-xs text-[var(--vp-c-text-3)] font-mono">AWS DX LAG / TGW Multi-VPN</span>
    </div>

    <!-- Route Candidate Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div
        v-for="route in routes"
        :key="route.id"
        :class="[
          'p-4 rounded-lg border transition-all duration-200',
          electionSteps.ecmpRoutes.some(r => r.id === route.id)
            ? 'border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10'
            : electionSteps.bestRoute.id === route.id
            ? 'border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/10'
            : 'border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-alt)] opacity-85'
        ]"
      >
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-[var(--vp-c-divider)]">
          <span class="text-xs font-bold text-[var(--vp-c-text-1)] truncate">{{ route.name.split(':')[0] }}</span>
          <span v-if="electionSteps.bestRoute.id === route.id && electionSteps.ecmpRoutes.length === 0" class="badge-sme !bg-blue-500 !text-white border-none">
            ★ BEST PATH
          </span>
          <span v-else-if="electionSteps.ecmpRoutes.some(r => r.id === route.id)" class="badge-sme !bg-emerald-500 !text-white border-none">
            ⚡ ECMP ACTIVE
          </span>
          <span v-else class="text-[10px] text-[var(--vp-c-text-3)] uppercase font-semibold">Candidate</span>
        </div>

        <div class="space-y-2 text-xs">
          <div>
            <span class="text-[var(--vp-c-text-3)] block mb-0.5">Route Description:</span>
            <span class="text-[var(--vp-c-text-1)] font-medium text-[11px] block">{{ route.name.split(':')[1] }}</span>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label class="block text-[10px] uppercase font-bold text-[var(--vp-c-text-2)]">Weight (AWS/Cisco)</label>
              <input v-model.number="route.weight" type="number" class="ui-input !py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-[var(--vp-c-text-2)]">Local Preference</label>
              <input v-model.number="route.localPref" type="number" class="ui-input !py-1 text-xs" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] uppercase font-bold text-[var(--vp-c-text-2)]">MED (Metric)</label>
              <input v-model.number="route.med" type="number" class="ui-input !py-1 text-xs" />
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-[var(--vp-c-text-2)]">Origin Code</label>
              <select v-model="route.origin" class="ui-input !py-1 text-xs">
                <option value="IGP">IGP (i)</option>
                <option value="EGP">EGP (e)</option>
                <option value="Incomplete">Incomplete (?)</option>
              </select>
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-0.5">
              <label class="text-[10px] uppercase font-bold text-[var(--vp-c-text-2)]">AS-Path (Hops: {{ route.asPath.length }})</label>
              <div class="flex gap-1">
                <button
                  class="text-[10px] bg-[var(--vp-c-bg-mute)] hover:bg-[var(--vp-c-divider)] px-1.5 py-0.5 rounded"
                  @click="route.asPath.push(route.neighborAs)"
                >
                  + Prepend
                </button>
                <button
                  :disabled="route.asPath.length <= 1"
                  class="text-[10px] bg-[var(--vp-c-bg-mute)] hover:bg-[var(--vp-c-divider)] px-1.5 py-0.5 rounded disabled:opacity-30"
                  @click="route.asPath.pop()"
                >
                  - Pop
                </button>
              </div>
            </div>
            <div class="font-mono text-[11px] bg-[var(--vp-c-bg-mute)] p-1.5 rounded text-amber-400">
              [{{ route.asPath.join(' ') }}]
            </div>
          </div>

          <div>
            <label class="block text-[10px] uppercase font-bold text-[var(--vp-c-text-2)]">AWS DX Community</label>
            <input v-model="route.community" type="text" class="ui-input !py-1 text-[11px]" />
          </div>
        </div>
      </div>
    </div>

    <!-- Decision Trace Log -->
    <div class="terminal-window">
      <div class="terminal-header">
        <div class="flex gap-1.5">
          <div class="terminal-dot dot-red"></div>
          <div class="terminal-dot dot-yellow"></div>
          <div class="terminal-dot dot-green"></div>
        </div>
        <span class="text-xs text-gray-400 font-mono">BGP Path Selection Engine Trace • RFC 4271 Execution Log</span>
      </div>
      <div class="terminal-body space-y-2">
        <div
          v-for="step in electionSteps.steps"
          :key="step.stepNum"
          class="text-xs font-mono pb-2 border-b border-gray-800"
        >
          <div class="flex items-center gap-2 text-cyan-400 font-bold">
            <span>➔</span>
            <span>Step {{ step.stepName }}</span>
          </div>
          <div class="text-gray-300 ml-4 mt-0.5">{{ step.reason }}</div>
          <div v-if="step.eliminatedIds.length > 0" class="text-rose-400/80 ml-4 text-[11px]">
            ✖ Eliminated: {{ step.eliminatedIds.join(', ') }}
          </div>
        </div>

        <div class="pt-2 text-xs font-mono font-bold text-emerald-400">
          <div v-if="electionSteps.ecmpRoutes.length > 1">
            🎯 HASIL AKHIR: MULTIPATH ECMP DITERAPKAN KE {{ electionSteps.ecmpRoutes.length }} JALUR SECARA MERATA.
          </div>
          <div v-else>
            🎯 HASIL AKHIR: {{ electionSteps.bestRoute.name }} DIPILIH SEBAGAI ACTIVE BEST PATH DENGAN STATUS RIB INJECTED.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
