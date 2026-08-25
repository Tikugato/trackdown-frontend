<script setup lang="ts">
import { computed } from 'vue'
import PoolPicker from '@/components/PoolPicker.vue'
import SettingChoice from '@/components/SettingChoice.vue'
import { BREATHERS, CLIP_LENGTHS, FLAGS, GUESS_TIMES, MODES, ROUND_COUNTS, TARGETS, type Flag } from '@/game/rules'
import type { Mode, Pool, Settings } from '@/net/protocol'

const BOLT_ROUND_HEADROOM = 3
const RACE_POINTS_PER_ROUND = 100
const DEFAULT_TARGET = 10
const DEFAULT_ROUNDS = 10

const props = defineProps<{ settings: Settings; pools: Pool[]; loading: boolean }>()
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
  <fieldset class="modes">
    <legend>How a round is won</legend>
    <div class="cards">
      <label v-for="option in MODES" :key="option.value" class="mode" :class="{ on: settings.mode === option.value }">
        <input
          type="radio"
          name="mode"
          :checked="settings.mode === option.value"
          :value="option.value"
          @change="setMode(option.value)"
        />
        <svg class="glyph" viewBox="0 0 32 32" aria-hidden="true">
          <path v-if="option.value === 'bolt'" class="fill" d="M18 3 L7 18 L14 18 L12 29 L25 13 L17 13 Z" />
          <template v-else>
            <circle class="stroke" cx="16" cy="16" r="11" />
            <path class="stroke" d="M16 8 L16 16 L22 19" />
          </template>
        </svg>
        <span class="name">{{ option.label }}</span>
        <span class="blurb">{{ option.blurb }}</span>
      </label>
    </div>
  </fieldset>

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
    @update:selected="apply({ pools: $event })"
  />
</template>

<style scoped>
h2 {
  margin-top: var(--space-32);
  margin-bottom: var(--space-12);
}

.modes {
  border: 0;
  display: grid;
  gap: var(--space-16);
}

legend {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  margin-bottom: var(--space-16);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(15rem, 100%), 1fr));
  gap: var(--space-16);
}

.mode {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--space-4) var(--space-12);
  margin: 0;
  padding: var(--space-16);
  cursor: pointer;
  border: 1px solid var(--rule);
  background: var(--ground-raised);
  transition: border-color var(--dur-fast) var(--ease-out);
}

.mode:hover {
  border-color: var(--ink-faint);
}

.mode.on {
  border-color: var(--ink);
}

.mode input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.mode:has(input:focus-visible) {
  outline: 2px solid var(--spot-blue);
  outline-offset: 2px;
}

.glyph {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--ink-faint);
  transition: color var(--dur-fast) var(--ease-out);
}

.mode.on .glyph {
  color: var(--spot-red);
}

.glyph .fill {
  fill: currentColor;
}

.glyph .stroke {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: square;
}

.mode .name {
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 500;
  color: var(--ink);
}

.mode.on .name {
  font-weight: 600;
}

.mode .blurb {
  grid-column: 2;
  font-size: var(--text-small);
  color: var(--ink-soft);
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
