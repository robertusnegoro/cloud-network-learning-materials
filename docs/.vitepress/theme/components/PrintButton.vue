<script setup lang="ts">
const handlePrint = () => {
  if (typeof window !== 'undefined') {
    window.print()
  }
}
</script>

<template>
  <div class="print-actions-bar no-print">
    <button @click="handlePrint" class="print-btn" title="Cetak halaman atau simpan sebagai PDF">
      <svg class="print-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      <span>🖨️ Cetak / Simpan PDF (A4 Ready)</span>
    </button>
    <span class="print-tip">💡 Tips: Pilih <strong>"Save as PDF"</strong> dengan orientasi <strong>Portrait / Landscape</strong> dan margin <strong>Default</strong>.</span>
  </div>
</template>

<style scoped>
.print-actions-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.85rem 1.25rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 10px;
  margin: 1.5rem 0 2rem 0;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.08);
}

.print-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--vp-c-brand-1);
  color: #ffffff;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.55rem 1.2rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.print-btn:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.print-icon {
  flex-shrink: 0;
}

.print-tip {
  font-size: 0.825rem;
  color: var(--vp-c-text-2);
}

@media print {
  .no-print {
    display: none !important;
  }
}
</style>
