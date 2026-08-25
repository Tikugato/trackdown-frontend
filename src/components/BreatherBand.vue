<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ProgressRail from '@/components/ProgressRail.vue'
import { useTicker } from '@/game/useTicker'
import type { Breather, BreatherTone } from '@/store/game'

const TONES: Record<BreatherTone, string> = {
  won: 'var(--spot-red)',
  lost: 'var(--spot-blue)',
  cold: 'var(--spot-ochre)',
}

const props = defineProps<{ breather: Breather }>()

const { now, measure } = useTicker(250)
const from = ref(Date.now())

const tone = computed(() => TONES[props.breather.tone])
const span = computed(() => Math.max(1, props.breather.until - from.value))
const fraction = computed(() => Math.min(1, Math.max(0, (props.breather.until - now.value) / span.value)))

watch(
  () => props.breather.until,
  () => {
    from.value = Date.now()
    measure()
  },
)
</script>

<template>
  <div class="band" :style="{ '--tone': tone }">
    <div class="row">
      <p class="headline">{{ breather.headline }}</p>
      <p class="next">Next clip</p>
    </div>
    <ProgressRail :fraction="fraction" :tone="tone" />
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

.headline {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  line-height: 1;
  color: var(--tone);
  animation: stamp var(--dur-slow) var(--ease-out);
}

.next {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

@keyframes stamp {
  from {
    transform: translateY(6px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
