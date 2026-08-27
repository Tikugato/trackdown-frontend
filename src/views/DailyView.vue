<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BoardList from '@/components/BoardList.vue'
import DailyDistribution from '@/components/DailyDistribution.vue'
import DailyLadder from '@/components/DailyLadder.vue'
import DailyLock from '@/components/DailyLock.vue'
import GuessInput from '@/components/GuessInput.vue'
import HintBoard from '@/components/HintBoard.vue'
import TrackPlate from '@/components/TrackPlate.vue'
import {
  type ClipState,
  clipReady,
  clipSlow,
  clipState,
  loadClip,
  releaseClip,
  replayClip,
  setVolume,
  soundBlocked,
  stopClip,
  unlockAudio,
  volume,
} from '@/game/clip'
import { clipLabel, distRows, distTotal, nextDailyAt, shareText, type DistRow } from '@/game/daily'
import { boardOrder } from '@/game/hints'
import { apiUrl, loadDailyBoard, loadDailyDistribution, loginUrl } from '@/net/http'
import type { HintKind } from '@/net/protocol'
import { dailyRows } from '@/stats/board'
import { askDailyHint, busy, closeDaily, failure, guessDaily, openDaily, skipDaily, state, verdict } from '@/store/daily'
import { ensurePools, poolIdOf, pools } from '@/store/pools'
import { accountKind, playerId } from '@/store/session'
import { readStored, writeStored } from '@/store/storage'

const POOL_KEY = 'trackdown.daily.pool'
const NEAR_MISS_FLASH_MS = 2500
const STANDINGS_LIMIT = 20

const PLAYBACK: Record<ClipState, string> = {
  idle: 'Listen again',
  fetching: 'Cutting the clip',
  decoding: 'Getting it ready',
  ready: 'Ready',
  playing: 'Playing',
  failed: 'The clip did not load',
}

const route = useRoute()
const router = useRouter()

const nearMiss = ref(false)
const copied = ref(false)
const standings = ref<ReturnType<typeof dailyRows>>([])
const standingsLoading = ref(false)
const standingsFailed = ref(false)
const distribution = ref<DistRow[]>([])
const distributionTotal = ref(0)
let standingsRequest: AbortController | null = null
let distributionRequest: AbortController | null = null
let heard = ''

const member = computed(() => accountKind.value === 'discord')
const poolId = computed(() => {
  const wanted = poolIdOf(String(route.query.pool ?? ''))
  if (wanted) return wanted
  const remembered = readStored(localStorage, POOL_KEY)
  return pools.value.some((pool) => pool.id === remembered) ? remembered : (pools.value[0]?.id ?? '')
})
const chosen = computed(() => pools.value.find((pool) => pool.id === poolId.value))
const poolName = computed(() => chosen.value?.name ?? '')
const poolSlug = computed(() => chosen.value?.slug ?? '')
const done = computed(() => state.value?.done ?? false)
const revealed = computed(() => {
  const held = new Map<HintKind, string>()
  for (const [kind, value] of Object.entries(state.value?.hints ?? {}) as [HintKind, string][]) {
    held.set(kind, kind === 'cover' ? apiUrl(value) : value)
  }
  return held
})
const missing = computed(() => {
  const offered = new Set(state.value?.hint_kinds ?? [])
  return new Set(boardOrder(state.value?.rating ?? 'stars', false).filter((kind) => !offered.has(kind)))
})
const playingTrack = computed(() => done.value && clipState.value === 'playing')
const playLabel = computed(() => {
  if (!state.value) return 'Play'
  if (playingTrack.value) return 'Stop track'
  return state.value.done ? 'Play the track' : `Play ${clipLabel(state.value.clip_length_ms)}`
})
const playback = computed(() => PLAYBACK[clipState.value])
const playbackNote = computed(() =>
  clipSlow.value && clipState.value === 'fetching' ? 'Nobody has played this track before, so it is being fetched.' : '',
)
const solvedMs = computed(() => {
  const held = state.value
  if (!held?.solved) return 0
  return held.pattern.endsWith('o') ? (held.ladder_ms[held.pattern.length - 1] ?? held.clip_length_ms) : held.clip_length_ms
})
const headline = computed(() => {
  if (!state.value?.done) return ''
  return state.value.solved ? `Got it at ${clipLabel(solvedMs.value)}` : 'Not today'
})
const resultMarks = computed(() => [...(state.value?.pattern ?? '')].filter((mark) => mark === 'x' || mark === '-' || mark === 'o'))
const dateLabel = computed(() => {
  if (!state.value) return ''
  const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' })
  return day.format(new Date(`${state.value.date}T00:00:00Z`))
})
const nextLabel = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(nextDailyAt())
const boardQuery = computed(() => ({ board: 'daily', pools: poolSlug.value, time: 'today' }))

onMounted(async () => {
  try {
    await ensurePools()
  } catch {
    failure.value = 'Could not load the pools.'
  }
})

