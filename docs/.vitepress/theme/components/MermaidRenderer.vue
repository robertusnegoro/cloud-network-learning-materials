<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  code: string
}>()

const svg = ref('')
const error = ref('')
const { isDark } = useData()

const decoded = decodeURIComponent(props.code)

// Interactive controls state
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const isFullscreen = ref(false)
const showSource = ref(false)
const copiedSvg = ref(false)
const copiedCode = ref(false)
const fitMode = ref<'fit' | 'natural'>('fit')

// Diagram metadata detection
const diagramType = computed(() => {
  const codeTrimmed = decoded.trim().toLowerCase()
  if (codeTrimmed.startsWith('sequencediagram')) return 'Sequence Flow (Alur Protokol)'
  if (codeTrimmed.startsWith('graph') || codeTrimmed.startsWith('flowchart')) {
    if (codeTrimmed.includes('subgraph')) return 'Arsitektur & Topologi (Multi-Tier)'
    return 'Flowchart & Logika Routing'
  }
  if (codeTrimmed.startsWith('statediagram')) return 'State Machine Diagram'
  if (codeTrimmed.startsWith('classdiagram')) return 'Struktur Relasi & Objek'
  if (codeTrimmed.startsWith('erdiagram')) return 'Entity-Relationship Diagram'
  if (codeTrimmed.startsWith('packet-beta')) return 'Header Paket & Struktur Bit'
  return 'Diagram Jaringan SME'
})

// Zoom Controls
function zoomIn() {
  zoom.value = Math.min(3, +(zoom.value + 0.2).toFixed(2))
}

function zoomOut() {
  zoom.value = Math.max(0.4, +(zoom.value - 0.2).toFixed(2))
}

function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function toggleFitMode() {
  fitMode.value = fitMode.value === 'fit' ? 'natural' : 'fit'
  resetZoom()
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  resetZoom()
  if (typeof document !== 'undefined') {
    if (isFullscreen.value) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
}

// Drag & Pan handlers
function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  dragStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  panX.value = e.clientX - dragStart.value.x
  panY.value = e.clientY - dragStart.value.y
}

function handleMouseUp() {
  isDragging.value = false
}

// Mouse Wheel zoom when holding Ctrl/Cmd or in Fullscreen
function handleWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey || isFullscreen.value) {
    e.preventDefault()
    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }
}

