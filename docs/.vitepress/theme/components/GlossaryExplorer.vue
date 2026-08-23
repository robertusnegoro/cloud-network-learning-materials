<script setup lang="ts">
import { ref, computed } from 'vue'
import { NETWORK_TERMS, type TermDefinition } from '../data/terms'

const searchQuery = ref('')
const selectedCategory = ref<string>('all')
const copiedKey = ref<string | null>(null)

const categories = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'vpc-core', label: 'VPC & IPAM' },
  { id: 'protocol-l4', label: 'Transport L4 & MTU' },
  { id: 'routing-bgp', label: 'Dynamic Routing & BGP' },
  { id: 'aws-underlay', label: 'AWS Underlay & Nitro' },
  { id: 'hybrid-dx', label: 'Hybrid & Direct Connect' },
  { id: 'wan-tgw', label: 'WAN & Transit Gateway' },
  { id: 'app-mesh', label: 'App Networking & Lattice' },
  { id: 'security', label: 'Security & Inspection' }
]

const allTermsList = computed<TermDefinition[]>(() => Object.values(NETWORK_TERMS))

const filteredTerms = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return allTermsList.value.filter(term => {
    const matchesCategory = selectedCategory.value === 'all' || term.category === selectedCategory.value
    if (!matchesCategory) return false

    if (!query) return true
    return (
      term.abbr.toLowerCase().includes(query) ||
      term.full.toLowerCase().includes(query) ||
      term.desc.toLowerCase().includes(query) ||
      (term.rfc && term.rfc.toLowerCase().includes(query))
    )
  })
})

function copyTerm(term: TermDefinition) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(`${term.abbr} - ${term.full}: ${term.desc}`).then(() => {
      copiedKey.value = term.abbr
      setTimeout(() => {
        copiedKey.value = null
      }, 2000)
    })
  }
}
</script>

<template>
  <div class="glossary-explorer my-6 rounded-2xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] p-5 shadow-sm">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--vp-c-divider)] pb-4 mb-5">
      <div>
        <h3 class="text-lg font-bold text-[var(--vp-c-text-1)] flex items-center gap-2 m-0">
          <span class="text-blue-500">📖</span>
          <span>Kamus Singkatan & Glosarium Protokol Jaringan (SME Reference)</span>
        </h3>
        <p class="text-xs text-[var(--vp-c-text-2)] m-0 mt-1">
          Kamus komprehensif akronim RFC & AWS Enterprise Cloud Network dengan kepanjangan resmi dan deskripsi teknis.
        </p>
      </div>

      <div class="text-xs font-mono px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 self-start md:self-auto font-semibold">
        {{ filteredTerms.length }} dari {{ allTermsList.length }} Entri
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
      <!-- Search Input -->
      <div class="relative flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari singkatan (mis: VLSM, PMTUD, BGP, MTU)..."
          class="w-full rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] px-3.5 py-2 pl-9 text-sm text-[var(--vp-c-text-1)] placeholder-[var(--vp-c-text-3)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <svg class="absolute left-3 top-2.5 h-4 w-4 text-[var(--vp-c-text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>

      <!-- Category Filter Tabs -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          :class="[
            'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
            selectedCategory === cat.id
              ? 'bg-blue-600 text-white shadow-sm font-bold'
              : 'bg-[var(--vp-c-bg)] text-[var(--vp-c-text-2)] hover:bg-[var(--vp-c-bg-mute)] hover:text-[var(--vp-c-text-1)] border border-[var(--vp-c-divider)]'
          ]"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- Terms Grid -->
    <div v-if="filteredTerms.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      <div
        v-for="term in filteredTerms"
        :key="term.abbr"
        class="flex flex-col justify-between rounded-xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] p-4 transition-all duration-150 hover:border-blue-500/50 hover:shadow-md"
      >
        <div>
          <!-- Top Row: Badge & Metadata -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {{ term.abbr }}
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">
                {{ term.categoryLabel }}
              </span>
            </div>
            <span v-if="term.rfc" class="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {{ term.rfc }}
            </span>
          </div>

          <!-- Full Extension -->
          <div class="font-bold text-sm text-[var(--vp-c-text-1)] mb-1">
            {{ term.full }}
          </div>

          <!-- Description -->
          <p class="text-xs text-[var(--vp-c-text-2)] leading-relaxed mb-3">
            {{ term.desc }}
          </p>
        </div>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-between pt-2.5 border-t border-[var(--vp-c-divider)] text-xs">
          <button
            @click="copyTerm(term)"
            class="flex items-center gap-1 text-[var(--vp-c-text-3)] hover:text-blue-500 font-medium transition-colors"
            title="Salin definisi"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>{{ copiedKey === term.abbr ? 'Tersalin!' : 'Salin' }}</span>
          </button>

          <a
            v-if="term.moduleLink"
            :href="term.moduleLink"
            class="text-blue-500 hover:underline font-semibold flex items-center gap-1"
          >
            <span>Buka Modul</span>
            <span>→</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-10">
      <div class="text-3xl mb-2">🔍</div>
      <div class="text-sm font-semibold text-[var(--vp-c-text-1)]">Tidak ada singkatan yang cocok</div>
      <div class="text-xs text-[var(--vp-c-text-3)] mt-1">Coba gunakan kata kunci pencarian yang berbeda atau reset filter kategori.</div>
    </div>
  </div>
</template>
