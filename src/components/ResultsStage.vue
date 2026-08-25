<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PlayerLink from '@/components/PlayerLink.vue'
import PlayerMark from '@/components/PlayerMark.vue'
import {
  avatarOf,
  dismissResults,
  feed,
  inkOf,
  isHost,
  leaveLobby,
  nameOf,
  profileable,
  roundsPlayed,
  solveCounts,
  standings,
  startGame,
} from '@/store/game'
import { playerId } from '@/store/session'

const router = useRouter()

const winner = computed(() => standings.value[0] ?? null)
const solo = computed(() => standings.value.length === 1)
const mine = computed(() => standings.value.find((player) => player.player_id === playerId.value) ?? null)
const iWon = computed(() => winner.value?.player_id === playerId.value)

const headline = computed(() => {
  if (!winner.value) return 'Game over'
  if (solo.value) return 'That is a wrap'
  return iWon.value ? 'You win' : `${nameOf(winner.value.player_id)} wins`
})

const subline = computed(() => {
  const me = mine.value
  if (!me) return ''
  const got = solveCounts.get(me.player_id) ?? 0
  return `You got ${got} of ${roundsPlayed.value}`
})

const played = computed(() =>
  feed.value.flatMap((entry) => (entry.kind === 'divider' ? [{ ordinal: entry.ordinal, title: entry.title }] : [])),
)

function solvesFor(id: string): number {
  return solveCounts.get(id) ?? 0
}

function again(): void {
  dismissResults()
  startGame()
}

function quit(): void {
  leaveLobby()
  void router.push('/')
}
</script>

<template>
  <section class="crown">
    <p class="label">After {{ roundsPlayed }} rounds</p>
    <h1 :style="winner ? { '--player': inkOf(winner.player_id) } : undefined">{{ headline }}</h1>
    <p v-if="subline" class="sub">{{ subline }}</p>
  </section>

  <section class="table">
    <h2>Standings</h2>
    <ol>
      <li
        v-for="player in standings"
        :key="player.player_id"
        :class="{ you: player.player_id === playerId, top: player.place === 1 }"
        :style="{ '--player': inkOf(player.player_id) }"
      >
        <span class="place">{{ player.place }}</span>
        <PlayerMark
          :colour="inkOf(player.player_id)"
          :avatar="avatarOf(player.player_id)"
          :name="nameOf(player.player_id)"
          class="chip"
        />
        <PlayerLink :id="player.player_id" :linkable="profileable(player.player_id)" new-tab class="who">
          {{ nameOf(player.player_id) }}
        </PlayerLink>
        <span v-if="player.player_id === playerId" class="tag">you</span>
        <span class="solves">{{ solvesFor(player.player_id) }} right</span>
        <span class="score">{{ player.score }}</span>
      </li>
    </ol>
  </section>

  <section v-if="played.length" class="played">
    <h2>What you sat through</h2>
    <ol>
      <li v-for="track in played" :key="track.ordinal">
        <span class="ordinal">{{ track.ordinal }}</span>
        <span class="title">{{ track.title }}</span>
      </li>
    </ol>
  </section>

  <div class="actions">
    <button v-if="isHost" type="button" data-tone="loud" @click="again">Run it back</button>
    <button type="button" data-tone="quiet" @click="dismissResults">Back to the lobby</button>
    <button type="button" data-tone="plain" @click="quit">Leave</button>
  </div>
</template>

<style scoped>
.crown {
  padding-block: var(--space-16) var(--space-32);
  border-bottom: 1px solid var(--rule);
}

.label {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

h1 {
  margin-top: var(--space-8);
  font-size: var(--text-display-xl);
  font-weight: 200;
  line-height: 1.02;
  letter-spacing: -0.03em;
  color: color-mix(in oklab, var(--player, var(--ink)) 78%, var(--ink));
  animation: rise var(--dur-slow) var(--ease-out);
}

.sub {
  margin-top: var(--space-12);
  font-size: var(--text-heading);
  font-family: var(--font-display);
  font-weight: 300;
  color: var(--ink-soft);
}

h2 {
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

.table {
  margin-top: var(--space-32);
}

.table li {
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

li.top .place {
  color: var(--ink);
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

li.top .who {
  font-size: var(--text-title);
  font-weight: 600;
}

.tag,
.solves {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.score {
  width: 5ch;
  text-align: right;
  font-weight: 700;
}

li.top .score {
  font-size: var(--text-heading);
}

.played {
  margin-top: var(--space-32);
}

.played li {
  display: flex;
  align-items: baseline;
  gap: var(--space-12);
  padding-block: var(--space-4);
  border-bottom: 1px solid var(--rule);
}

.ordinal {
  width: 3ch;
  font-size: var(--text-micro);
  font-weight: 700;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.played .title {
  font-family: var(--font-display);
  font-weight: 500;
  color: var(--ink-soft);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-16);
  margin-top: var(--space-48);
}

@keyframes rise {
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 40rem) {
  h1 {
    font-size: var(--text-display);
  }

  .solves {
    display: none;
  }
}
</style>
