<script setup lang="ts">
import { computed } from 'vue'
import PlayerLink from '@/components/PlayerLink.vue'
import PlayerMark from '@/components/PlayerMark.vue'
import { fallbackColour } from '@/game/palette'
import { ago } from '@/game/when'
import { avatarUrl } from '@/net/http'
import type { Friend, Person } from '@/net/protocol'

const props = defineProps<{ person: Person | Friend }>()

const ink = computed(() => props.person.colour || fallbackColour(props.person.player_id))
const state = computed(() => ('online' in props.person ? standing(props.person) : ''))
const away = computed(() => 'online' in props.person && !props.person.online)

function standing(friend: Friend): string {
  if (friend.code) return `in ${friend.code}`
  if (friend.online) return 'online'
  return ago(friend.last_seen) || 'offline'
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