watch(
  [poolId, member],
  ([id, allowed]) => {
    if (!id || !allowed) return
    writeStored(localStorage, POOL_KEY, id)
    heard = ''
    void openDaily(id).catch((reason: unknown) => {
      failure.value = reason instanceof Error ? reason.message : 'Could not reach the server.'
    })
    void fetchStandings()
    void fetchDistribution()
  },
  { immediate: true },
)

watch(state, async (next, previous) => {
  if (!next) return
  const key = `${next.challenge_id}:${next.done ? 'done' : next.step}`
  if (key === heard) return
  const advanced = previous?.challenge_id === next.challenge_id && heard !== ''
  heard = key
  if (next.done && advanced) {
    void fetchStandings()
    void fetchDistribution()
  }
  const loaded = await loadClip(next.clip_url)
  if (loaded && advanced) replayClip()
})

watch(verdict, (result) => {
  if (result?.verdict !== 'near_miss') return
  nearMiss.value = true
  setTimeout(() => (nearMiss.value = false), NEAR_MISS_FLASH_MS)
})

onBeforeUnmount(() => {
  releaseClip()
  closeDaily()
  standingsRequest?.abort()
  distributionRequest?.abort()
})

function choosePool(slug: string): void {
  void router.replace({ query: { ...route.query, pool: slug } })
}

function logIn(): void {
  location.assign(loginUrl(playerId.value))
}

async function play(): Promise<void> {
  if (playingTrack.value) return stopClip()
  unlockAudio()
  if (!clipReady.value && state.value) {
    if (!(await loadClip(state.value.clip_url))) return
  }
  replayClip()
}

function onVolume(event: Event): void {
  setVolume(Number((event.target as HTMLInputElement).value))
}

async function fetchStandings(): Promise<void> {
  standingsRequest?.abort()
  const controller = new AbortController()
  standingsRequest = controller
  standingsLoading.value = true
  standingsFailed.value = false
  const query = new URLSearchParams({ pools: poolId.value, time: 'today', limit: String(STANDINGS_LIMIT) })
  try {
    standings.value = dailyRows(await loadDailyBoard(query, controller.signal), playerId.value, true)
  } catch {
    if (!controller.signal.aborted) standingsFailed.value = true
  } finally {
    if (!controller.signal.aborted) standingsLoading.value = false
  }
}

async function fetchDistribution(): Promise<void> {
  distributionRequest?.abort()
  const controller = new AbortController()
  distributionRequest = controller
  const mineMissed = state.value?.done === true && !state.value.solved
  try {
    const dist = await loadDailyDistribution(poolId.value, controller.signal)
    distribution.value = distRows(dist, solvedMs.value, mineMissed)
    distributionTotal.value = distTotal(dist)
  } catch {
    if (!controller.signal.aborted) {
      distribution.value = []
      distributionTotal.value = 0
    }
  }
}

async function share(): Promise<void> {
  const held = state.value
  if (!held) return
  try {
    await navigator.clipboard.writeText(
      shareText({
        date: held.date,
        poolName: poolName.value,
        pattern: held.pattern,
        ladder: held.ladder_ms,
        hints: Object.keys(held.hints).length,
        url: `${location.origin}/daily?pool=${poolSlug.value}`,
      }),
    )
    copied.value = true
    setTimeout(() => (copied.value = false), NEAR_MISS_FLASH_MS)
  } catch {
    return
  }
}
</script>

