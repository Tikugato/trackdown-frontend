<script setup lang="ts">
import { computed } from 'vue'
import ProgressRail from '@/components/ProgressRail.vue'
import { useTicker } from '@/game/useTicker'
import { toLocalTime } from '@/net/clock'

const props = defineProps<{ playAtMs: number; deadlineMs: number }>()

const { now } = useTicker(1000)

const remaining = computed(() => toLocalTime(props.deadlineMs) - now.value)
const span = computed(() => Math.max(1, props.deadlineMs - props.playAtMs))
const fraction = computed(() => Math.min(1, Math.max(0, remaining.value / span.value)))
const seconds = computed(() => Math.max(0, Math.ceil(remaining.value / 1000)))
const urgent = computed(() => remaining.value <= 5000)
</script>

<template>
  <div class="clock">
    <div class="row">
      <slot />
      <p class="seconds" :class="{ urgent }" role="timer" :aria-label="`${seconds} seconds left`">{{ seconds }}</p>
    </div>
    <ProgressRail :fraction="fraction" tone="var(--spot-red)" />
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-16);
  padding-bottom: var(--space-8);
}

.seconds {
  font-variant-numeric: tabular-nums;
  font-size: var(--text-title);
  font-weight: 700;
  line-height: 1;
  color: var(--ink);
}

.seconds.urgent {
  color: var(--spot-red-text);
}
</style>
