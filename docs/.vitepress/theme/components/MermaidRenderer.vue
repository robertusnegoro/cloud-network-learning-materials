<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  code: string
}>()

const svg = ref('')
const error = ref('')
const { isDark } = useData()

const decoded = decodeURIComponent(props.code)

async function renderDiagram() {
  if (typeof window === 'undefined') return
  try {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark.value ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      themeVariables: {
        primaryColor: isDark.value ? '#3b82f6' : '#2563eb',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#1d4ed8',
        lineColor: isDark.value ? '#60a5fa' : '#3b82f6',
        secondaryColor: '#8b5cf6',
        tertiaryColor: isDark.value ? '#1e293b' : '#f8fafc'
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
})

watch(isDark, () => {
  renderDiagram()
})
</script>

<template>
  <div class="mermaid-diagram-card my-6 p-4 rounded-xl border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] flex justify-center overflow-x-auto shadow-sm">
    <div v-if="svg" v-html="svg" class="w-full flex justify-center"></div>
    <div v-else-if="error" class="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg w-full font-mono">
      <div class="font-bold mb-1">Diagram Render Warning:</div>
      <pre class="text-[11px] whitespace-pre-wrap">{{ decoded }}</pre>
    </div>
    <div v-else class="text-xs text-[var(--vp-c-text-3)] font-mono animate-pulse py-3">
      Rendering diagram...
    </div>
  </div>
</template>