// Copy actions
async function copySvgCode() {
  if (!svg.value || typeof navigator === 'undefined') return
  try {
    await navigator.clipboard.writeText(svg.value)
    copiedSvg.value = true
    setTimeout(() => { copiedSvg.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy SVG:', err)
  }
}

async function copyRawCode() {
  if (typeof navigator === 'undefined') return
  try {
    await navigator.clipboard.writeText(decoded)
    copiedCode.value = true
    setTimeout(() => { copiedCode.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}

// Keyboard shortcuts (ESC to close fullscreen)
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

async function renderDiagram() {
  if (typeof window === 'undefined') return
  try {
    const mermaid = (await import('mermaid')).default
    
    // High-contrast, book-quality color palette for both modes
    const darkThemeVars = {
      darkMode: true,
      background: 'transparent',
      primaryColor: '#1e293b',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#3b82f6',
      lineColor: '#94a3b8',
      secondaryColor: '#0f172a',
      secondaryTextColor: '#f8fafc',
      secondaryBorderColor: '#475569',
      tertiaryColor: '#1e293b',
      tertiaryTextColor: '#f8fafc',
      tertiaryBorderColor: '#334155',
      mainBkg: '#1e293b',
      nodeBorder: '#3b82f6',
      nodeTextColor: '#f8fafc',
      clusterBkg: '#0f172a',
      clusterBorder: '#334155',
      titleColor: '#f8fafc',
      edgeLabelBackground: '#1e293b',
      actorTextColor: '#f8fafc',
      actorLineColor: '#64748b',
      actorBkg: '#1e293b',
      actorBorder: '#38bdf8',
      signalColor: '#cbd5e1',
      signalTextColor: '#f8fafc',
      labelBoxBkgColor: '#1e293b',
      labelBoxBorderColor: '#475569',
      labelTextColor: '#f8fafc',
      loopTextColor: '#f8fafc',
      noteBkgColor: '#292524',
      noteTextColor: '#fef08a',
      noteBorderColor: '#d97706',
      activationBkgColor: '#1e3a8a',
      activationBorderColor: '#60a5fa',
      sequenceNumberColor: '#ffffff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: '13.5px'
    }

    const lightThemeVars = {
      darkMode: false,
      background: 'transparent',
      primaryColor: '#eff6ff',
      primaryTextColor: '#0f172a',
      primaryBorderColor: '#2563eb',
      lineColor: '#334155',
      secondaryColor: '#f8fafc',
      secondaryTextColor: '#0f172a',
      secondaryBorderColor: '#94a3b8',
      tertiaryColor: '#f1f5f9',
      tertiaryTextColor: '#0f172a',
      tertiaryBorderColor: '#cbd5e1',
      mainBkg: '#eff6ff',
      nodeBorder: '#2563eb',
      nodeTextColor: '#0f172a',
      clusterBkg: '#f8fafc',
      clusterBorder: '#cbd5e1',
      titleColor: '#0f172a',
      edgeLabelBackground: '#ffffff',
      actorTextColor: '#0f172a',
      actorLineColor: '#64748b',
      actorBkg: '#e0f2fe',
      actorBorder: '#0284c7',
      signalColor: '#334155',
      signalTextColor: '#0f172a',
      labelBoxBkgColor: '#ffffff',
      labelBoxBorderColor: '#cbd5e1',
      labelTextColor: '#0f172a',
      loopTextColor: '#0f172a',
      noteBkgColor: '#fef3c7',
      noteTextColor: '#78350f',
      noteBorderColor: '#f59e0b',
      activationBkgColor: '#dbeafe',
      activationBorderColor: '#3b82f6',
      sequenceNumberColor: '#ffffff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: '13.5px'
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      themeVariables: isDark.value ? darkThemeVars : lightThemeVars,
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
        padding: 16,
        nodeSpacing: 50,
        rankSpacing: 50
      },
      sequence: {
        actorMargin: 50,
        boxMargin: 10,
        boxTextMargin: 6,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: false,
        bottomMarginAdj: 10,
        useMaxWidth: false
      }
    })

    const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
    const { svg: outSvg } = await mermaid.render(id, decoded)
    
    svg.value = outSvg
    error.value = ''
  } catch (err: any) {
    console.error('Mermaid render error:', err)
    error.value = err?.message || 'Mermaid render error'
  }
}

onMounted(() => {
  renderDiagram()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
    if (typeof document !== 'undefined') {
      document.body.style.overflow = ''
    }
  }
})

watch(isDark, () => {
  renderDiagram()
})
</script>

<template>
  <div class="mermaid-diagram-card group relative my-7 rounded-xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-500/40">
    <!-- Header Bar with Metadata & Interactive Controls -->
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-alt)]/60 px-3.5 py-2 rounded-t-xl backdrop-blur-sm select-none">
      <!-- Left: Diagram Title & Type Badge -->
      <div class="flex items-center gap-2">
        <span class="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M7 7h10"></path>
            <path d="M7 12h10"></path>
            <path d="M7 17h10"></path>
          </svg>
        </span>
        <span class="text-xs font-semibold text-[var(--vp-c-text-1)] tracking-tight">
          {{ diagramType }}
        </span>
        <span class="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--vp-c-bg-mute)] text-[var(--vp-c-text-3)]">
          Mermaid SVG
        </span>
      </div>

      <!-- Right: Action Toolbar -->
      <div class="flex items-center gap-1">
        <!-- Fit / Scroll Toggle -->
        <button
          @click="toggleFitMode"
          class="diagram-btn"
          :title="fitMode === 'fit' ? 'Tampilan Lebar Alami (Scrollable)' : 'Pas Lebar Kontainer (Fit Width)'"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path v-if="fitMode === 'fit'" d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            <path v-else d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M14 4h6m0 0v6m0-6l-7 7M4 10h6m0 0V4m0 6L3 3"></path>
          </svg>
          <span class="text-[11px] font-medium hidden md:inline">{{ fitMode === 'fit' ? 'Fit' : 'Expand' }}</span>
        </button>

        <!-- Zoom Out -->
        <button
          @click="zoomOut"
          class="diagram-btn"
          title="Perkecil Diagram (-20%)"
          :disabled="zoom <= 0.4"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>

        <!-- Zoom Indicator / Reset -->
        <button
          @click="resetZoom"
          class="diagram-btn font-mono text-[11px] font-semibold px-2 min-w-[3.5rem] justify-center"
          title="Reset Zoom & Posisi (100%)"
        >
          {{ Math.round(zoom * 100) }}%
        </button>

        <!-- Zoom In -->
        <button
          @click="zoomIn"
          class="diagram-btn"
          title="Perbesar Diagram (+20%)"
          :disabled="zoom >= 3"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>

        <!-- Fullscreen Modal Button -->
        <button
          @click="toggleFullscreen"
          class="diagram-btn highlight-btn"
          title="Buka Layar Penuh (Mode Fokus Resolusi Tinggi)"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          <span class="text-[11px] font-medium hidden sm:inline">Layar Penuh</span>
        </button>

        <!-- Copy SVG -->
        <button
          @click="copySvgCode"
          class="diagram-btn"
          :title="copiedSvg ? 'Tersalin!' : 'Salin SVG Diagram'"
        >
          <svg v-if="!copiedSvg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
          </svg>
          <svg v-else class="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>

        <!-- Toggle Mermaid Source -->
        <button
          @click="showSource = !showSource"
          class="diagram-btn"
          :class="{ 'bg-blue-500/15 text-blue-500': showSource }"
          title="Lihat Kode Sumber Mermaid"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Diagram Canvas Viewport -->
    <div
      class="diagram-canvas relative overflow-hidden flex items-center justify-center p-4 transition-all"
      :class="[
        fitMode === 'fit' ? 'min-h-[220px]' : 'min-h-[300px] overflow-x-auto',
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      ]"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @wheel="handleWheel"
    >
      <!-- Diagram SVG Output -->
      <div
        v-if="svg"
        v-html="svg"
        class="mermaid-svg-container transition-transform duration-75 select-none w-full flex justify-center"
        :class="{ 'max-w-none w-auto': fitMode === 'natural' }"
        :style="{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'center center'
        }"
      ></div>

      <!-- Error State -->
      <div v-else-if="error" class="p-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg w-full font-mono">
        <div class="font-bold flex items-center gap-2 mb-2 text-rose-400">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Diagram Render Warning
        </div>
        <pre class="text-[11px] whitespace-pre-wrap text-rose-300">{{ decoded }}</pre>
      </div>

      <!-- Loading State -->
      <div v-else class="flex flex-col items-center justify-center gap-2 py-8 text-xs text-[var(--vp-c-text-3)] font-mono animate-pulse">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <span>Merender diagram beresolusi tinggi...</span>
      </div>

      <!-- Pan & Zoom Hint Overlay (Visible on Hover when zoomed) -->
      <div
        v-if="zoom !== 1 || panX !== 0 || panY !== 0"
        class="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-md bg-[var(--vp-c-bg-alt)]/90 px-2 py-1 text-[10px] font-mono text-[var(--vp-c-text-2)] border border-[var(--vp-c-divider)] backdrop-blur-sm pointer-events-none"
      >
        <span>Geser: Drag mouse • Zoom: {{ Math.round(zoom * 100) }}%</span>
      </div>
    </div>

    <!-- Optional Source Code Drawer -->
    <div
      v-if="showSource"
      class="border-t border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-alt)] p-3 rounded-b-xl"
    >
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[11px] font-mono text-[var(--vp-c-text-3)] uppercase tracking-wider font-semibold">
          Definisi Mermaid Markdown:
        </span>
        <button
          @click="copyRawCode"
          class="text-[11px] text-blue-500 hover:text-blue-400 font-mono font-medium flex items-center gap-1"
        >
          <span>{{ copiedCode ? 'Tersalin!' : 'Salin Kode' }}</span>
        </button>
      </div>
      <pre class="overflow-x-auto text-[11.5px] font-mono p-2.5 rounded bg-[var(--vp-c-bg-mute)] text-[var(--vp-c-text-1)] leading-relaxed border border-[var(--vp-c-divider)]">{{ decoded }}</pre>
    </div>

    <!-- Fullscreen Lightbox Modal (Teleported to Body) -->
    <Teleport to="body">
      <div
        v-if="isFullscreen"
        class="fixed inset-0 z-[99999] flex flex-col bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 text-slate-100 animate-in fade-in duration-150"
      >
        <!-- Modal Top Bar -->
        <div class="flex items-center justify-between gap-4 pb-4 border-b border-slate-800 select-none">
          <div class="flex items-center gap-3">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="M7 7h10"></path>
                <path d="M7 12h10"></path>
                <path d="M7 17h10"></path>
              </svg>
            </span>
            <div>
              <h3 class="text-sm font-bold text-slate-100 tracking-tight">{{ diagramType }}</h3>
              <p class="text-xs text-slate-400">Mode Resolusi Tinggi • Tekan ESC atau tombol tutup untuk kembali</p>
            </div>
          </div>

          <!-- Modal Action Bar -->
          <div class="flex items-center gap-2">
            <!-- Zoom Out -->
            <button
              @click="zoomOut"
              class="modal-btn"
              title="Perkecil (-20%)"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>

            <!-- Zoom Indicator / Reset -->
            <button
              @click="resetZoom"
              class="modal-btn font-mono text-xs px-2.5 min-w-[4rem] justify-center"
              title="Reset Zoom (100%)"
            >
              {{ Math.round(zoom * 100) }}%
            </button>

            <!-- Zoom In -->
            <button
              @click="zoomIn"
              class="modal-btn"
              title="Perbesar (+20%)"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>

            <!-- Copy SVG -->
            <button
              @click="copySvgCode"
              class="modal-btn"
              :title="copiedSvg ? 'Tersalin!' : 'Salin SVG'"
            >
              <svg v-if="!copiedSvg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
              </svg>
              <span v-else class="text-xs text-emerald-400 font-medium">Tersalin!</span>
            </button>

            <!-- Close Modal -->
            <button
              @click="toggleFullscreen"
              class="modal-btn bg-rose-600/20 text-rose-400 border-rose-500/30 hover:bg-rose-600/30"
              title="Tutup (ESC)"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span class="text-xs font-semibold">Tutup</span>
            </button>
          </div>
        </div>

        <!-- Fullscreen Canvas -->
        <div
          class="relative flex-1 overflow-hidden flex items-center justify-center p-8 select-none"
          :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @wheel="handleWheel"
        >
          <div
            v-if="svg"
            v-html="svg"
            class="fullscreen-svg-target max-w-none transition-transform duration-75"
            :style="{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom * 1.25})`,
              transformOrigin: 'center center'
            }"
          ></div>
        </div>

        <!-- Fullscreen Footer Controls Hint -->
        <div class="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
          <div class="flex items-center gap-4">
            <span>💡 <strong>Tips Navigasi:</strong> Klik & drag untuk menggeser kanvas</span>
            <span>•</span>
            <span>Scroll mouse / Ctrl + Scroll untuk memperbesar</span>
          </div>
          <span class="font-mono text-[11px] text-slate-500">Cloud Network SME Architecture Viewer</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.diagram-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.55rem;
  border-radius: 6px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
  font-size: 0.75rem;
  transition: all 0.15s ease;
  cursor: pointer;
}

