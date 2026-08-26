<script setup lang="ts">
import PlayerLink from '@/components/PlayerLink.vue'
import PlayerMark from '@/components/PlayerMark.vue'
import type { BoardRow } from '@/stats/board'

defineProps<{ rows: BoardRow[]; loading: boolean; failed: boolean; empty: string }>()
const emit = defineEmits<{ song: [id: string] }>()
</script>

<template>
  <ol v-if="loading && rows.length === 0" class="board" aria-hidden="true">
    <li v-for="row in 6" :key="row" class="ghost-row">
      <span class="ghost place"></span>
      <span class="ghost who"></span>
      <span class="ghost score"></span>
    </li>
  </ol>

  <ol v-else-if="rows.length" class="board">
    <li v-for="row in rows" :key="row.key" :class="{ you: row.you }" :style="{ '--player': row.ink }">
      <span class="place">{{ row.place }}</span>
      <PlayerMark :colour="row.ink" :avatar="row.avatar" :name="row.name" class="chip" />
      <PlayerLink :id="row.playerId" linkable class="who">{{ row.name }}</PlayerLink>
      <button v-if="row.song" type="button" class="song" @click="emit('song', row.song.id)">{{ row.song.title }}</button>
      <span v-for="stat in row.stats" :key="stat" class="stat">{{ stat }}</span>
      <span class="value">{{ row.value }}</span>
    </li>
  </ol>

  <p v-else-if="failed" class="empty" role="alert">Could not reach the server.</p>

  <p v-else class="empty">{{ empty }}</p>
</template>

<style scoped>
.board {
  border-top: 1px solid var(--rule);
}

.board li {
  display: flex;
  align-items: baseline;
  gap: var(--space-12);
  padding-block: var(--space-12);
  border-bottom: 1px solid var(--rule);
  font-variant-numeric: tabular-nums;
}

.place {
  width: 3ch;
  font-weight: 700;
  color: var(--ink-faint);
}

.chip {
  --mark: 1.6rem;
  align-self: center;
}

.who {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 500;
  color: color-mix(in oklab, var(--player) 78%, var(--ink));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

li.you .who {
  font-weight: 600;
}

.song {
  flex: 1;
  min-width: 0;
  text-align: left;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0;
}

.song:hover {
  color: var(--spot-blue-text);
}

.stat {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.value {
  width: 6ch;
  text-align: right;
  font-weight: 700;
}

.empty {
  padding-block: var(--space-24);
  color: var(--ink-faint);
}

.ghost-row {
  display: flex;
  gap: var(--space-12);
  padding-block: var(--space-12);
  border-bottom: 1px solid var(--rule);
}

.ghost {
  display: block;
  height: 1.2em;
  background: var(--ground-sunk);
}

.ghost.place {
  width: 3ch;
}

.ghost.who {
  flex: 1;
  max-width: 14ch;
}

.ghost.score {
  width: 4ch;
}

@media (max-width: 40rem) {
  .stat {
    display: none;
  }
}
</style>
