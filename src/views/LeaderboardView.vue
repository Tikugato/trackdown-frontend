<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PlayerLink from '@/components/PlayerLink.vue'
import PlayerMark from '@/components/PlayerMark.vue'
import StatFilters from '@/components/StatFilters.vue'
import { fallbackColour } from '@/game/palette'
import { avatarUrl, loadFastestBoard, loadPointsBoard, loadPools } from '@/net/http'
import type { FastestEntry, PointsEntry, PointsSort, Pool } from '@/net/protocol'
import { percent, seconds, toSearchParams, useStatFilter } from '@/stats/filter'
import { playerId } from '@/store/session'

type BoardName = 'points' | 'fastest'

const LIMIT = 50
const BOARDS: { value: BoardName; label: string }[] = [
  { value: 'points', label: 'Points' },
  { value: 'fastest', label: 'Fastest guesses' },
]
const SORTS: { value: PointsSort; label: string }[] = [
  { value: 'points', label: 'Points' },
  { value: 'solved', label: 'Solved' },
  { value: 'rounds', label: 'Rounds' },
  { value: 'games', label: 'Games' },
]
const SORT_NAMES = new Set<string>(SORTS.map((sort) => sort.value))

const route = useRoute()
const router = useRouter()
const { filter, update } = useStatFilter()

const board = computed<BoardName>(() => (route.query.board === 'fastest' ? 'fastest' : 'points'))
const sort = computed<PointsSort>(() => {
  const wanted = String(route.query.sort ?? '')
  return SORT_NAMES.has(wanted) ? (wanted as PointsSort) : 'points'
})

const pools = ref<Pool[]>([])
const points = ref<PointsEntry[]>([])
const fastest = ref<FastestEntry[]>([])
const loading = ref(true)
const failed = ref(false)
const more = ref(false)
let inFlight: AbortController | null = null

const rows = computed(() => (board.value === 'points' ? points.value.length : fastest.value.length))
const narrowedTitle = computed(() => (filter.value.song ? (fastest.value[0]?.title ?? 'one song') : ''))
const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

onMounted(async () => {
  try {
    pools.value = await loadPools()
  } catch {
    pools.value = []
  }
})

watch([filter, board, sort], () => void fetchPage(0), { immediate: true })

