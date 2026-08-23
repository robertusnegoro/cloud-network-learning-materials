<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { withBase } from 'vitepress'
import { getTerm, type TermDefinition } from '../data/terms'

const props = defineProps<{
  term?: string
  abbr?: string
  full?: string
  desc?: string
  rfc?: string
  category?: string
  categoryLabel?: string
  moduleLink?: string
}>()

const targetAbbr = computed(() => (props.term || props.abbr || '').trim())
const lookupData = computed<TermDefinition | undefined>(() => getTerm(targetAbbr.value))

const displayAbbr = computed(() => targetAbbr.value || lookupData.value?.abbr || 'TERM')
const displayFull = computed(() => props.full || lookupData.value?.full || displayAbbr.value)
const displayDesc = computed(() => props.desc || lookupData.value?.desc || 'Definisi teknis standar industri.')
const displayRfc = computed(() => props.rfc || lookupData.value?.rfc)
const displayCategoryLabel = computed(() => props.categoryLabel || lookupData.value?.categoryLabel || 'Network Term')
const displayModuleLink = computed(() => props.moduleLink || lookupData.value?.moduleLink)

const isOpen = ref(false)
const copied = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)

// Unique ID for ARIA connection
const uniqueId = computed(() => `term-${displayAbbr.value.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 7)}`)

// Floating position and arrow alignment
const popoverStyle = ref<Record<string, string>>({})
const arrowStyle = ref<Record<string, string>>({})
const placement = ref<'top' | 'bottom'>('bottom')
let hideTimeout: ReturnType<typeof setTimeout> | null = null

