<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PoolFilterPopover from '@/components/PoolFilterPopover.vue'
import SettingChoice from '@/components/SettingChoice.vue'
import { LADDER_MS, clipLabel } from '@/game/daily'
import { RATING_LABELS, filterFor, keepFilters, withFilter } from '@/game/filters'
import { HINT_LABELS, HINT_ORDER, isRating } from '@/game/hints'
import { CLIP_LENGTHS, FLAGS, GUESS_TIMES, MODES, type Choice } from '@/game/rules'
import type { HintKind, Pool, PoolFilter } from '@/net/protocol'
import { TIME_WINDOWS, type SettingKey, type StatFilter } from '@/stats/filter'

const SEARCH_DELAY = 250

const ANY: Choice<string> = { value: '', label: 'Any' }
const ON_OFF: Choice<string>[] = [ANY, { value: 'true', label: 'On' }, { value: 'false', label: 'Off' }]
const WITHINS: Choice<number>[] = [{ value: 0, label: 'Any' }, ...LADDER_MS.map((ms) => ({ value: ms, label: clipLabel(ms) }))]

function stringly<T extends string | number>(choices: Choice<T>[]): Choice<string>[] {
  return [ANY, ...choices.map((choice) => ({ value: String(choice.value), label: choice.label }))]
}

const RULE_ROWS: { key: SettingKey; label: string; options: Choice<string>[] }[] = [
  { key: 'clip_length_ms', label: 'Clip length', options: stringly(CLIP_LENGTHS) },
  { key: 'guess_time_ms', label: 'Time to guess', options: stringly(GUESS_TIMES) },
  ...FLAGS.map((flag) => ({ key: flag.key, label: flag.label, options: ON_OFF })),
]

const props = defineProps<{ filter: StatFilter; pools: Pool[]; searchable: boolean; daily?: boolean; member?: boolean }>()
const emit = defineEmits<{ 'update:filter': [filter: StatFilter] }>()

const typed = ref(props.filter.search)
const rulesTouched = computed(() => Object.keys(props.filter.settings).length > 0)
const filterable = computed(() =>
  props.pools.length === 1 ? props.pools : props.pools.filter((pool) => props.filter.pools.includes(pool.id)),
)

let pending: ReturnType<typeof setTimeout> | undefined

watch(typed, (value) => {
  clearTimeout(pending)
  pending = setTimeout(() => patch({ search: value.trim() }), SEARCH_DELAY)
})

watch(
  () => props.filter.search,
  (value) => {
    if (value !== typed.value.trim()) typed.value = value
  },
)

function patch(change: Partial<StatFilter>): void {
  emit('update:filter', { ...props.filter, ...change })
}

function setRule(key: SettingKey, value: string): void {
  const settings = { ...props.filter.settings }
  if (value) settings[key] = value
  else delete settings[key]
  patch({ settings })
}

function togglePool(id: string): void {
  const chosen = props.filter.pools
  const pools = chosen.includes(id) ? chosen.filter((held) => held !== id) : [...chosen, id]
  patch({ pools, filters: keepFilters(props.filter.filters, pools) })
}

function setPoolFilter(id: string, chosen: PoolFilter): void {
  patch({ filters: withFilter(props.filter.filters, id, chosen) })
}

function hasKind(kind: HintKind): boolean {
  return Array.isArray(props.filter.hints) && props.filter.hints.includes(kind)
}

function toggleKind(kind: HintKind): void {
  const chosen = Array.isArray(props.filter.hints) ? props.filter.hints : []
  const next = hasKind(kind) ? chosen.filter((held) => held !== kind) : [...chosen, kind]
  patch({ hints: next.length ? next : 'none' })
}
</script>

<template>
  <div class="filters">
    <SettingChoice v-if="!daily" label="Mode" :options="MODES" :model-value="filter.mode" @update:model-value="patch({ mode: $event })" />
    <SettingChoice label="When" :options="TIME_WINDOWS" :model-value="filter.time" @update:model-value="patch({ time: $event })" />

    <div v-if="member" class="row">
      <span class="label">Who</span>
      <div class="chips">
        <button type="button" data-tone="chip" :aria-pressed="!filter.friends" @click="patch({ friends: false })">Everyone</button>
        <button type="button" data-tone="chip" :aria-pressed="filter.friends" @click="patch({ friends: true })">Friends</button>
      </div>
    </div>

    <div v-if="pools.length > 1" class="row">
      <span class="label">Pools</span>
      <div class="chips">
        <button
          v-for="pool in pools"
          :key="pool.id"
          type="button"
          data-tone="chip"
          :aria-pressed="filter.pools.includes(pool.id)"
          @click="togglePool(pool.id)"
        >
          {{ pool.name }}
        </button>
      </div>
    </div>

    <template v-if="!daily">
      <div v-for="pool in filterable" :key="pool.id" class="row">
        <span class="label">{{ pool.name }}</span>
        <PoolFilterPopover :pool="pool" :filter="filterFor(filter.filters, pool.id)" @update:filter="setPoolFilter(pool.id, $event)" />
      </div>
    </template>

    <div class="row">
      <span class="label">Hints used</span>
      <div class="chips">
        <button type="button" data-tone="chip" :aria-pressed="filter.hints === 'any'" @click="patch({ hints: 'any' })">Any</button>
        <button type="button" data-tone="chip" :aria-pressed="filter.hints === 'none'" @click="patch({ hints: 'none' })">None</button>
        <button
          v-for="kind in HINT_ORDER"
          :key="kind"
          type="button"
          data-tone="chip"
          :aria-pressed="hasKind(kind)"
          @click="toggleKind(kind)"
        >
          {{ isRating(kind) ? RATING_LABELS[kind] : HINT_LABELS[kind] }}
        </button>
      </div>
    </div>

    <SettingChoice
      v-if="daily"
      label="Got it within"
      :options="WITHINS"
      :model-value="filter.within"
      @update:model-value="patch({ within: $event })"
    />

    <details v-else class="rules" :open="rulesTouched">
      <summary>Rules the game was played with</summary>
      <SettingChoice
        v-for="row in RULE_ROWS"
        :key="row.key"
        :label="row.label"
        :options="row.options"
        :model-value="filter.settings[row.key] ?? ''"
        @update:model-value="setRule(row.key, $event)"
      />
    </details>

    <label v-if="searchable" class="find">
      <span class="label">Search</span>
      <input v-model="typed" type="search" spellcheck="false" autocomplete="off" placeholder="Player or song" />
    </label>
  </div>
</template>

<style scoped>
.filters {
  border-top: 1px solid var(--rule);
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-24);
  padding-block: var(--space-12);
  border-bottom: 1px solid var(--rule);
}

.label {
  flex: none;
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-8);
}

.rules {
  border-bottom: 1px solid var(--rule);
}

summary {
  cursor: pointer;
  padding-block: var(--space-12);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

summary:hover {
  color: var(--ink);
}

.rules[open] summary {
  color: var(--ink);
}

.rules :deep(.setting) {
  padding-left: var(--space-16);
}

.rules :deep(.setting:last-child) {
  border-bottom: 0;
}

.find {
  display: flex;
  align-items: baseline;
  gap: var(--space-24);
  padding-block: var(--space-12);
  border-bottom: 1px solid var(--rule);
}

.find input {
  max-width: 20rem;
  margin-left: auto;
}

@media (max-width: 40rem) {
  .row,
  .find {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-8);
  }

  .chips {
    justify-content: flex-start;
  }

  .find input {
    max-width: none;
    margin-left: 0;
  }
}
</style>
