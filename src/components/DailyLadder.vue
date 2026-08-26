<script setup lang="ts">
import { clipLabel, markAt, type StepMark } from '@/game/daily'

const props = defineProps<{ ladder: number[]; step: number; done: boolean; pattern: string }>()

const NAMES: Record<StepMark, string> = { x: 'wrong guess', '-': 'skipped', o: 'got it' }

function markFor(index: number): StepMark | undefined {
  return markAt(props.pattern, index)
}

function stateOf(index: number): string {
  const mark = markFor(index)
  if (mark) return NAMES[mark]
  if (!props.done && index === props.step) return 'playing now'
  return 'not reached'
}
</script>

<template>
  <ol class="ladder" aria-label="Clip lengths">
    <li
      v-for="(ms, index) in ladder"
      :key="ms"
      :class="{ current: !done && index === step, hit: markFor(index) === 'o', burned: markFor(index) === 'x' || markFor(index) === '-' }"
    >
      <span class="length">{{ clipLabel(ms) }}</span>
      <span v-if="markFor(index)" class="mark" :data-mark="markFor(index)" aria-hidden="true"></span>
      <span class="visually-hidden">{{ stateOf(index) }}</span>
    </li>
  </ol>
</template>

<style scoped>
.ladder {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-8);
}

.ladder li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-8);
  border-bottom: var(--rail) solid var(--ground-sunk);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--ink-faint);
  transition: border-color var(--dur-mid) var(--ease-out), color var(--dur-mid) var(--ease-out);
}

.ladder li.current {
  color: var(--ink);
  border-bottom-color: var(--spot-red);
}

.ladder li.burned {
  border-bottom-color: var(--ink-faint);
}

.ladder li.hit {
  color: var(--spot-green-text);
  border-bottom-color: var(--spot-green);
}

.mark {
  width: var(--mark);
  height: var(--mark);
  border: 2px solid currentColor;
  flex: none;
}

.mark[data-mark='x'] {
  background: currentColor;
}

.mark[data-mark='o'] {
  background: var(--spot-green);
  border-color: var(--spot-green);
  transform: rotate(45deg);
  animation: stamp var(--dur-slow) var(--ease-out);
}

@keyframes stamp {
  from {
    transform: rotate(45deg) scale(2);
    opacity: 0;
  }
  to {
    transform: rotate(45deg) scale(1);
    opacity: 1;
  }
}

@media (max-width: 40rem) {
  .ladder {
    gap: var(--space-4);
  }

  .ladder li {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
