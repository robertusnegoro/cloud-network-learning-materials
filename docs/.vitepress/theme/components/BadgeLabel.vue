<script setup lang="ts">
defineProps<{
  type?: 'sme' | 'aws' | 'rfc' | 'warning' | 'tip'
  text: string
}>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider',
      type === 'sme' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
      type === 'aws' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/30' :
      type === 'rfc' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
      type === 'warning' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
      'bg-blue-500/10 text-blue-400 border border-blue-500/30'
    ]"
  >
    {{ text }}
  </span>
</template>
