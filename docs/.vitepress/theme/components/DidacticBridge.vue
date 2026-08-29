<script setup lang="ts">
import { withBase } from 'vitepress'

defineProps<{
  toolTitle?: string
  toolLink?: string
  toolDesc?: string
  labTitle?: string
  labLink?: string
  labDesc?: string
  drillTitle?: string
  drillLink?: string
  drillDesc?: string
}>()
</script>

<template>
  <div class="didactic-bridge-section">
    <div class="bridge-header">
      <div class="bridge-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span>MIT Didactic Bridge: The 4-Step Mastery Loop</span>
      </div>
      <h3 class="bridge-title">Terapkan Teori Ini ke Praktik Nyata</h3>
      <p class="bridge-subtitle">Jangan berhenti pada membaca teori. Kuasai mekanisme protokol melalui simulasi, deploy blueprint IaC, dan pecahkan insiden SEV-1 terkait modul ini.</p>
    </div>

    <div class="bridge-grid">
      <!-- 1. Interactive Simulation -->
      <a v-if="toolLink" :href="withBase(toolLink)" class="bridge-card card-simulator">
        <div class="card-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-tag">Step 1 • Interactive Simulation</div>
          <h4 class="card-headline">{{ toolTitle || 'Eksplorasi Simulator' }}</h4>
          <p class="card-desc">{{ toolDesc || 'Simulasikan state machine dan manipulasi packet header secara visual.' }}</p>
          <span class="card-action">Buka Simulator →</span>
        </div>
      </a>

      <!-- 2. Terraform Lab Blueprint -->
      <a v-if="labLink" :href="withBase(labLink)" class="bridge-card card-lab">
        <div class="card-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-tag">Step 2 • Hands-On IaC Lab</div>
          <h4 class="card-headline">{{ labTitle || 'Deploy Terraform Blueprint' }}</h4>
          <p class="card-desc">{{ labDesc || 'Bangun arsitektur enterprise ini secara mandiri di AWS sandbox Anda.' }}</p>
          <span class="card-action">Mulai Lab IaC →</span>
        </div>
      </a>

      <!-- 3. Incident War Room -->
      <a v-if="drillLink" :href="withBase(drillLink)" class="bridge-card card-drill">
        <div class="card-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-tag">Step 3 • SEV-1 War Room</div>
          <h4 class="card-headline">{{ drillTitle || 'Incident Response Drill' }}</h4>
          <p class="card-desc">{{ drillDesc || 'Uji intuisi investigasi log dan perbaiki outage produksi terkait modul ini.' }}</p>
          <span class="card-action">Masuk War Room →</span>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.didactic-bridge-section {
  margin: 3rem 0 2rem 0;
  padding: 1.75rem;
  border-radius: 14px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.bridge-header {
  margin-bottom: 1.5rem;
}

.bridge-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 999px;
  margin-bottom: 0.5rem;
}

.bridge-title {
  margin: 0 0 0.4rem 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--vp-c-text-1);
}

.bridge-subtitle {
  margin: 0;
  font-size: 0.92rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.bridge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.bridge-card {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  border-radius: 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  text-decoration: none !important;
  color: inherit;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.bridge-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.card-simulator:hover {
  border-color: #0ea5e9;
}

.card-lab:hover {
  border-color: #10b981;
}

.card-drill:hover {
  border-color: #f59e0b;
}

.card-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  margin-bottom: 0.9rem;
}

.card-simulator .card-icon-wrap {
  background: rgba(14, 165, 233, 0.12);
  color: #0ea5e9;
}

.card-lab .card-icon-wrap {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.card-drill .card-icon-wrap {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.card-tag {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
  margin-bottom: 0.35rem;
}

.card-headline {
  margin: 0 0 0.4rem 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.card-desc {
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  flex: 1;
}

.card-action {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  display: inline-flex;
  align-items: center;
}

.card-simulator .card-action {
  color: #0ea5e9;
}

.card-lab .card-action {
  color: #10b981;
}

.card-drill .card-action {
  color: #f59e0b;
}
</style>