.diagram-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.diagram-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.highlight-btn {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: rgba(59, 130, 246, 0.3);
}

.modal-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  background: #1e293b;
  color: #f8fafc;
  border: 1px solid #334155;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.15s ease;
  cursor: pointer;
}

.modal-btn:hover:not(:disabled) {
  background: #334155;
  border-color: #60a5fa;
  color: #60a5fa;
}

/* Deep SVG Styling & Typographic Perfection */
:deep(.mermaid-svg-container svg),
:deep(.fullscreen-svg-target svg) {
  max-width: 100%;
  height: auto;
  font-family: var(--vp-font-family-base) !important;
  text-rendering: geometricPrecision;
  shape-rendering: geometricPrecision;
}

:deep(.mermaid-svg-container svg text),
:deep(.fullscreen-svg-target svg text) {
  font-family: var(--vp-font-family-base) !important;
  font-weight: 500;
}

:deep(.node rect),
:deep(.node circle),
:deep(.node polygon) {
  stroke-width: 1.75px !important;
  rx: 8px;
  ry: 8px;
}

:deep(.cluster rect) {
  stroke-width: 1.5px !important;
  stroke-dasharray: 4 2;
  rx: 10px;
  ry: 10px;
}

:deep(.actor) {
  stroke-width: 1.75px !important;
  rx: 8px;
  ry: 8px;
}

:deep(.note) {
  stroke-width: 1.5px !important;
  rx: 6px;
  ry: 6px;
}

:deep(.edgeLabel) {
  border-radius: 6px;
  padding: 2px 4px;
}
</style>
