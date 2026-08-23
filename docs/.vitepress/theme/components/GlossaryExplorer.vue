<script setup lang="ts">
import { ref, computed } from 'vue'
import { withBase } from 'vitepress'
import { NETWORK_TERMS, type TermDefinition } from '../data/terms'

const searchQuery = ref('')
const selectedCategory = ref<string>('all')
const copiedKey = ref<string | null>(null)

const categories = [
  { id: 'all', label: 'Semua' },
  { id: 'vpc-core', label: 'VPC & IPAM' },
  { id: 'protocol-l4', label: 'Transport L4 & MTU' },
  { id: 'routing-bgp', label: 'BGP & Routing' },
  { id: 'aws-underlay', label: 'Underlay & Nitro' },
  { id: 'hybrid-dx', label: 'Direct Connect & Hybrid' },
  { id: 'wan-tgw', label: 'Transit Gateway & WAN' },
  { id: 'app-mesh', label: 'Lattice & Microservices' },
  { id: 'security', label: 'Security & Firewalls' }
]

const allTermsList = computed<TermDefinition[]>(() => Object.values(NETWORK_TERMS))

const categoryCounts = computed(() => {
  const counts: Record<string, number> = { all: allTermsList.value.length }
  for (const term of allTermsList.value) {
    counts[term.category] = (counts[term.category] || 0) + 1
  }
  return counts
})

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
      (term.rfc && term.rfc.toLowerCase().includes(query)) ||
      term.categoryLabel.toLowerCase().includes(query)
    )
  })
})

function clearSearch() {
  searchQuery.value = ''
}

function copyTerm(term: TermDefinition) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(`${term.abbr} (${term.full}): ${term.desc}`).then(() => {
      copiedKey.value = term.abbr
      setTimeout(() => {
        copiedKey.value = null
      }, 2000)
    })
  }
}
</script>

<template>
  <div class="glossary-explorer my-7 rounded-2xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] p-5 sm:p-6 shadow-sm">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--vp-c-divider)] pb-4 mb-5">
      <div>
        <h3 class="text-base sm:text-lg font-bold text-[var(--vp-c-text-1)] flex items-center gap-2 m-0">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
          </span>
          <span>Kamus Singkatan & Glosarium Protokol Jaringan (SME Reference)</span>
        </h3>
        <p class="text-xs text-[var(--vp-c-text-2)] m-0 mt-1 leading-relaxed">
          Kamus komprehensif akronim RFC & AWS Enterprise Cloud Network dengan kepanjangan resmi dan deskripsi teknis.
        </p>
      </div>

      <div class="text-xs font-mono px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 self-start md:self-auto font-bold shrink-0">
        {{ filteredTerms.length }} / {{ allTermsList.length }} Entri
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-col gap-3.5 mb-6">
      <!-- Search Input -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari singkatan, protokol, RFC atau kata kunci (misal: VLSM, PMTUD, BGP, MTU, Geneve, Nitro)..."
          class="w-full rounded-xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] px-3.5 py-2.5 pl-10 pr-10 text-sm text-[var(--vp-c-text-1)] placeholder-[var(--vp-c-text-3)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
        />
        <svg class="absolute left-3.5 top-3 h-4 w-4 text-[var(--vp-c-text-3)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="absolute right-3 top-2.5 h-5 w-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 bg-slate-500/20 hover:bg-slate-500/30 text-xs transition-colors cursor-pointer"
          title="Hapus pencarian"
        >
          ✕
        </button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          :class="[
            'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer',
            selectedCategory === cat.id
              ? 'bg-blue-600 text-white shadow-sm font-bold'
              : 'bg-[var(--vp-c-bg)] text-[var(--vp-c-text-2)] hover:bg-[var(--vp-c-bg-mute)] hover:text-[var(--vp-c-text-1)] border border-[var(--vp-c-divider)]'
          ]"
        >
          <span>{{ cat.label }}</span>
          <span
            v-if="categoryCounts[cat.id]"
            class="text-[10px] px-1.5 py-0.2 rounded-full"
            :class="selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-500/10 text-slate-500 dark:text-slate-400'"
          >
            {{ categoryCounts[cat.id] }}
          </span>
        </button>
      </div>
    </div>

    <!-- Terms Grid -->
    <div v-if="filteredTerms.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="term in filteredTerms"
        :key="term.abbr"
        class="flex flex-col justify-between rounded-xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] p-4 transition-all duration-150 hover:border-blue-500/50 hover:shadow-md"
      >
        <div>
          <!-- Row 1: Badges (Abbr on left, RFC on right) -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="font-mono text-xs font-black px-2 py-0.5 rounded bg-[var(--vp-c-brand-soft)] text-[var(--vp-c-brand-1)] border border-[var(--vp-c-brand-1)]/20 shrink-0">
              {{ term.abbr }}
            </span>
            <span v-if="term.rfc" class="shrink-0 text-[10.5px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
              {{ term.rfc }}
            </span>
          </div>

          <!-- Row 2: Full Title & Category Subtitle -->
          <div class="mb-2">
            <div class="font-bold text-sm text-[var(--vp-c-text-1)] leading-snug">
              {{ term.full }}
            </div>
            <div class="text-[11px] text-[var(--vp-c-text-3)] font-medium mt-0.5">
              {{ term.categoryLabel }}
            </div>
          </div>

          <!-- Row 3: Technical Description -->
          <p class="text-xs text-[var(--vp-c-text-2)] leading-relaxed mb-3">
            {{ term.desc }}
          </p>
        </div>

        <!-- Row 4: Actions Footer -->
        <div class="flex items-center justify-between pt-2.5 border-t border-[var(--vp-c-divider)] text-xs">
          <button
            @click="copyTerm(term)"
            class="flex items-center gap-1.5 text-[var(--vp-c-text-3)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer"
            title="Salin definisi ke clipboard"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>{{ copiedKey === term.abbr ? 'Tersalin!' : 'Salin Definisi' }}</span>
          </button>

          <a
            v-if="term.moduleLink"
            :href="withBase(term.moduleLink)"
            class="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Buka Modul</span>
            <span>→</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 rounded-xl bg-[var(--vp-c-bg)] border border-[var(--vp-c-divider)]">
      <div class="text-3xl mb-2">🔍</div>
      <div class="text-sm font-semibold text-[var(--vp-c-text-1)]">Tidak ada singkatan yang cocok dengan "{{ searchQuery }}"</div>
      <div class="text-xs text-[var(--vp-c-text-3)] mt-1">Coba gunakan kata kunci pencarian yang berbeda atau pilih tab "Semua".</div>
    </div>
  </div>
</template>
