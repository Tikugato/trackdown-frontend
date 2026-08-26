<script setup lang="ts">
import { computed } from 'vue'
import ModeCards from '@/components/ModeCards.vue'
import PoolPicker from '@/components/PoolPicker.vue'
import SettingChoice from '@/components/SettingChoice.vue'
import { keepFilters } from '@/game/filters'
import { BREATHERS, CLIP_LENGTHS, FLAGS, GUESS_TIMES, MODES, ROUND_COUNTS, TARGETS, type Flag } from '@/game/rules'
import type { Mode, Pool, Settings } from '@/net/protocol'

const BOLT_ROUND_HEADROOM = 3
const RACE_POINTS_PER_ROUND = 100
const DEFAULT_TARGET = 10
const DEFAULT_ROUNDS = 10

const props = defineProps<{ settings: Settings; pools: Pool[]; loading: boolean; counts: Record<string, number> }>()
const emit = defineEmits<{ change: [settings: Settings] }>()

const bolt = computed(() => props.settings.mode === 'bolt')
const target = computed(() => props.settings.points_to_win)

function apply(patch: Partial<Settings>): void {
  emit('change', { ...props.settings, ...patch })
}

function setMode(mode: Mode): void {
  if (mode === 'bolt') apply({ mode, points_to_win: DEFAULT_TARGET, max_rounds: DEFAULT_TARGET * BOLT_ROUND_HEADROOM })
  else apply({ mode, points_to_win: DEFAULT_ROUNDS * RACE_POINTS_PER_ROUND, max_rounds: DEFAULT_ROUNDS })
}

function setTarget(points: number): void {
  apply({ points_to_win: points, max_rounds: points * BOLT_ROUND_HEADROOM })
}

function toggleFlag(key: Flag): void {
  apply({ [key]: !props.settings[key] })
}

function setRounds(rounds: number): void {
  apply({ max_rounds: rounds, points_to_win: rounds * RACE_POINTS_PER_ROUND })
}
</script>

<template>
  <ModeCards legend="How a round is won" :options="MODES" :model-value="settings.mode" @update:model-value="setMode" />

  <div class="settings">
    <SettingChoice
      label="Clip length"
      :options="CLIP_LENGTHS"
      :model-value="settings.clip_length_ms"
      @update:model-value="apply({ clip_length_ms: $event })"
    />
    <SettingChoice
      label="Time to guess"
      :options="GUESS_TIMES"
      :model-value="settings.guess_time_ms"
      @update:model-value="apply({ guess_time_ms: $event })"
    />
    <SettingChoice
      v-if="bolt"
      label="First to"
      :options="TARGETS"
      :model-value="target"
      @update:model-value="setTarget"
    />
    <SettingChoice
      v-else
      label="Rounds"
      :options="ROUND_COUNTS"
      :model-value="settings.max_rounds"
      @update:model-value="setRounds"
    />
    <SettingChoice
      label="Breather"
      :options="BREATHERS"
      :model-value="settings.intermission_ms"
      @update:model-value="apply({ intermission_ms: $event })"
    />
  </div>

  <div class="flags">
    <button
      v-for="flag in FLAGS"
      :key="flag.key"
      type="button"
      data-tone="chip"
      :aria-pressed="settings[flag.key]"
      @click="toggleFlag(flag.key)"
    >
      {{ flag.label }}
    </button>
  </div>

  <h2>Pools to draw from</h2>
  <PoolPicker
    :pools="pools"
    :loading="loading"
    :selected="settings.pools"
    :filters="settings.filters"
    :counts="counts"
    @update:selected="apply({ pools: $event, filters: keepFilters(settings.filters, $event) })"
    @update:filters="apply({ filters: $event })"
  />
</template>

<style scoped>
h2 {
  margin-top: var(--space-32);
  margin-bottom: var(--space-12);
}

.settings {
  margin-top: var(--space-32);
  border-top: 1px solid var(--rule);
}

.flags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  margin-top: var(--space-24);
}
</style>
