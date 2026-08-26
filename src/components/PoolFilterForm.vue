<script setup lang="ts">
import SettingChoice from '@/components/SettingChoice.vue'
import TermList from '@/components/TermList.vue'
import { RATING_LABELS, categoryLabel } from '@/game/filters'
import type { NameFilter, Pool, PoolFilter } from '@/net/protocol'

const props = defineProps<{ pool: Pool; filter: PoolFilter }>()
const emit = defineEmits<{ 'update:filter': [filter: PoolFilter] }>()

type NameKey = 'mappers' | 'artists'
type Match = 'any' | 'all'

const MATCHES: { value: Match; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'all', label: 'All' },
]

const NAMES: { key: NameKey; noun: string }[] = [
  { key: 'mappers', noun: 'mapper' },
  { key: 'artists', noun: 'artist' },
]

function apply(patch: Partial<PoolFilter>): void {
  emit('update:filter', { ...props.filter, ...patch })
}

function number(event: Event): number | undefined {
  const raw = (event.target as HTMLInputElement).value.trim()
  if (raw === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

function text(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function toggleCategory(code: string): void {
  const held = props.filter.categories ?? []
  const next = held.includes(code) ? held.filter((kept) => kept !== code) : [...held, code]
  apply({ categories: next.length ? next : undefined })
}

function names(key: NameKey, patch: Partial<NameFilter>): void {
  apply({ [key]: { ...props.filter[key], ...patch } })
}

function match(all: boolean | undefined): Match {
  return all ? 'all' : 'any'
}
</script>

<template>
  <div class="filter">
    <div class="row">
      <span class="label">{{ RATING_LABELS[pool.rating] }}</span>
      <div class="span">
        <input
          type="number"
          inputmode="decimal"
          min="0"
          step="0.1"
          :placeholder="String(pool.rating_min)"
          :value="filter.rating_min ?? ''"
          :aria-label="`Lowest ${RATING_LABELS[pool.rating].toLowerCase()}`"
          @change="apply({ rating_min: number($event) })"
        />
        <span class="to">to</span>
        <input
          type="number"
          inputmode="decimal"
          min="0"
          step="0.1"
          :placeholder="String(pool.rating_max)"
          :value="filter.rating_max ?? ''"
          :aria-label="`Highest ${RATING_LABELS[pool.rating].toLowerCase()}`"
          @change="apply({ rating_max: number($event) })"
        />
      </div>
    </div>

    <div class="row dates">
      <span class="label">Ranked</span>
      <div class="span">
        <input
          type="date"
          :value="filter.ranked_from ?? ''"
          aria-label="Ranked on or after"
          @change="apply({ ranked_from: text($event) || undefined })"
        />
        <span class="to">to</span>
        <input
          type="date"
          :value="filter.ranked_to ?? ''"
          aria-label="Ranked on or before"
          @change="apply({ ranked_to: text($event) || undefined })"
        />
      </div>
    </div>

    <div v-if="pool.categories.length" class="row">
      <span class="label">Categories</span>
      <div class="chips">
        <button
          v-for="code in pool.categories"
          :key="code"
          type="button"
          data-tone="chip"
          :aria-pressed="filter.categories?.includes(code) ?? false"
          @click="toggleCategory(code)"
        >
          {{ categoryLabel(code) }}
        </button>
      </div>
    </div>

    <template v-for="group in NAMES" :key="group.key">
      <TermList
        :label="`Only ${group.noun}s`"
        :terms="filter[group.key].show ?? []"
        @update:terms="names(group.key, { show: $event.length ? $event : undefined })"
      />
      <SettingChoice
        v-if="(filter[group.key].show?.length ?? 0) > 1"
        label="Needs"
        :options="MATCHES"
        :model-value="match(filter[group.key].show_all)"
        @update:model-value="names(group.key, { show_all: $event === 'all' || undefined })"
      />
      <TermList
        :label="`Hide ${group.noun}s`"
        :terms="filter[group.key].hide ?? []"
        @update:terms="names(group.key, { hide: $event.length ? $event : undefined })"
      />
      <SettingChoice
        v-if="(filter[group.key].hide?.length ?? 0) > 1"
        label="Hidden when"
        :options="MATCHES"
        :model-value="match(filter[group.key].hide_all)"
        @update:model-value="names(group.key, { hide_all: $event === 'all' || undefined })"
      />
    </template>
  </div>
</template>

<style scoped>
.filter > :last-child {
  border-bottom: 0;
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

.span {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: var(--space-8);
  min-width: 0;
}

.span input {
  width: 6rem;
  min-width: 0;
  padding: var(--space-4) var(--space-8);
  font-size: var(--text-small);
  font-variant-numeric: tabular-nums;
}

.dates {
  flex-wrap: wrap;
}

.dates .span {
  flex: 1 0 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: baseline;
}

.dates input {
  width: 100%;
  font-variant-numeric: tabular-nums;
}

.to {
  font-size: var(--text-small);
  color: var(--ink-faint);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-8);
}

.chips button {
  padding: var(--space-4) var(--space-8);
}
</style>