<template>
  <section class="intro">
    <h1>Daily</h1>
    <p>One track per pool per day.</p>
  </section>

  <DailyLock v-if="!member" @login="logIn" />

  <template v-else>
  <nav v-if="pools.length > 1" class="pools">
    <button v-for="pool in pools" :key="pool.id" type="button" :class="{ on: pool.id === poolId }" @click="choosePool(pool.slug)">
      {{ pool.name }}
    </button>
  </nav>

  <p v-if="failure" class="notice" role="alert">{{ failure }}</p>

  <template v-if="state">
    <p class="when">{{ dateLabel }} <span class="next">next one at {{ nextLabel }}</span></p>

    <TrackPlate
      :reveal="state.track"
      :blurred="revealed.get('cover')"
      :status="playback"
      :note="playbackNote"
    />

    <DailyLadder :ladder="state.ladder_ms" :step="state.step" :done="done" :pattern="state.pattern" />

    <div class="controls">
      <button type="button" data-tone="loud" :disabled="clipState === 'fetching' || clipState === 'decoding'" @click="play">
        {{ playLabel }}
      </button>
      <label class="volume">
        <span class="visually-hidden">Volume</span>
        <input type="range" min="0" max="1" step="0.05" :value="volume" @input="onVolume" />
      </label>
      <button v-if="soundBlocked" type="button" data-tone="quiet" @click="unlockAudio">Turn the sound on</button>
      <button v-if="!done" type="button" data-tone="quiet" class="skip" :disabled="busy" @click="skipDaily">Skip</button>
    </div>

    <div class="play">
      <div class="column">
        <ul v-if="state.guesses.length" class="misses">
          <li v-for="(guess, index) in state.guesses" :key="index">
            <span class="mark" aria-hidden="true"></span>
            {{ guess }}
          </li>
        </ul>

        <p v-if="nearMiss" class="near" role="status">
          <span class="mark" aria-hidden="true"></span>
          So close. Not the right track.
        </p>

        <GuessInput v-if="!done" :locked="busy" live :suggest="{ pools: [poolId] }" @guess="guessDaily" />

        <section v-else class="result">
          <p class="label">Your result</p>
          <p class="headline" :class="{ won: state.solved }">{{ headline }}</p>
          <ol class="marks" aria-hidden="true">
            <li v-for="(mark, index) in resultMarks" :key="index" :data-mark="mark"></li>
          </ol>
          <button type="button" data-tone="plain" @click="share">{{ copied ? 'Copied' : 'Copy your result' }}</button>
        </section>
      </div>

      <aside class="side">
        <HintBoard :revealed="revealed" :missing="missing" :rating="state.rating ?? 'stars'" :pooled="false" :askable="!done" @ask="askDailyHint" />
      </aside>
    </div>

    <section class="standings">
      <div class="heading">
        <h2>Today in {{ poolName }}</h2>
        <RouterLink :to="{ path: '/leaderboard', query: boardQuery }">Every day</RouterLink>
      </div>
      <DailyDistribution v-if="distributionTotal > 0" :rows="distribution" :total="distributionTotal" class="chart" />
      <BoardList
        :rows="standings"
        :loading="standingsLoading"
        :failed="standingsFailed"
        empty="Nobody has finished today's yet."
      />
    </section>

    <p class="visually-hidden" aria-live="polite">{{ headline }}</p>
  </template>

  <div v-else-if="!failure" class="ghosts" aria-hidden="true">
    <span class="ghost plate"></span>
    <span class="ghost ladder"></span>
    <span class="ghost input"></span>
  </div>
  </template>
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

.pools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-24);
  padding-bottom: var(--space-16);
  border-bottom: 1px solid var(--rule);
}

.pools button {
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 300;
  color: var(--ink-faint);
  border-bottom: 2px solid transparent;
  padding-bottom: var(--space-4);
}

.pools button.on {
  color: var(--ink);
  font-weight: 500;
  border-bottom-color: var(--spot-red);
}

.notice {
  padding-top: var(--space-16);
  color: var(--spot-red-text);
  font-weight: 700;
}

.when {
  padding-block: var(--space-16);
  font-family: var(--font-stamp);
  font-size: var(--text-heading);
  letter-spacing: 0.08em;
}

.next {
  margin-left: var(--space-8);
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-12);
  padding-block: var(--space-24) var(--space-16);
  font-size: var(--text-small);
}

.volume {
  margin: 0;
  width: 6rem;
}

.volume input {
  accent-color: var(--ink-soft);
  padding: 0;
  border: 0;
  background: none;
}

.skip {
  margin-left: auto;
}

.play {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 14rem;
  gap: var(--space-32);
}

.column {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.misses li {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding-block: var(--space-8);
  border-bottom: 1px solid var(--rule);
  color: var(--ink-soft);
  word-break: break-word;
}

.misses .mark {
  width: var(--mark);
  height: var(--mark);
  background: var(--ink-faint);
  flex: none;
}

.near {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding-block: var(--space-8);
  color: var(--spot-ochre);
  font-weight: 700;
}

.near .mark {
  width: var(--mark);
  height: var(--mark);
  border: 2px solid var(--spot-ochre);
}

.result {
  border-top: 1px solid var(--rule);
  padding-top: var(--space-16);
}

.result .label {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  margin-bottom: var(--space-4);
}

.headline {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--spot-blue);
  animation: stamp var(--dur-slow) var(--ease-out);
}

.headline.won {
  color: var(--spot-green);
}

.marks {
  display: flex;
  gap: var(--space-4);
  margin-block: var(--space-12);
}

.marks li {
  width: 0.85rem;
  height: 0.85rem;
  flex: none;
  border: 2px solid var(--ink-faint);
}

.marks li[data-mark='x'] {
  background: var(--ink-faint);
}

.marks li[data-mark='o'] {
  background: var(--spot-green);
  border-color: var(--spot-green);
  transform: rotate(45deg);
}

.standings {
  margin-top: var(--space-48);
}

.chart {
  padding-block: var(--space-8) var(--space-24);
}

.heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-16);
  padding-bottom: var(--space-12);
}

.heading a {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.ghosts {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  padding-top: var(--space-24);
}

.ghost {
  display: block;
  background: var(--ground-sunk);
}

.ghost.plate {
  height: 5.25rem;
}

.ghost.ladder {
  height: 1.5rem;
}

.ghost.input {
  height: 3rem;
  max-width: 40rem;
}

@keyframes stamp {
  from {
    transform: translateY(6px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 52rem) {
  .play {
    grid-template-columns: 1fr;
    gap: var(--space-24);
  }

  .side {
    order: -1;
  }

  .skip {
    margin-left: 0;
  }
}
</style>
