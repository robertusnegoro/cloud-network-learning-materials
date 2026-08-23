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
  <div class="glossary-explorer">
    <!-- Header -->
    <div class="glossary-header">
      <div class="glossary-title-group">
        <h3 class="glossary-title">
          <span class="glossary-icon-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
          </span>
          <span>Kamus Singkatan & Glosarium Protokol Jaringan (SME Reference)</span>
        </h3>
        <p class="glossary-subtitle">
          Kamus komprehensif akronim RFC & AWS Enterprise Cloud Network dengan kepanjangan resmi dan deskripsi teknis.
        </p>
      </div>

      <div class="glossary-count-badge">
        {{ filteredTerms.length }} / {{ allTermsList.length }} Entri
      </div>
    </div>

    <!-- Controls -->
    <div class="glossary-controls">
      <!-- Search Input Container -->
      <div class="search-input-wrapper">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari singkatan, protokol, RFC atau kata kunci (misal: VLSM, PMTUD, BGP, MTU, Geneve, Nitro)..."
          class="search-input"
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="clear-search-btn"
          title="Hapus pencarian"
        >
          ✕
        </button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="category-tabs-wrapper">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          :class="['category-tab-btn', { 'is-active': selectedCategory === cat.id }]"
        >
          <span>{{ cat.label }}</span>
          <span
            v-if="categoryCounts[cat.id]"
            class="tab-count-pill"
          >
            {{ categoryCounts[cat.id] }}
          </span>
        </button>
      </div>
    </div>

    <!-- Terms Grid -->
    <div v-if="filteredTerms.length > 0" class="terms-grid">
      <div
        v-for="term in filteredTerms"
        :key="term.abbr"
        class="term-card"
      >
        <div class="term-card-body">
          <!-- Row 1: Badges (Abbr on left, RFC on right) -->
          <div class="term-badges-row">
            <span class="abbr-badge">
              {{ term.abbr }}
            </span>
            <span v-if="term.rfc" class="rfc-badge">
              {{ term.rfc }}
            </span>
          </div>

          <!-- Row 2: Full Title & Category Subtitle -->
          <div class="term-title-group">
            <div class="term-full-title">
              {{ term.full }}
            </div>
            <div class="term-category-label">
              {{ term.categoryLabel }}
            </div>
          </div>

          <!-- Row 3: Technical Description -->
          <p class="term-desc">
            {{ term.desc }}
          </p>
        </div>

        <!-- Row 4: Actions Footer -->
        <div class="term-card-footer">
          <button
            @click="copyTerm(term)"
            class="copy-term-btn"
            title="Salin definisi ke clipboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>{{ copiedKey === term.abbr ? 'Tersalin!' : 'Salin Definisi' }}</span>
          </button>

          <a
            v-if="term.moduleLink"
            :href="withBase(term.moduleLink)"
            class="module-link"
          >
            <span>Buka Modul</span>
            <span>→</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">Tidak ada singkatan yang cocok dengan "{{ searchQuery }}"</div>
      <div class="empty-subtitle">Coba gunakan kata kunci pencarian yang berbeda atau pilih tab "Semua".</div>
    </div>
  </div>
</template>

<style scoped>
.glossary-explorer {
  margin: 1.75rem 0;
  border-radius: 1rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 1.5rem;
  box-shadow: var(--sme-shadow-sm);
}

.glossary-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 1rem;
  margin-bottom: 1.25rem;
}

@media (min-width: 768px) {
  .glossary-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.glossary-title-group {
  flex: 1;
}

.glossary-title {
  font-size: 1.05rem;
  font-weight: 750;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  line-height: 1.35;
}

.glossary-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 0.5rem;
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  flex-shrink: 0;
}

.glossary-subtitle {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin: 0.35rem 0 0 0;
  line-height: 1.5;
}

.glossary-count-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.25);
  align-self: flex-start;
  flex-shrink: 0;
}

.dark .glossary-count-badge {
  color: #60a5fa;
  border-color: rgba(96, 165, 250, 0.3);
}

@media (min-width: 768px) {
  .glossary-count-badge {
    align-self: center;
  }
}

.glossary-controls {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 1.5rem;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--vp-c-text-3);
  pointer-events: none;
  width: 16px;
  height: 16px;
}

.search-input {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  padding: 0.65rem 2.5rem 0.65rem 2.4rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
  transition: all 0.15s ease;
  outline: none;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.search-input:focus {
  border-color: var(--sme-brand-primary);
  box-shadow: 0 0 0 3px var(--sme-brand-subtle);
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-mute);
  font-size: 0.7rem;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.clear-search-btn:hover {
  background: var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.category-tabs-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.35rem;
  scrollbar-width: thin;
}

.category-tab-btn {
  white-space: nowrap;
  border-radius: 0.5rem;
  padding: 0.4rem 0.7rem;
  font-size: 0.775rem;
  font-weight: 550;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}

.category-tab-btn:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  border-color: var(--sme-brand-primary);
}

.category-tab-btn.is-active {
  background: var(--sme-brand-primary);
  color: #ffffff;
  border-color: var(--sme-brand-primary);
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
}

.tab-count-pill {
  font-size: 0.675rem;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.08);
}

.category-tab-btn.is-active .tab-count-pill {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.dark .category-tab-btn:not(.is-active) .tab-count-pill {
  background: rgba(255, 255, 255, 0.1);
  color: var(--vp-c-text-2);
}

.terms-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .terms-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.term-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 0.75rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  padding: 1.15rem;
  transition: all 0.15s ease;
}

.term-card:hover {
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: var(--sme-shadow-md);
  transform: translateY(-1px);
}

.term-card-body {
  flex: 1;
}

.term-badges-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.abbr-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: 0.375rem;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border: 1px solid rgba(59, 130, 246, 0.25);
  flex-shrink: 0;
}

.rfc-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 0.375rem;
  background: rgba(168, 85, 247, 0.12);
  color: #9333ea;
  border: 1px solid rgba(168, 85, 247, 0.25);
  flex-shrink: 0;
}

.dark .rfc-badge {
  color: #c084fc;
  border-color: rgba(192, 132, 252, 0.3);
}

.term-title-group {
  margin-bottom: 0.55rem;
}

.term-full-title {
  font-size: 0.925rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.35;
}

.term-category-label {
  font-size: 0.725rem;
  font-weight: 550;
  color: var(--vp-c-text-3);
  margin-top: 0.15rem;
}

.term-desc {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0 0 0.85rem 0;
}

.term-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.65rem;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.775rem;
}

.copy-term-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--vp-c-text-3);
  font-weight: 550;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 0.375rem;
  transition: all 0.15s ease;
}

.copy-term-btn:hover {
  color: var(--sme-brand-primary);
  background: var(--vp-c-bg-mute);
}

.module-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--sme-brand-primary);
  font-weight: 600;
  text-decoration: none;
  padding: 0.2rem 0.4rem;
  border-radius: 0.375rem;
  transition: all 0.15s ease;
}

.module-link:hover {
  text-decoration: underline;
  background: var(--vp-c-bg-mute);
}

.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  border-radius: 0.75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-title {
  font-size: 0.925rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.empty-subtitle {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  margin-top: 0.3rem;
}
</style>
