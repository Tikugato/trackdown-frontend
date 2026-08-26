<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import PlayerLink from '@/components/PlayerLink.vue'
import TrackLink from '@/components/TrackLink.vue'
import type { FeedRow } from '@/game/feed'

const props = defineProps<{ rows: FeedRow[]; empty: string }>()

const shell = ref<HTMLElement | null>(null)
const pinned = ref(true)

watch(
  () => props.rows.length,
  async () => {
    if (!pinned.value) return
    await nextTick()
    shell.value?.scrollTo({ top: shell.value.scrollHeight })
  },
)

function onScroll(): void {
  const element = shell.value
  if (!element) return
  pinned.value = element.scrollHeight - element.scrollTop - element.clientHeight < 48
}
</script>

<template>
  <div ref="shell" class="feed" role="log" @scroll="onScroll">
    <div class="spacer"></div>

    <p v-if="!rows.length" class="empty">{{ empty }}</p>

    <template v-for="row in rows" :key="row.key">
      <p v-if="row.kind === 'game'" class="game">{{ row.text }}</p>

      <p v-else-if="row.kind === 'divider'" class="divider">
        <span>{{ row.text }}</span>
        <TrackLink :track="row.track" class="answer" />
      </p>

      <p v-else-if="row.kind === 'presence' || row.kind === 'skip'" class="presence">{{ row.text }}</p>

      <p v-else-if="row.kind === 'solved'" class="solved">
        <span class="mark" aria-hidden="true"></span>
        <PlayerLink :id="row.playerId" :linkable="row.linkable" new-tab class="who" :style="{ '--player': row.ink }">
          {{ row.who }}
        </PlayerLink>
        <span class="detail">{{ row.detail }}</span>
      </p>

      <p v-else class="line" :class="{ mine: row.mine }">
        <PlayerLink :id="row.playerId" :linkable="row.linkable" new-tab class="who" :style="{ '--player': row.ink }">
          {{ row.who }}
        </PlayerLink>
        <span class="text">{{ row.text }}</span>
      </p>
    </template>
  </div>
</template>

<style scoped>
.feed {
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-right: var(--space-8);
}

.feed p {
  max-width: none;
}

.spacer {
  margin-top: auto;
}

.empty {
  color: var(--ink-faint);
  font-size: var(--text-small);
  padding-block: var(--space-16);
}

.line {
  display: flex;
  gap: var(--space-8);
  padding-block: var(--space-4);
  border-bottom: 1px solid var(--rule);
  word-break: break-word;
}

.who {
  font-family: var(--font-display);
  font-weight: 600;
  flex: none;
  color: color-mix(in oklab, var(--player) 78%, var(--ink));
}

.line.mine .text {
  color: var(--ink-soft);
}

.text {
  color: var(--ink);
}

.solved {
  display: flex;
  align-items: baseline;
  gap: var(--space-8);
  padding-block: var(--space-8);
  padding-left: var(--space-12);
  border-bottom: 1px solid var(--rule);
  animation: land var(--dur-slow) var(--ease-out);
}

.solved .who {
  font-size: var(--text-heading);
}

.solved .detail {
  font-size: var(--text-small);
  color: var(--spot-green-text);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.mark {
  width: var(--mark);
  height: var(--mark);
  background: var(--spot-green);
  flex: none;
  align-self: center;
  transform: rotate(45deg);
}

.divider {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-8);
  margin-top: var(--space-16);
  padding-top: var(--space-8);
  border-top: 1px solid var(--ink-faint);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.answer {
  font-family: var(--font-display);
  font-size: var(--text-small);
  font-weight: 500;
  letter-spacing: 0;
  color: var(--ink-soft);
}

.presence {
  font-size: var(--text-micro);
  color: var(--ink-faint);
  padding-block: var(--space-4);
}

.game {
  margin-top: var(--space-24);
  padding-top: var(--space-8);
  border-top: 2px solid var(--ink);
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 500;
  color: var(--ink);
}

@keyframes land {
  from {
    transform: translateX(-10px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
