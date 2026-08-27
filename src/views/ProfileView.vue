<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PlayerMark from '@/components/PlayerMark.vue'
import StatFilters from '@/components/StatFilters.vue'
import { fallbackColour } from '@/game/palette'
import { trackLabel } from '@/game/track'
import { avatarUrl, loadProfile } from '@/net/http'
import type { Profile } from '@/net/protocol'
import { percent, seconds, toQuery, toSearchParams, useStatFilter } from '@/stats/filter'
import { RELATIONS, befriend } from '@/store/friends'
import { ensurePools, pools, poolsReady } from '@/store/pools'
import { accountKind, playerId } from '@/store/session'

const route = useRoute()
const { filter, update } = useStatFilter()

const id = computed(() => String(route.params.id ?? ''))
const profile = ref<Profile | null>(null)
const missing = ref(false)
const loading = ref(true)
const failed = ref(false)
let inFlight: AbortController | null = null

const ink = computed(() => profile.value?.colour || fallbackColour(id.value))
const mine = computed(() => id.value === playerId.value)
const member = computed(() => accountKind.value === 'discord')
const canBefriend = computed(() => profile.value?.relation === 'none' || profile.value?.relation === 'incoming')
const since = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

const lines = computed(() => {
  const stats = profile.value?.stats
  if (!stats) return []
  return [
    { label: 'Points', value: String(stats.points) },
    { label: 'Games', value: String(stats.games) },
    { label: 'Rounds', value: String(stats.rounds) },
    { label: 'Solved', value: `${stats.solved} · ${percent(stats.solved, stats.rounds)}` },
    { label: 'First to it', value: String(stats.first_bloods) },
    { label: 'Average solve', value: stats.solved ? seconds(stats.mean_solved_ms) : '-' },
    { label: 'Hints asked for', value: String(stats.hints_asked) },
  ]
})

const fastestQuery = computed(() => ({
  ...toQuery(filter.value),
  board: 'fastest',
  song: profile.value?.stats.fastest?.song_id ?? '',
}))

onMounted(() => void ensurePools().catch(() => {}))

watch([id, filter, poolsReady], () => {
  if (poolsReady.value) void fetch()
}, { immediate: true })

async function addFriend(): Promise<void> {
  if (!profile.value || !canBefriend.value) return
  try {
    profile.value = { ...profile.value, relation: await befriend(id.value) }
  } catch {
    return
  }
}

async function fetch(): Promise<void> {
  inFlight?.abort()
  const controller = new AbortController()
  inFlight = controller
  loading.value = true
  failed.value = false
  try {
    profile.value = await loadProfile(id.value, toSearchParams(filter.value), controller.signal)
    missing.value = profile.value === null
  } catch {
    if (!controller.signal.aborted) failed.value = true
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}
</script>

<template>
  <header v-if="profile" class="who" :style="{ '--player': ink }">
    <PlayerMark :colour="ink" :avatar="avatarUrl(profile.avatar)" :name="profile.name" class="face" />
    <div>
      <h1>{{ profile.name }}</h1>
      <p class="since">Playing since {{ since.format(new Date(profile.joined_at)) }}<span v-if="mine"> · this is you</span></p>
    </div>
    <button v-if="profile.relation && !mine && member" type="button" data-tone="quiet" class="befriend" :disabled="!canBefriend" @click="addFriend">
      {{ RELATIONS[profile.relation] }}
    </button>
  </header>

  <header v-else-if="loading" class="who" aria-hidden="true">
    <span class="face ghost"></span>
    <div>
      <span class="ghost name"></span>
    </div>
  </header>

  <template v-if="missing">
    <h1>No profile here</h1>
    <p class="empty">Guests do not get one. Log in with Discord and your games start counting.</p>
  </template>

  <p v-else-if="failed && !profile" class="empty" role="alert">Could not reach the server.</p>

  <template v-else>
    <StatFilters :filter="filter" :pools="pools" :searchable="false" @update:filter="update" />

    <dl class="stats" :class="{ stale: loading }">
      <div v-for="line in lines" :key="line.label">
        <dt>{{ line.label }}</dt>
        <dd>{{ line.value }}</dd>
      </div>
      <div v-if="profile?.stats.fastest">
        <dt>Fastest</dt>
        <dd>
          {{ seconds(profile.stats.fastest.solved_ms) }} on
          <RouterLink :to="{ path: '/leaderboard', query: fastestQuery }">{{ trackLabel(profile.stats.fastest) }}</RouterLink>
        </dd>
      </div>
      <div v-else-if="profile && !profile.stats.rounds">
        <dt>Rounds</dt>
        <dd class="quiet">Nothing played under these filters.</dd>
      </div>
    </dl>
  </template>
</template>

<style scoped>
.who {
  display: flex;
  align-items: center;
  gap: var(--space-24);
  padding-bottom: var(--space-32);
}

.face {
  --mark: 4rem;
}

h1 {
  font-size: var(--text-display);
  font-weight: 200;
  letter-spacing: -0.02em;
  color: color-mix(in oklab, var(--player, var(--ink)) 78%, var(--ink));
}

.since {
  margin-top: var(--space-4);
  color: var(--ink-soft);
}

.befriend {
  margin-left: auto;
  flex: none;
}

.empty {
  padding-block: var(--space-24);
  color: var(--ink-faint);
}

.stats {
  margin-top: var(--space-32);
  border-top: 1px solid var(--rule);
  transition: opacity var(--dur-mid) var(--ease-out);
}

.stats.stale {
  opacity: 0.5;
}

.stats div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-24);
  padding-block: var(--space-16);
  border-bottom: 1px solid var(--rule);
}

dt {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

dd {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

dd.quiet {
  font-family: var(--font-body);
  font-size: var(--text-small);
  color: var(--ink-faint);
}

.ghost {
  display: block;
  background: var(--ground-sunk);
}

.face.ghost {
  width: var(--mark);
  height: var(--mark);
  border-radius: 50%;
}

.ghost.name {
  width: 12ch;
  height: 2rem;
}
</style>
