<script setup lang="ts">
import { trackLabel } from '@/game/track'
import type { Reveal } from '@/net/protocol'

defineProps<{ track: Reveal }>()
</script>

<template>
  <a v-if="track.source_url" :href="track.source_url" target="_blank" rel="noopener noreferrer">{{ trackLabel(track) }}</a>
  <span v-else>{{ trackLabel(track) }}</span>
</template>

<style scoped>
a {
  color: inherit;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
  text-decoration-color: var(--rule);
}
</style>
