<script setup lang="ts">
import { computed } from 'vue'
import PlayerLink from '@/components/PlayerLink.vue'
import PlayerMark from '@/components/PlayerMark.vue'
import { fallbackColour } from '@/game/palette'
import { avatarUrl } from '@/net/http'
import type { Friend, Person } from '@/net/protocol'

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const props = defineProps<{ person: Person | Friend }>()

const ink = computed(() => props.person.colour || fallbackColour(props.person.player_id))
const state = computed(() => ('online' in props.person ? standing(props.person) : ''))
const away = computed(() => 'online' in props.person && !props.person.online)

function standing(friend: Friend): string {
  if (friend.code) return `in ${friend.code}`
  if (friend.online) return 'online'
  return lastSeen(friend.last_seen)
}

function lastSeen(stamp?: string): string {
  const at = stamp ? Date.parse(stamp) : Number.NaN
  if (Number.isNaN(at)) return 'offline'
  const gap = Date.now() - at
  const step = STEPS.find(([, span]) => gap >= span)
  if (!step) return 'just now'
  return relative.format(-Math.floor(gap / step[1]), step[0])
}
</script>

<template>
  <li :class="{ away }" :style="{ '--player': ink }">
    <PlayerMark :colour="ink" :avatar="avatarUrl(person.avatar)" :name="person.name" class="chip" />
    <PlayerLink :id="person.player_id" linkable class="who">{{ person.name }}</PlayerLink>
    <span v-if="state" class="state">{{ state }}</span>
    <slot />
  </li>
</template>

<style scoped>
li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-12);
  padding-block: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

li.away {
  opacity: 0.6;
}

.chip {
  --mark: 1.5rem;
}

.who {
  flex: 1;
  min-width: 8ch;
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 500;
  color: color-mix(in oklab, var(--player) 78%, var(--ink));
}

.state {
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}
</style>
