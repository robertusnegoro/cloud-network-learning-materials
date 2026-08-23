<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
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

// Unique ID for ARIA connection and CSS anchor positioning
const uniqueId = computed(() => `term-${displayAbbr.value.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 7)}`)

// Floating positions for universal browser fallback
const popoverStyle = ref<Record<string, string>>({})
const placement = ref<'top' | 'bottom'>('top')
let hideTimeout: ReturnType<typeof setTimeout> | null = null

function updatePosition() {
  if (typeof window === 'undefined' || !triggerRef.value) return
  
  const triggerRect = triggerRef.value.getBoundingClientRect()
  const popoverWidth = 320
  const popoverHeight = 180
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Horizontal position (center aligned, clamped to viewport)
  let left = triggerRect.left + (triggerRect.width / 2) - (popoverWidth / 2)
  if (left < 16) left = 16
  if (left + popoverWidth > viewportWidth - 16) {
    left = viewportWidth - popoverWidth - 16
  }

  // Vertical position (prefer top, flip to bottom if top overflows)
  const spaceAbove = triggerRect.top
  const spaceBelow = viewportHeight - triggerRect.bottom

  let top = 0
  if (spaceAbove >= popoverHeight + 12 || spaceAbove > spaceBelow) {
    placement.value = 'top'
    top = triggerRect.top - popoverHeight - 8
    if (top < 8) top = 8
  } else {
    placement.value = 'bottom'
    top = triggerRect.bottom + 8
  }

  popoverStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    width: `${popoverWidth}px`,
    zIndex: '999'
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
  }, 220)
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
    <!-- Interactive Semantic Trigger -->
    <abbr
      ref="triggerRef"
      :id="`trigger-${uniqueId}`"
      class="network-term-trigger cursor-help font-semibold text-[var(--vp-c-brand-1)] transition-all duration-150 inline-flex items-center gap-0.5 rounded px-1 py-0.2 hover:bg-[var(--vp-c-brand-soft)] hover:text-[var(--vp-c-brand-2)] select-text"
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
      <span class="term-badge-dot inline-block w-1.5 h-1.5 rounded-full bg-[var(--vp-c-brand-1)]/60 -mt-2 ml-0.5" aria-hidden="true"></span>
    </abbr>

    <!-- Teleported/Fixed Floating Popover Card -->
    <Teleport to="body">
      <transition name="term-pop">
        <div
          v-if="isOpen"
          :id="uniqueId"
          ref="popoverRef"
          role="tooltip"
          class="network-term-card no-print"
          :style="popoverStyle"
          @mouseenter="showPopover"
          @mouseleave="scheduleHide"
        >
          <!-- Card Header -->
          <div class="flex items-center justify-between gap-2 border-b border-[var(--vp-c-divider)] pb-2 mb-2">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-[var(--vp-c-brand-soft)] text-[var(--vp-c-brand-1)] border border-[var(--vp-c-brand-1)]/20">
                {{ displayAbbr }}
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400">
                {{ displayCategoryLabel }}
              </span>
            </div>
            <span v-if="displayRfc" class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {{ displayRfc }}
            </span>
          </div>

          <!-- Term Full Name Extension -->
          <div class="font-bold text-sm text-[var(--vp-c-text-1)] leading-snug mb-1.5">
            {{ displayFull }}
          </div>

          <!-- Brief Technical Description -->
          <p class="text-xs text-[var(--vp-c-text-2)] leading-relaxed mb-3">
            {{ displayDesc }}
          </p>

          <!-- Interactive Actions Footer -->
          <div class="flex items-center justify-between pt-2 border-t border-[var(--vp-c-divider)] text-[11px]">
            <button
              @click="copyDefinition"
              class="flex items-center gap-1 text-[var(--vp-c-text-3)] hover:text-[var(--vp-c-brand-1)] font-medium transition-colors"
              title="Salin definisi ke clipboard"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>{{ copied ? 'Tersalin!' : 'Salin Definisi' }}</span>
            </button>

            <a
              v-if="displayModuleLink"
              :href="displayModuleLink"
              class="text-[var(--vp-c-brand-1)] hover:underline font-semibold flex items-center gap-0.5"
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
}

.network-term-card {
  background: rgba(var(--vp-c-bg-rgb, 255, 255, 255), 0.92);
  background-color: var(--vp-c-bg-soft);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.75rem;
  padding: 0.85rem;
  box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.25), 0 4px 12px -2px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  user-select: text;
}

.dark .network-term-card {
  background: rgba(22, 27, 34, 0.94);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.term-pop-enter-active,
.term-pop-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.term-pop-enter-from,
.term-pop-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.97);
}
</style>
