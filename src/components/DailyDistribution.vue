<script setup lang="ts">
import type { DistRow } from '@/game/daily'

defineProps<{ rows: DistRow[]; total: number }>()
</script>

<template>
  <section class="dist">
    <div class="head">
      <h3>Where people got it</h3>
      <span class="total">{{ total }} {{ total === 1 ? 'finish' : 'finishes' }}</span>
    </div>
    <ul>
      <li v-for="row in rows" :key="row.key" :class="{ mine: row.mine, blank: row.count === 0 }">
        <span class="time">{{ row.label }}</span>
        <span class="track">
          <span class="fill" :style="{ transform: `scaleX(${row.fraction})` }"></span>
        </span>
        <span class="count">{{ row.count }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-16);
  padding-bottom: var(--space-12);
}

h3 {
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.total {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

li {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  padding-block: var(--space-8);
}

.time {
  width: 4ch;
  flex: none;
  font-size: var(--text-small);
  font-weight: 700;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.track {
  flex: 1;
  height: 0.9rem;
  background: var(--ground-sunk);
  overflow: hidden;
}

.fill {
  display: block;
  height: 100%;
  transform-origin: left center;
  background: var(--ink-faint);
  will-change: transform;
  transition: transform var(--dur-slow) var(--ease-out);
}

li.mine .fill {
  background: var(--spot-green);
}

li.blank .track {
  background: transparent;
  border-bottom: 1px solid var(--rule);
}

.count {
  width: 3ch;
  flex: none;
  font-size: var(--text-small);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

li.blank .count {
  color: var(--ink-faint);
}

li.mine .count {
  color: var(--spot-green-text);
}

@media (prefers-reduced-motion: reduce) {
  .fill {
    transition: none;
  }
}
</style>
