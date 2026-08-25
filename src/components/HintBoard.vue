<script setup lang="ts">
import { HINT_LABELS, boardOrder, isRating, parseRating } from '@/game/hints'
import type { HintKind, RatingKind } from '@/net/protocol'

defineProps<{
  revealed: Map<HintKind, string>
  missing: Set<HintKind>
  rating: RatingKind
  live: boolean
}>()

const emit = defineEmits<{ ask: [kind: HintKind] }>()
</script>

<template>
  <section class="hints">
    <h2>Hints</h2>
    <ul class="rows">
      <li v-for="kind in boardOrder(rating)" :key="kind" :class="{ open: revealed.has(kind) }">
        <span class="label">{{ HINT_LABELS[kind] }}</span>

        <ul v-if="isRating(kind) && revealed.has(kind)" class="diffs">
          <li v-for="row in parseRating(revealed.get(kind) ?? '')" :key="row.name" :style="{ '--diff': row.tone }">
            <span class="diff">{{ row.name }}</span>
            <span class="rating">
              <svg v-if="kind === 'stars'" class="star" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"
                />
              </svg>
              {{ row.rating }}
            </span>
          </li>
        </ul>

        <span v-else-if="kind === 'cover' && revealed.has(kind)" class="value">Revealed</span>
        <span v-else-if="revealed.has(kind)" class="value">{{ revealed.get(kind) }}</span>
        <span v-else-if="missing.has(kind)" class="absent">not this round</span>
        <button v-else type="button" data-tone="plain" :disabled="!live" @click="emit('ask', kind)">Reveal</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h2 {
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

.rows > li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4) var(--space-12);
  padding-block: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

.label {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.rows > li.open .label {
  color: var(--spot-blue-text);
}

.value {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 700;
  color: var(--spot-blue-text);
  text-align: right;
  text-wrap: pretty;
  animation: reveal var(--dur-slow) var(--ease-out);
}

.absent {
  font-size: var(--text-micro);
  color: var(--ink-faint);
}

.diffs {
  flex: 1 1 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
  animation: reveal var(--dur-slow) var(--ease-out);
}

.diffs li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-8);
}

.diff {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: color-mix(in oklab, var(--diff) 78%, var(--ink));
}

.rating {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: color-mix(in oklab, var(--diff) 78%, var(--ink));
}

.star {
  width: 0.8em;
  height: 0.8em;
  fill: var(--diff);
}

@keyframes reveal {
  from {
    transform: translateY(-4px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
