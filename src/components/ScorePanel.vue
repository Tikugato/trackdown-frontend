<script setup lang="ts">
import PlayerLink from '@/components/PlayerLink.vue'
import PlayerMark from '@/components/PlayerMark.vue'

export type ScoreRow = {
  id: string
  name: string
  ink: string
  avatar: string
  score: number
  you: boolean
  present: boolean
  solved: boolean
  linkable: boolean
}

defineProps<{ rows: ScoreRow[] }>()
</script>

<template>
  <section class="scores">
    <h2>Score</h2>
    <ul>
      <li
        v-for="row in rows"
        :key="row.id"
        :class="{ you: row.you, gone: !row.present, solved: row.solved }"
        :style="{ '--player': row.ink }"
      >
        <PlayerMark :colour="row.ink" :avatar="row.avatar" :name="row.name" class="mark" />
        <PlayerLink :id="row.id" :linkable="row.linkable" new-tab class="who">{{ row.name }}</PlayerLink>
        <span class="value">{{ row.score }}</span>
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

li {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding-block: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

.mark {
  --mark: 1.15rem;
  outline: 1px solid color-mix(in oklab, var(--player) 60%, var(--ink));
  outline-offset: -1px;
  transition: transform var(--dur-mid) var(--ease-out);
}

li.solved .mark {
  outline: 2px solid var(--spot-green);
  animation: pop var(--dur-slow) var(--ease-out);
}

.who {
  flex: 1;
  font-family: var(--font-display);
  font-weight: 500;
  color: color-mix(in oklab, var(--player) 78%, var(--ink));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

li.you .who {
  font-weight: 600;
}

li.gone {
  opacity: 0.5;
}

.value {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

li.solved .value {
  color: var(--spot-green-text);
  animation: count var(--dur-slow) var(--ease-out);
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(2.1) rotate(45deg);
  }
  100% {
    transform: scale(1) rotate(45deg);
  }
}

@keyframes count {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  li.solved .mark {
    transform: rotate(45deg);
  }
}

@media (max-width: 52rem) {
  .scores {
    display: flex;
    align-items: center;
    gap: var(--space-16);
    border-bottom: 1px solid var(--rule);
  }

  h2 {
    border: 0;
    padding: 0;
    flex: none;
  }

  ul {
    display: flex;
    gap: var(--space-16);
    overflow-x: auto;
  }

  li {
    border: 0;
    padding-block: var(--space-4);
  }

  .who {
    flex: none;
  }
}
</style>
