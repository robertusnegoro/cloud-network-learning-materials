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
          <div class="popover-header">
            <div class="header-badge-group">
              <span class="abbr-badge">
                {{ displayAbbr }}
              </span>
              <span class="category-pill">
                {{ displayCategoryLabel }}
              </span>
            </div>
            <span v-if="displayRfc" class="rfc-badge">
              {{ displayRfc }}
            </span>
          </div>

          <!-- Term Full Name Extension -->
          <div class="term-full-title">
            {{ displayFull }}
          </div>

          <!-- Brief Technical Description -->
          <p class="term-description">
            {{ displayDesc }}
          </p>

          <!-- Interactive Actions Footer -->
          <div class="popover-footer">
            <button
              @click="copyDefinition"
              class="copy-btn"
              title="Salin definisi ke clipboard"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>{{ copied ? 'Tersalin!' : 'Salin Definisi' }}</span>
            </button>

            <a
              v-if="displayModuleLink"
              :href="withBase(displayModuleLink)"
              class="detail-link"
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
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.75rem;
  padding: 0.95rem 1rem;
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

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.65rem;
  margin-bottom: 0.65rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.header-badge-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.abbr-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.15rem 0.5rem;
  border-radius: 0.375rem;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border: 1px solid rgba(59, 130, 246, 0.25);
  flex-shrink: 0;
}

.category-pill {
  font-size: 0.675rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.45rem;
  border-radius: 0.375rem;
  background: rgba(148, 163, 184, 0.12);
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rfc-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.675rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
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

.term-full-title {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
  line-height: 1.35;
  margin-bottom: 0.45rem;
}

.term-description {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0 0 0.75rem 0;
}

.popover-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.65rem;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.775rem;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--vp-c-text-3);
  font-weight: 550;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 0.375rem;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  color: var(--sme-brand-primary);
  background: var(--vp-c-bg-mute);
}

.detail-link {
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

.detail-link:hover {
  text-decoration: underline;
  background: var(--vp-c-bg-mute);
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