async function fetchPage(offset: number): Promise<void> {
  inFlight?.abort()
  const controller = new AbortController()
  inFlight = controller
  loading.value = true
  failed.value = false
  const query = toSearchParams(filter.value)
  query.set('limit', String(LIMIT))
  query.set('offset', String(offset))
  try {
    more.value = await fill(query, offset, controller.signal)
  } catch {
    if (!controller.signal.aborted) failed.value = true
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

async function fill(query: URLSearchParams, offset: number, signal: AbortSignal): Promise<boolean> {
  if (board.value === 'points') {
    query.set('sort', sort.value)
    const page = await loadPointsBoard(query, signal)
    points.value = offset ? [...points.value, ...page] : page
    return page.length === LIMIT
  }
  const page = await loadFastestBoard(query, signal)
  fastest.value = offset ? [...fastest.value, ...page] : page
  return page.length === LIMIT
}

function setBoard(next: BoardName): void {
  void router.replace({ query: { ...route.query, board: next === 'points' ? undefined : next } })
}

function setSort(next: PointsSort): void {
  void router.replace({ query: { ...route.query, sort: next === 'points' ? undefined : next } })
}

function narrowTo(songId: string): void {
  update({ ...filter.value, song: songId })
}

function widen(): void {
  update({ ...filter.value, song: '' })
}

function inkFor(entry: { player_id: string; colour?: string }): string {
  return entry.colour || fallbackColour(entry.player_id)
}
</script>

<template>
  <section class="intro">
    <h1>Leaderboards</h1>
    <p>Everyone who plays logged in shows up here. Narrow it down to the rules you care about.</p>
  </section>

  <nav class="boards">
    <button v-for="option in BOARDS" :key="option.value" type="button" :class="{ on: option.value === board }" @click="setBoard(option.value)">
      {{ option.label }}
    </button>
  </nav>

  <StatFilters :filter="filter" :pools="pools" searchable @update:filter="update" />

  <div v-if="board === 'points'" class="sorting">
    <span class="label">Sort by</span>
    <button v-for="option in SORTS" :key="option.value" type="button" :class="{ on: option.value === sort }" @click="setSort(option.value)">
      {{ option.label }}
    </button>
  </div>

  <p v-if="narrowedTitle" class="narrowed">
    <span>Only guesses on <strong>{{ narrowedTitle }}</strong></span>
    <button type="button" data-tone="plain" @click="widen">Every song</button>
  </p>

  <ol v-if="loading && rows === 0" class="board" aria-hidden="true">
    <li v-for="row in 6" :key="row" class="ghost-row">
      <span class="ghost place"></span>
      <span class="ghost who"></span>
      <span class="ghost score"></span>
    </li>
  </ol>

  <ol v-else-if="board === 'points' && points.length" class="board">
    <li v-for="entry in points" :key="entry.player_id" :class="{ you: entry.player_id === playerId }" :style="{ '--player': inkFor(entry) }">
      <span class="place">{{ entry.place }}</span>
      <PlayerMark :colour="inkFor(entry)" :avatar="avatarUrl(entry.avatar)" :name="entry.name" class="chip" />
      <PlayerLink :id="entry.player_id" linkable class="who">{{ entry.name }}</PlayerLink>
      <span class="stat">{{ entry.games }} {{ entry.games === 1 ? 'game' : 'games' }}</span>
      <span class="stat">{{ entry.solved }}/{{ entry.rounds }} · {{ percent(entry.solved, entry.rounds) }}</span>
      <span class="value">{{ entry.points }}</span>
    </li>
  </ol>

  <ol v-else-if="board === 'fastest' && fastest.length" class="board">
    <li v-for="entry in fastest" :key="entry.player_id" :class="{ you: entry.player_id === playerId }" :style="{ '--player': inkFor(entry) }">
      <span class="place">{{ entry.place }}</span>
      <PlayerMark :colour="inkFor(entry)" :avatar="avatarUrl(entry.avatar)" :name="entry.name" class="chip" />
      <PlayerLink :id="entry.player_id" linkable class="who">{{ entry.name }}</PlayerLink>
      <button type="button" class="song" @click="narrowTo(entry.song_id)">{{ entry.title }}</button>
      <span class="stat">{{ when.format(new Date(entry.set_at)) }}</span>
      <span class="value">{{ seconds(entry.solved_ms) }}</span>
    </li>
  </ol>

  <p v-else-if="failed" class="empty" role="alert">Could not reach the server.</p>

  <p v-else class="empty">Nothing matches that yet. Guests do not count, so log in with Discord before you play to show up here.</p>

  <button v-if="more && !loading" type="button" data-tone="quiet" class="more" @click="fetchPage(rows)">Show more</button>
</template>

<style scoped>
.intro {
  padding-bottom: var(--space-24);
}

h1 {
  font-size: var(--text-display);
  font-weight: 200;
  letter-spacing: -0.02em;
}

.intro p {
  margin-top: var(--space-12);
  color: var(--ink-soft);
  max-width: 52ch;
}

.boards {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-24);
  padding-bottom: var(--space-16);
}

.boards button {
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 300;
  color: var(--ink-faint);
  border-bottom: 2px solid transparent;
  padding-bottom: var(--space-4);
}

.boards button.on {
  color: var(--ink);
  font-weight: 500;
  border-bottom-color: var(--spot-red);
}

.sorting {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-16);
  padding-block: var(--space-12);
}

.label {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.sorting button {
  color: var(--ink-faint);
  border-bottom: 2px solid transparent;
}

.sorting button.on {
  color: var(--ink);
  font-weight: 700;
  border-bottom-color: var(--spot-red);
}

.narrowed {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-16);
  padding-block: var(--space-12);
  color: var(--ink-soft);
}

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

.more {
  margin-top: var(--space-24);
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
