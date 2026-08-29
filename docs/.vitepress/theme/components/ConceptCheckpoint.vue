<script setup lang="ts">
import { ref, computed } from 'vue'

interface OptionItem {
  id: string
  text: string
  isCorrect: boolean
  feedback: string
}

const props = defineProps<{
  title?: string
  badge?: string
  scenario?: string
  codeSnippet?: string
  options?: OptionItem[] | string
  explanation?: string
  invariant?: string
}>()

const parsedOptions = computed<OptionItem[]>(() => {
  if (!props.options) return []
  if (typeof props.options === 'string') {
    try {
      return JSON.parse(props.options)
    } catch {
      return []
    }
  }
  return props.options
})

const selectedOptionId = ref<string | null>(null)
const isRevealed = ref(false)

function selectOption(opt: OptionItem) {
  selectedOptionId.value = opt.id
  isRevealed.value = true
}

function toggleReveal() {
  isRevealed.value = !isRevealed.value
}

function resetQuiz() {
  selectedOptionId.value = null
  isRevealed.value = false
}

const selectedOption = computed(() => {
  return parsedOptions.value.find(o => o.id === selectedOptionId.value)
})
</script>

<template>
  <div class="socratic-checkpoint-card">
    <div class="checkpoint-header">
      <div class="checkpoint-badge">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="checkpoint-icon">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>{{ badge || 'Socratic System Checkpoint' }}</span>
      </div>
      <h3 class="checkpoint-title">{{ title || 'Pause & Predict: Uji Pemahaman Arsitektur' }}</h3>
    </div>

    <!-- Scenario / Problem Description -->
    <div v-if="scenario" class="checkpoint-scenario">
      <p class="scenario-text">{{ scenario }}</p>
    </div>

    <!-- Optional Code or Trace Snippet -->
    <div v-if="codeSnippet" class="checkpoint-code">
      <pre><code>{{ codeSnippet }}</code></pre>
    </div>

    <!-- Multiple Choice Options (If provided) -->
    <div v-if="parsedOptions.length > 0" class="checkpoint-options-grid">
      <button
        v-for="opt in parsedOptions"
        :key="opt.id"
        class="option-btn"
        :class="{
          'selected': selectedOptionId === opt.id,
          'correct': selectedOptionId === opt.id && opt.isCorrect,
          'incorrect': selectedOptionId === opt.id && !opt.isCorrect,
          'revealed-correct': isRevealed && opt.isCorrect && selectedOptionId !== opt.id
        }"
        @click="selectOption(opt)"
      >
        <span class="opt-id">{{ opt.id }}</span>
        <span class="opt-text">{{ opt.text }}</span>
        <span v-if="selectedOptionId === opt.id" class="opt-status-icon">
          <svg v-if="opt.isCorrect" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </span>
      </button>
    </div>

    <!-- Option Specific Feedback -->
    <div v-if="selectedOption" class="selected-feedback" :class="selectedOption.isCorrect ? 'feedback-success' : 'feedback-warning'">
      <div class="feedback-head">
        <span class="feedback-badge">{{ selectedOption.isCorrect ? '✓ Analisis Tepat' : '⚠️ Evaluasi Jebakan' }}</span>
      </div>
      <p class="feedback-desc">{{ selectedOption.feedback }}</p>
    </div>

    <!-- Actions: Toggle Reveal / Reset -->
    <div class="checkpoint-actions">
      <button class="action-toggle-btn" @click="toggleReveal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path v-if="!isRevealed" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle v-if="!isRevealed" cx="12" cy="12" r="3"></circle>
          <path v-if="isRevealed" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line v-if="isRevealed" x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
        <span>{{ isRevealed ? 'Sembunyikan Analisis' : 'Buka Analisis First-Principles' }}</span>
      </button>

      <button v-if="selectedOptionId" class="action-reset-btn" @click="resetQuiz">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
        <span>Reset Uji</span>
      </button>
    </div>

    <!-- Deep First-Principles Explanation & Core Invariant -->
    <div v-if="isRevealed" class="checkpoint-reveal-panel">
      <div v-if="explanation" class="deep-explanation">
        <div class="reveal-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>Penjelasan First-Principles (MIT Systems Thinking)</span>
        </div>
        <p class="explanation-text">{{ explanation }}</p>
      </div>

      <div v-if="invariant" class="system-invariant-box">
        <div class="invariant-tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Core System Invariant</span>
        </div>
        <div class="invariant-content">
          <strong>{{ invariant }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.socratic-checkpoint-card {
  margin: 2rem 0;
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-brand-soft);
  border-left: 4px solid var(--vp-c-brand-1);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.checkpoint-header {
  margin-bottom: 1rem;
}

.checkpoint-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 999px;
  margin-bottom: 0.5rem;
}

.checkpoint-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}

.checkpoint-scenario {
  margin: 0.75rem 0;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

.checkpoint-code {
  margin: 0.75rem 0;
  background: var(--vp-c-bg);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  overflow-x: auto;
}

.checkpoint-options-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
  margin: 1rem 0;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  text-align: left;
  font-size: 0.9rem;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-btn:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.option-btn .opt-id {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.option-btn .opt-text {
  flex: 1;
}

.option-btn.selected.correct {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  color: var(--vp-c-text-1);
}

.option-btn.selected.correct .opt-id {
  background: #10b981;
  color: #ffffff;
}

.option-btn.selected.incorrect {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  color: var(--vp-c-text-1);
}

.option-btn.selected.incorrect .opt-id {
  background: #ef4444;
  color: #ffffff;
}

.option-btn.revealed-correct {
  border-color: #10b981;
  border-style: dashed;
}

.selected-feedback {
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.88rem;
  line-height: 1.5;
}

.feedback-success {
  background: rgba(16, 185, 129, 0.12);
  border-left: 3px solid #10b981;
  color: var(--vp-c-text-1);
}

.feedback-warning {
  background: rgba(245, 158, 11, 0.12);
  border-left: 3px solid #f59e0b;
  color: var(--vp-c-text-1);
}

.feedback-badge {
  font-weight: 700;
  font-size: 0.8rem;
}

.feedback-desc {
  margin-top: 0.25rem;
  margin-bottom: 0;
}

.checkpoint-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.action-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.action-toggle-btn:hover {
  opacity: 0.9;
}

.action-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
}

.action-reset-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-2);
}

.checkpoint-reveal-panel {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px dashed var(--vp-c-divider);
}

.deep-explanation {
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--vp-c-text-1);
  margin-bottom: 1rem;
}

.reveal-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--vp-c-brand-1);
  margin-bottom: 0.5rem;
}

.system-invariant-box {
  padding: 0.85rem 1.1rem;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.25);
}

.invariant-tag {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
  margin-bottom: 0.3rem;
}

.invariant-content {
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
  line-height: 1.5;
}
</style>
