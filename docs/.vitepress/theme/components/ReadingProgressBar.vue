<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)
const isVisible = ref(false)
const readingTimeMinutes = ref(0)

function updateProgress() {
  if (typeof window === 'undefined') return
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  
  if (docHeight > 0) {
    const rawProgress = (scrollTop / docHeight) * 100
    progress.value = Math.min(100, Math.max(0, +rawProgress.toFixed(1)))
    isVisible.value = scrollTop > 80
  }
}

function calculateReadingTime() {
  if (typeof document === 'undefined') return
  const docElement = document.querySelector('.vp-doc')
  if (docElement) {
    const text = docElement.textContent || ''
    const words = text.trim().split(/\s+/).length
    // Average reading speed: 200 words per minute
    readingTimeMinutes.value = Math.max(1, Math.ceil(words / 200))
  }
}

function scrollToTop() {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

onMounted(() => {
  window.addEventListener('scroll', updateProgress, { passive: true })
  updateProgress()
  setTimeout(calculateReadingTime, 500)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', updateProgress)
  }
})
</script>

<template>
  <!-- Top Reading Progress Indicator -->
  <div class="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent pointer-events-none">
    <div
      class="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-500 transition-all duration-150 ease-out"
      :style="{ width: `${progress}%` }"
    ></div>
  </div>

  <!-- Floating Reading Progress Pill (Bottom Right) -->
  <transition name="fade">
    <div
      v-if="isVisible"
      class="reading-companion-pill fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)]/90 px-3.5 py-1.5 shadow-lg backdrop-blur-md transition-all duration-200 hover:border-blue-500/50 hover:shadow-xl no-print select-none"
    >
      <!-- Circular Progress Ring -->
      <div class="relative flex h-5 w-5 items-center justify-center">
        <svg class="h-5 w-5 -rotate-90" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2.5"
            fill="transparent"
            class="text-[var(--vp-c-divider)]"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2.5"
            fill="transparent"
            stroke-dasharray="62.83"
            :stroke-dashoffset="62.83 - (62.83 * progress) / 100"
            stroke-linecap="round"
            class="text-blue-500 transition-all duration-150"
          />
        </svg>
      </div>

      <!-- Percentage & Read Time -->
      <span class="font-mono text-xs font-semibold text-[var(--vp-c-text-1)]">
        {{ Math.round(progress) }}%
      </span>

      <span v-if="readingTimeMinutes > 0" class="text-[11px] text-[var(--vp-c-text-3)] hidden sm:inline">
        • ~{{ readingTimeMinutes }} mnt baca
      </span>

      <!-- Quick Back to Top Button -->
      <button
        @click="scrollToTop"
        class="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--vp-c-bg-mute)] text-[var(--vp-c-text-2)] hover:bg-blue-500 hover:text-white transition-colors"
        title="Kembali ke atas"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
