<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BoardList from '@/components/BoardList.vue'
import StatFilters from '@/components/StatFilters.vue'
import { loadDailyBoard, loadFastestBoard, loadPointsBoard, loadPools } from '@/net/http'
import type { DailyEntry, FastestEntry, PointsEntry, PointsSort, Pool } from '@/net/protocol'
import { trackLabel } from '@/game/track'
import { type BoardRow, dailyRows, fastestRows, pointsRows } from '@/stats/board'
import { toSearchParams, useStatFilter } from '@/stats/filter'
import { accountKind, playerId } from '@/store/session'

type BoardName = 'points' | 'fastest' | 'daily'

const LIMIT = 50
const BOARDS: { value: BoardName; label: string }[] = [
  { value: 'points', label: 'Points' },
  { value: 'fastest', label: 'Fastest guesses' },
  { value: 'daily', label: 'Daily' },
]
const BOARD_NAMES = new Set<string>(BOARDS.map((board) => board.value))
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

const board = computed<BoardName>(() => {
  const wanted = String(route.query.board ?? '')
  return BOARD_NAMES.has(wanted) ? (wanted as BoardName) : 'points'
})
const sort = computed<PointsSort>(() => {
  const wanted = String(route.query.sort ?? '')
  return SORT_NAMES.has(wanted) ? (wanted as PointsSort) : 'points'
})
const member = computed(() => accountKind.value === 'discord')

const pools = ref<Pool[]>([])
const points = ref<PointsEntry[]>([])
const fastest = ref<FastestEntry[]>([])
const daily = ref<DailyEntry[]>([])
const loading = ref(true)
const failed = ref(false)
const more = ref(false)
let inFlight: AbortController | null = null

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

const rows = computed<BoardRow[]>(() => {
  if (board.value === 'points') return pointsRows(points.value, playerId.value)
  if (board.value === 'fastest') return fastestRows(fastest.value, playerId.value, when)
  return dailyRows(daily.value, playerId.value, filter.value.time === 'today')
})
const narrowedTitle = computed(() => (filter.value.song ? (fastest.value[0] ? trackLabel(fastest.value[0]) : 'one song') : ''))
const empty = computed(() =>
  filter.value.friends
    ? 'None of your friends match that yet.'
    : 'Nothing matches that yet. Guests do not count, so log in with Discord before you play to show up here.',
)

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
  if (board.value === 'fastest') {
    const page = await loadFastestBoard(query, signal)
    fastest.value = offset ? [...fastest.value, ...page] : page
    return page.length === LIMIT
  }
  const page = await loadDailyBoard(query, signal)
  daily.value = offset ? [...daily.value, ...page] : page
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

  <StatFilters :filter="filter" :pools="pools" searchable :daily="board === 'daily'" :member="member" @update:filter="update" />

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

  <BoardList :rows="rows" :loading="loading" :failed="failed" :empty="empty" @song="narrowTo" />

  <button v-if="more && !loading" type="button" data-tone="quiet" class="more" @click="fetchPage(rows.length)">Show more</button>
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

.more {
  margin-top: var(--space-24);
}
</style>
