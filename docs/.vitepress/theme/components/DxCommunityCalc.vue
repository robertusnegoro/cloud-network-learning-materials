<template>
  <div class="dx-calc-container p-6 bg-[var(--vp-c-bg-soft)] rounded-xl border border-[var(--vp-c-divider)] my-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-bold text-[var(--vp-c-text-1)] flex items-center gap-2">
          ⚡ AWS Direct Connect (DX) BGP Community & Path Policy Generator
        </h3>
        <p class="text-xs text-[var(--vp-c-text-2)] mt-1">
          Kalkulator interaktif penentuan BGP Communities (Local Preference & Scope) dan AS-Path Prepending untuk kontrol multi-homed Direct Connect.
        </p>
      </div>
      <span class="px-2.5 py-1 text-xs font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
        RFC 4271 / AWS DX BGP
      </span>
    </div>

    <!-- Controls Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- Local Preference -->
      <div class="p-3 bg-[var(--vp-c-bg-alt)] rounded-lg border border-[var(--vp-c-divider)]">
        <label class="block text-xs font-semibold text-[var(--vp-c-text-2)] mb-2">
          Local Preference Community (AWS Ingress Preference)
        </label>
        <select v-model="selectedLocalPref" class="w-full text-xs p-2 rounded bg-[var(--vp-c-bg)] border border-[var(--vp-c-divider)] text-[var(--vp-c-text-1)]">
          <option value="7224:7300">7224:7300 (High - Primary Path)</option>
          <option value="7224:7200">7224:7200 (Medium - Secondary Path)</option>
          <option value="7224:7100">7224:7100 (Low - Backup Path)</option>
          <option value="none">Tanpa Community (AWS Default)</option>
        </select>
        <p class="text-[10px] text-[var(--vp-c-text-3)] mt-2">
          Mengontrol bobot rute masuk ke AWS dari on-premise saat memiliki redundant DX.
        </p>
      </div>

      <!-- Scope Community -->
      <div class="p-3 bg-[var(--vp-c-bg-alt)] rounded-lg border border-[var(--vp-c-divider)]">
        <label class="block text-xs font-semibold text-[var(--vp-c-text-2)] mb-2">
          Scope Community (Geographic Advertisement)
        </label>
        <select v-model="selectedScope" class="w-full text-xs p-2 rounded bg-[var(--vp-c-bg)] border border-[var(--vp-c-divider)] text-[var(--vp-c-text-1)]">
          <option value="7224:9100">7224:9100 (Local AWS Region Only)</option>
          <option value="7224:9200">7224:9200 (Continental AWS Regions - e.g. APAC)</option>
          <option value="7224:9300">7224:9300 (Global - All AWS Regions)</option>
          <option value="none">Tanpa Scope (Default Global Advertisement)</option>
        </select>
        <p class="text-[10px] text-[var(--vp-c-text-3)] mt-2">
          Membatasi jangkauan propagasi prefix rute Anda di seluruh backbone AWS.
        </p>
      </div>

      <!-- AS-Path Prepending & MED -->
      <div class="p-3 bg-[var(--vp-c-bg-alt)] rounded-lg border border-[var(--vp-c-divider)]">
        <label class="block text-xs font-semibold text-[var(--vp-c-text-2)] mb-1">
          AS-Path Prepending Count: <span class="font-bold text-blue-400">{{ prependCount }}x</span>
        </label>
        <input type="range" min="0" max="5" v-model.number="prependCount" class="w-full mb-2" />
        
        <label class="block text-xs font-semibold text-[var(--vp-c-text-2)] mb-1">
          Router Vendor:
        </label>
        <select v-model="routerVendor" class="w-full text-xs p-1.5 rounded bg-[var(--vp-c-bg)] border border-[var(--vp-c-divider)] text-[var(--vp-c-text-1)]">
          <option value="cisco">Cisco IOS-XE / ASR</option>
          <option value="juniper">Juniper JunOS (MX/SRX)</option>
          <option value="arista">Arista EOS</option>
        </select>
      </div>
    </div>

    <!-- Active Communities Summary Card -->
    <div class="p-4 bg-blue-950/20 border border-blue-500/30 rounded-lg mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <span class="text-xs uppercase tracking-wider text-blue-400 font-bold">Applied BGP Communities:</span>
        <div class="flex items-center gap-2 mt-1">
          <span v-for="c in activeCommunities" :key="c" class="px-2 py-0.5 text-xs font-mono font-bold bg-blue-500/30 text-blue-300 rounded border border-blue-400/40">
            {{ c }}
          </span>
          <span v-if="activeCommunities.length === 0" class="text-xs text-gray-400 italic">No specific communities applied</span>
        </div>
      </div>
      <div class="text-right">
        <span class="text-xs text-[var(--vp-c-text-2)] block">AWS Path Priority Status:</span>
        <span class="text-xs font-bold font-mono" :class="priorityColor">{{ priorityText }}</span>
      </div>
    </div>

    <!-- Generated Router Config Code Block -->
    <div class="bg-[var(--vp-c-bg)] rounded-lg border border-[var(--vp-c-divider)] overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2 bg-[var(--vp-c-bg-alt)] border-b border-[var(--vp-c-divider)] text-xs text-[var(--vp-c-text-2)]">
        <span class="font-mono font-semibold text-[var(--vp-c-text-1)]">Generated Production Router Configuration</span>
        <span class="uppercase font-bold text-emerald-400">{{ routerVendor }}</span>
      </div>
      <pre class="p-4 text-xs font-mono text-[var(--vp-c-text-1)] overflow-x-auto leading-relaxed">{{ generatedConfig }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const selectedLocalPref = ref('7224:7300')
const selectedScope = ref('7224:9100')
const prependCount = ref(0)
const routerVendor = ref<'cisco' | 'juniper' | 'arista'>('cisco')

const activeCommunities = computed(() => {
  const list: string[] = []
  if (selectedLocalPref.value !== 'none') list.push(selectedLocalPref.value)
  if (selectedScope.value !== 'none') list.push(selectedScope.value)
  return list
})

const priorityText = computed(() => {
  if (selectedLocalPref.value === '7224:7300' && prependCount.value === 0) return 'PRIMARY / ACTIVE (Highest Priority)'
  if (selectedLocalPref.value === '7224:7200') return 'SECONDARY / STANDBY'
  if (selectedLocalPref.value === '7224:7100' || prependCount.value > 1) return 'FAILOVER / BACKUP ONLY'
  return 'STANDARD PATH'
})

const priorityColor = computed(() => {
  if (selectedLocalPref.value === '7224:7300' && prependCount.value === 0) return 'text-emerald-400'
  if (selectedLocalPref.value === '7224:7200') return 'text-amber-400'
  return 'text-rose-400'
})

const generatedConfig = computed(() => {
  const commStr = activeCommunities.value.join(' ')
  const myAsn = '65001'

  if (routerVendor.value === 'cisco') {
    let prependStr = ''
    if (prependCount.value > 0) {
      prependStr = `\n set as-path prepend ${Array(prependCount.value).fill(myAsn).join(' ')}`
    }
    return `! Cisco IOS-XE Production Direct Connect BGP Policy
ip bgp-community new-format
!
route-map RM_OUT_AWS_DX permit 10
 description Set AWS DX LocalPref and Scope Communities
 match ip address prefix-list PL_ENTERPRISE_PREFIXES${commStr ? `\n set community ${commStr} additive` : ''}${prependStr}
!
router bgp ${myAsn}
 neighbor 169.254.250.1 remote-as 64512
 neighbor 169.254.250.1 description AWS Direct Connect Transit VIF
 neighbor 169.254.250.1 send-community both
 neighbor 169.254.250.1 route-map RM_OUT_AWS_DX out`
  }

  if (routerVendor.value === 'juniper') {
    const juniperComms = activeCommunities.value.map(c => `community add AWS_COMM_${c.replace(':', '_')}`).join('\n        ')
    const prependLines = prependCount.value > 0 ? `\n        as-path-prepend "${Array(prependCount.value).fill(myAsn).join(' ')}";` : ''

    return `# Juniper JunOS Production Direct Connect Policy
policy-options {
${activeCommunities.value.map(c => `    community AWS_COMM_${c.replace(':', '_')} members ${c};`).join('\n')}
    policy-statement PL_AWS_DX_EXPORT {
        from {
            prefix-list-filter PL_ENTERPRISE_PREFIXES orlonger;
        }
        then {
            ${juniperComms};${prependLines}
            accept;
        }
    }
}
protocols {
    bgp {
        group AWS_DIRECT_CONNECT {
            type external;
            peer-as 64512;
            neighbor 169.254.250.1 {
                export PL_AWS_DX_EXPORT;
            }
        }
    }
}`
  }

  // Arista EOS
  return `! Arista EOS Production Direct Connect Policy
ip community-list standard CL_AWS_DX permit ${commStr}
!
route-map RM_OUT_AWS_DX permit 10
 match ip address prefix-list PL_ENTERPRISE_PREFIXES
 set community ${commStr} additive${prependCount.value > 0 ? `\n set as-path prepend ${Array(prependCount.value).fill(myAsn).join(' ')}` : ''}
!
router bgp ${myAsn}
 neighbor 169.254.250.1 remote-as 64512
 neighbor 169.254.250.1 send-community standard
 neighbor 169.254.250.1 route-map RM_OUT_AWS_DX out`
})
</script>
