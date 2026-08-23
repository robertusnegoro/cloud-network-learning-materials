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
    community: '7224:7300 (Local Region)'
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

function applyPreset(type: 'primary-backup' | 'as-prepend' | 'ecmp-dual' | 'med-tie') {
  if (type === 'primary-backup') {
    ecmpEnabled.value = false
    routes.value[0].localPref = 200
    routes.value[0].asPath = [64512]
    routes.value[0].weight = 100
    routes.value[1].localPref = 100
    routes.value[1].asPath = [64512, 64512]
    routes.value[1].weight = 100
    routes.value[2].localPref = 100
    routes.value[2].asPath = [64512, 64512, 64512]
    routes.value[2].weight = 0
  } else if (type === 'as-prepend') {
    ecmpEnabled.value = false
    routes.value[0].localPref = 100
    routes.value[0].asPath = [64512]
    routes.value[0].weight = 100
    routes.value[1].localPref = 100
    routes.value[1].asPath = [64512, 64512, 64512]
    routes.value[1].weight = 100
    routes.value[2].localPref = 100
    routes.value[2].asPath = [64512, 64512, 64512, 64512]
    routes.value[2].weight = 0
  } else if (type === 'ecmp-dual') {
    ecmpEnabled.value = true
    routes.value[0].localPref = 100
    routes.value[0].asPath = [64512]
    routes.value[0].med = 10
    routes.value[0].igpMetric = 10
    routes.value[0].weight = 100
    routes.value[1].localPref = 100
    routes.value[1].asPath = [64512]
    routes.value[1].med = 10
    routes.value[1].igpMetric = 10
    routes.value[1].weight = 100
    routes.value[2].localPref = 50
    routes.value[2].asPath = [64512, 64512]
    routes.value[2].weight = 0
  } else if (type === 'med-tie') {
    ecmpEnabled.value = false
    routes.value[0].localPref = 100
    routes.value[0].asPath = [64512]
    routes.value[0].med = 10
    routes.value[0].weight = 100
    routes.value[1].localPref = 100
    routes.value[1].asPath = [64512]
    routes.value[1].med = 50
    routes.value[1].weight = 100
    routes.value[2].localPref = 100
    routes.value[2].asPath = [64512]
    routes.value[2].med = 100
    routes.value[2].weight = 0
  }
}

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
    reason: `Max Weight adalah ${maxWeight}. ${afterWeight.length === 1 ? `${afterWeight[0].name} menang mutlak di Step 1.` : `${afterWeight.length} route memiliki weight identik.`}`,
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
    <!-- Header -->
    <div class="interactive-card-header">
      <div class="interactive-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
        <span>RFC 4271 & AWS BGP 13-Step Decision Simulator</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge-rfc">RFC 4271</span>
        <span class="badge-aws">Direct Connect BGP</span>
      </div>
    </div>

    <p class="interactive-desc">
      Simulasikan algoritma pemilihan <strong>Best Path BGP</strong> dengan mengatur atribut BGP (Weight, Local-Pref, AS-Path Prepending, MED, Origin, dan BGP Community) secara real-time.
    </p>

    <!-- Scenario Presets Bar -->
    <div class="mb-5 p-3 bg-[var(--vp-c-bg-alt)] rounded-xl border border-[var(--vp-c-divider)]">
      <span class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-2)] block mb-2">
        Production Architecture Presets:
      </span>
      <div class="flex flex-wrap gap-2">
        <button class="ui-button ui-button-secondary ui-button-sm" @click="applyPreset('primary-backup')">
          Primary DX + Backup VPN
        </button>
        <button class="ui-button ui-button-secondary ui-button-sm" @click="applyPreset('as-prepend')">
          Dual DX with AS-Prepending
        </button>
        <button class="ui-button ui-button-secondary ui-button-sm" @click="applyPreset('ecmp-dual')">
          Active-Active ECMP Dual DX
        </button>
        <button class="ui-button ui-button-secondary ui-button-sm" @click="applyPreset('med-tie')">
          MED Deterministic Routing
        </button>
      </div>
    </div>

    <!-- Global Controls -->
    <div class="flex items-center justify-between bg-[var(--vp-c-bg-alt)] p-3 rounded-xl border border-[var(--vp-c-divider)] mb-6">
      <div class="flex items-center gap-2.5">
        <input id="ecmp-toggle" v-model="ecmpEnabled" type="checkbox" class="w-4 h-4 rounded cursor-pointer accent-blue-600" />
        <label for="ecmp-toggle" class="text-xs font-bold uppercase tracking-wider text-[var(--vp-c-text-1)] cursor-pointer">
          Enable BGP Multipath / ECMP (Equal-Cost Multi-Path)
        </label>
      </div>
      <span class="text-xs text-[var(--vp-c-text-3)] font-mono hidden sm:inline">AWS DX LAG / TGW Multi-VPN</span>
    </div>

    <!-- Route Candidate Cards -->
    <div class="route-cards-grid">
      <div
        v-for="route in routes"
        :key="route.id"
        :class="[
          'route-card',
          electionSteps.ecmpRoutes.some(r => r.id === route.id)
            ? 'is-ecmp-card'
            : electionSteps.bestRoute.id === route.id
            ? 'is-best-card'
            : 'is-candidate-card'
        ]"
      >
        <div class="route-card-header">
          <span class="route-id-label">{{ route.name.split(':')[0] }}</span>
          <span v-if="electionSteps.bestRoute.id === route.id && electionSteps.ecmpRoutes.length === 0" class="badge-status is-best">
            ★ BEST PATH
          </span>
          <span v-else-if="electionSteps.ecmpRoutes.some(r => r.id === route.id)" class="badge-status is-ecmp">
            ⚡ ECMP ACTIVE
          </span>
          <span v-else class="badge-status is-candidate">
            CANDIDATE
          </span>
        </div>

        <div class="route-card-body">
          <div class="route-desc-group">
            <span class="route-desc-label">ROUTE DESCRIPTION:</span>
            <span class="route-desc-text">{{ route.name.split(':')[1] }}</span>
          </div>

          <div class="bgp-fields-row">
            <div class="bgp-field-col">
              <label class="bgp-field-label">Weight (AWS/Cisco)</label>
              <input v-model.number="route.weight" type="number" class="bgp-field-input" />
            </div>
            <div class="bgp-field-col">
              <label class="bgp-field-label">Local Preference</label>
              <input v-model.number="route.localPref" type="number" class="bgp-field-input" />
            </div>
          </div>

          <div class="bgp-fields-row">
            <div class="bgp-field-col">
              <label class="bgp-field-label">MED (Metric)</label>
              <input v-model.number="route.med" type="number" class="bgp-field-input" />
            </div>
            <div class="bgp-field-col">
              <label class="bgp-field-label">Origin Code</label>
              <select v-model="route.origin" class="bgp-field-select">
                <option value="IGP">IGP (i)</option>
                <option value="EGP">EGP (e)</option>
                <option value="Incomplete">Incompl (?)</option>
              </select>
            </div>
          </div>

          <div class="as-path-field-group">
            <div class="as-path-header">
              <label class="bgp-field-label">AS-Path ({{ route.asPath.length }} hops)</label>
              <div class="as-path-actions">
                <button
                  class="bgp-mini-btn"
                  @click="route.asPath.push(route.neighborAs)"
                >
                  + Prepend
                </button>
                <button
                  :disabled="route.asPath.length <= 1"
                  class="bgp-mini-btn"
                  @click="route.asPath.pop()"
                >
                  - Pop
                </button>
              </div>
            </div>
            <div class="as-path-display">
              [{{ route.asPath.join(' ') }}]
            </div>
          </div>

          <div class="community-field-group">
            <label class="bgp-field-label">AWS DX Community</label>
            <input v-model="route.community" type="text" class="bgp-field-input" />
          </div>
        </div>
      </div>
    </div>

    <!-- Decision Trace Log Terminal -->
    <div class="terminal-window">
      <div class="terminal-header">
        <div class="terminal-dots">
          <div class="terminal-dot dot-red"></div>
          <div class="terminal-dot dot-yellow"></div>
          <div class="terminal-dot dot-green"></div>
        </div>
        <span class="terminal-title">RFC 4271 & AWS Direct Connect Path Selection Engine</span>
      </div>
      <div class="terminal-body space-y-2.5">
        <div
          v-for="step in electionSteps.steps"
          :key="step.stepNum"
          class="text-xs font-mono pb-2 border-b border-gray-800/80"
        >
          <div class="flex items-center gap-2 text-cyan-400 font-bold">
            <span class="text-blue-500 font-bold">❯</span>
            <span>{{ step.stepName }}</span>
          </div>
          <div class="text-gray-300 ml-4 mt-0.5">{{ step.reason }}</div>
          <div v-if="step.eliminatedIds.length > 0" class="text-rose-400/90 ml-4 text-[11px] flex items-center gap-1 mt-0.5">
            <span>✖ Eliminated Candidates:</span>
            <span class="font-bold">{{ step.eliminatedIds.join(', ') }}</span>
          </div>
        </div>

        <div class="pt-2 text-xs font-mono font-bold text-emerald-400">
          <div v-if="electionSteps.ecmpRoutes.length > 1" class="flex items-center gap-2">
            <span>🎯</span>
            <span>HASIL AKHIR: MULTIPATH ECMP DITERAPKAN KE {{ electionSteps.ecmpRoutes.length }} JALUR SECARA MERATA.</span>
          </div>
          <div v-else class="flex items-center gap-2">
            <span>🎯</span>
            <span>HASIL AKHIR: {{ electionSteps.bestRoute.name }} DIPILIH SEBAGAI ACTIVE BEST PATH DENGAN STATUS RIB INJECTED.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.route-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 1024px) {
  .route-cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.route-card {
  padding: 1.15rem;
  border-radius: 0.85rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.route-card.is-best-card {
  border-color: rgba(59, 130, 246, 0.6);
  background: rgba(59, 130, 246, 0.04);
  box-shadow: 0 4px 16px -2px rgba(59, 130, 246, 0.15);
}

.dark .route-card.is-best-card {
  background: rgba(30, 58, 138, 0.15);
  border-color: rgba(96, 165, 250, 0.4);
}

.route-card.is-ecmp-card {
  border-color: rgba(16, 185, 129, 0.6);
  background: rgba(16, 185, 129, 0.04);
  box-shadow: 0 4px 16px -2px rgba(16, 185, 129, 0.15);
}

.route-card.is-candidate-card {
  opacity: 0.9;
}

.route-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.65rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.route-id-label {
  font-size: 0.85rem;
  font-weight: 750;
  color: var(--vp-c-text-1);
}

.badge-status {
  font-family: var(--vp-font-family-mono);
  font-size: 0.675rem;
  font-weight: 750;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.badge-status.is-best {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
}

.badge-status.is-ecmp {
  background: #059669;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.35);
}

.badge-status.is-candidate {
  background: rgba(148, 163, 184, 0.15);
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
}

.route-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.route-desc-group {
  margin-bottom: 0.15rem;
}

.route-desc-label {
  font-size: 0.65rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
  display: block;
  margin-bottom: 0.15rem;
}

.route-desc-text {
  font-size: 0.775rem;
  font-weight: 550;
  color: var(--vp-c-text-1);
  line-height: 1.4;
  display: block;
}

.bgp-fields-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.bgp-field-col {
  display: flex;
  flex-direction: column;
}

.bgp-field-label {
  font-size: 0.675rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-2);
  margin-bottom: 0.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bgp-field-input,
.bgp-field-select {
  width: 100%;
  padding: 0.35rem 0.55rem;
  border-radius: 0.45rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  outline: none;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.bgp-field-input:focus,
.bgp-field-select:focus {
  border-color: var(--sme-brand-primary);
  box-shadow: 0 0 0 2px var(--sme-brand-subtle);
}

.as-path-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}

.as-path-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.bgp-mini-btn {
  font-family: var(--vp-font-family-mono);
  font-size: 0.675rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 0.375rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.15s ease;
}

.bgp-mini-btn:hover:not(:disabled) {
  background: var(--sme-brand-primary);
  color: #ffffff;
  border-color: var(--sme-brand-primary);
}

.bgp-mini-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.as-path-display {
  font-family: var(--vp-font-family-mono);
  font-size: 0.775rem;
  font-weight: 600;
  padding: 0.4rem 0.6rem;
  border-radius: 0.45rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: #d97706;
  white-space: nowrap;
  overflow-x: auto;
}

.dark .as-path-display {
  color: #fbbf24;
}

.community-field-group {
  display: flex;
  flex-direction: column;
}

.terminal-body {
  max-height: 420px;
  overflow-y: auto;
}
</style>