function updatePosition() {
  if (typeof window === 'undefined' || !triggerRef.value) return
  
  const triggerRect = triggerRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const popoverEl = popoverRef.value
  const popoverWidth = popoverEl ? popoverEl.offsetWidth : 320
  const popoverHeight = popoverEl ? popoverEl.offsetHeight : 180

  // Calculate clamped horizontal position
  let left = triggerRect.left + (triggerRect.width / 2) - (popoverWidth / 2)
  if (left < 16) left = 16
  if (left + popoverWidth > viewportWidth - 16) {
    left = viewportWidth - popoverWidth - 16
  }

  // Calculate arrow offset relative to the popover
  const triggerCenter = triggerRect.left + (triggerRect.width / 2)
  const arrowLeft = Math.max(16, Math.min(popoverWidth - 16, triggerCenter - left))

  // Vertical placement logic (default bottom; flip to top only if space below is too small)
  const spaceBelow = viewportHeight - triggerRect.bottom
  const spaceAbove = triggerRect.top

  let top = 0
  if (spaceBelow < popoverHeight + 16 && spaceAbove > popoverHeight + 16) {
    placement.value = 'top'
    top = triggerRect.top - popoverHeight - 8
  } else {
    placement.value = 'bottom'
    top = triggerRect.bottom + 8
  }

  popoverStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.min(popoverWidth, viewportWidth - 32)}px`,
    zIndex: '9999'
  }

  arrowStyle.value = {
    left: `${Math.round(arrowLeft)}px`
  }
}

function showPopover() {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  isOpen.value = true
  nextTick(() => {
    updatePosition()
  })
}

function scheduleHide() {
  if (hideTimeout) clearTimeout(hideTimeout)
  hideTimeout = setTimeout(() => {
    isOpen.value = false
  }, 200)
}

function togglePopover(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation()
  if (isOpen.value) {
    isOpen.value = false
  } else {
    showPopover()
  }
}

function copyDefinition() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    const textToCopy = `${displayAbbr.value} (${displayFull.value}): ${displayDesc.value}`
    navigator.clipboard.writeText(textToCopy).then(() => {
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    })
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
    triggerRef.value?.focus()
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    togglePopover(event)
  }
}

function onDocClick(event: MouseEvent) {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (
    triggerRef.value && !triggerRef.value.contains(target) &&
    popoverRef.value && !popoverRef.value.contains(target)
  ) {
    isOpen.value = false
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    document.addEventListener('click', onDocClick)
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition, { passive: true })
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', onDocClick)
    window.removeEventListener('scroll', updatePosition)
    window.removeEventListener('resize', updatePosition)
  }
  if (hideTimeout) clearTimeout(hideTimeout)
})
</script>

<template>
  <span class="network-term-wrapper inline">
    <!-- Interactive Semantic Trigger (Blends naturally in prose) -->
    <abbr
      ref="triggerRef"
      :id="`trigger-${uniqueId}`"
      class="network-term-trigger cursor-help font-semibold text-[var(--vp-c-brand-1)] transition-colors duration-150 rounded px-1 py-0.5 select-text"
      tabindex="0"
      role="button"
      :aria-expanded="isOpen"
      :aria-controls="uniqueId"
      :title="`${displayAbbr}: ${displayFull}`"
      @mouseenter="showPopover"
      @mouseleave="scheduleHide"
      @focus="showPopover"
      @blur="scheduleHide"
      @click="togglePopover"
      @keydown="onKeydown"
    >
      <slot>{{ displayAbbr }}</slot>
    </abbr>

    <!-- Teleported Floating Popover Card -->
    <Teleport to="body">
      <transition name="term-pop">
        <div
          v-if="isOpen"
          :id="uniqueId"
          ref="popoverRef"
          role="tooltip"
          class="network-term-card no-print"
          :class="`placement-${placement}`"
          :style="popoverStyle"
          @mouseenter="showPopover"
          @mouseleave="scheduleHide"
        >
          <!-- Arrow Indicator -->
          <div
            class="term-arrow"
            :class="placement === 'top' ? 'arrow-bottom' : 'arrow-top'"
            :style="arrowStyle"
          ></div>

          <!-- Card Header -->
          <div class="flex items-center justify-between gap-2 border-b border-[var(--vp-c-divider)] pb-2 mb-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                {{ displayAbbr }}
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 dark:text-slate-400 truncate">
                {{ displayCategoryLabel }}
              </span>
            </div>
            <span v-if="displayRfc" class="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0 font-medium">
              {{ displayRfc }}
            </span>
          </div>

          <!-- Term Full Name Extension -->
          <div class="font-bold text-[13.5px] text-[var(--vp-c-text-1)] leading-snug mb-1.5">
            {{ displayFull }}
          </div>

          <!-- Brief Technical Description -->
          <p class="text-[12.5px] text-[var(--vp-c-text-2)] leading-relaxed mb-3">
            {{ displayDesc }}
          </p>

          <!-- Interactive Actions Footer -->
          <div class="flex items-center justify-between pt-2 border-t border-[var(--vp-c-divider)] text-xs">
            <button
              @click="copyDefinition"
              class="flex items-center gap-1 text-[var(--vp-c-text-3)] hover:text-blue-500 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer"
              title="Salin definisi ke clipboard"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>{{ copied ? 'Tersalin!' : 'Salin Definisi' }}</span>
            </button>

            <a
              v-if="displayModuleLink"
              :href="withBase(displayModuleLink)"
              class="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5 transition-colors"
            >
              <span>Modul Detail</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </transition>
    </Teleport>
  </span>
</template>

<style scoped>
.network-term-trigger {
  text-decoration: underline dotted var(--vp-c-brand-1);
  text-underline-offset: 3px;
  text-decoration-thickness: 1.5px;
  cursor: help;
}

.network-term-trigger:hover,
.network-term-trigger:focus-visible {
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-2);
  outline: none;
}

.network-term-card {
  position: fixed;
  width: 320px;
  max-width: calc(100vw - 32px);
  background: var(--vp-c-bg);
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.75rem;
  padding: 0.85rem 0.95rem;
  box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  user-select: text;
  z-index: 9999;
}

.dark .network-term-card {
  background: rgba(15, 23, 42, 0.96);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.term-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  border-left: 1px solid var(--vp-c-divider);
  border-top: 1px solid var(--vp-c-divider);
  transform: translateX(-50%) rotate(45deg);
  pointer-events: none;
}

.dark .term-arrow {
  border-color: rgba(59, 130, 246, 0.3);
}

.arrow-top {
  top: -5px;
}

.arrow-bottom {
  bottom: -5px;
  border-left: none;
  border-top: none;
  border-right: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
}

.dark .arrow-bottom {
  border-color: rgba(59, 130, 246, 0.3);
}

.term-pop-enter-active,
.term-pop-leave-active {
  transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.term-pop-enter-from,
.term-pop-leave-to {
  opacity: 0;
  transform: translateY(3px) scale(0.98);
}
</style>
