<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ChatColumn from '@/components/ChatColumn.vue'
import PlayerLink from '@/components/PlayerLink.vue'
import PlayerMark from '@/components/PlayerMark.vue'
import TrackLink from '@/components/TrackLink.vue'
import {
  type FeedEntry,
  avatarOf,
  dismissResults,
  feed,
  feedRows,
  inkOf,
  isHost,
  leaveLobby,
  nameOf,
  profileable,
  roundsPlayed,
  say,
  solveCounts,
  standings,
  startGame,
} from '@/store/game'
import type { Reveal } from '@/net/protocol'
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

type Heard = { ordinal: number; track: Reveal; got: boolean }

const played = computed(() => heardBy(thisGame(feed.value), playerId.value))

function heardBy(entries: FeedEntry[], id: string): Heard[] {
  const heard: Heard[] = []
  let got = false
  for (const entry of entries) {
    if (entry.kind === 'solved' && entry.playerId === id) got = true
    if (entry.kind !== 'divider') continue
    heard.push({ ordinal: entry.ordinal, track: entry.track, got })
    got = false
  }
  return heard
}

function thisGame(entries: FeedEntry[]): FeedEntry[] {
  let start = 0
  entries.forEach((entry, index) => {
    if (entry.kind === 'game' && !entry.over) start = index
  })
  return entries.slice(start)
}

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
    <h2>What you heard</h2>
    <ol>
      <li v-for="track in played" :key="track.ordinal">
        <span class="ordinal">{{ track.ordinal }}</span>
        <TrackLink :track="track.track" class="title" />
        <svg class="verdict" :class="track.got ? 'hit' : 'miss'" viewBox="0 0 16 16" role="img" :aria-label="track.got ? 'You got it' : 'You missed it'">
          <path v-if="track.got" d="M2.5 8.5 L6.5 12.5 L13.5 4.5" />
          <path v-else d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5" />
        </svg>
      </li>
    </ol>
  </section>

  <ChatColumn :rows="feedRows" empty="Talk it over while the host decides." class="talk" @say="say" />

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
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-weight: 500;
  color: var(--ink-soft);
}

.verdict {
  width: 1rem;
  height: 1rem;
  flex: none;
  align-self: center;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.25;
  stroke-linecap: square;
}

.verdict.hit {
  color: var(--spot-green);
}

.verdict.miss {
  color: var(--ink-faint);
}

.talk {
  margin-top: var(--space-32);
}

.talk :deep(h2) {
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
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
