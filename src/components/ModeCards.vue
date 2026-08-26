<script setup lang="ts" generic="T extends string">
import { useId } from 'vue'

defineProps<{
  legend: string
  options: { value: T; label: string; blurb: string }[]
  modelValue: T
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
const group = useId()
</script>

<template>
  <fieldset class="modes">
    <legend>{{ legend }}</legend>
    <div class="cards">
      <label v-for="option in options" :key="option.value" class="mode" :class="{ on: option.value === modelValue }">
        <input
          type="radio"
          :name="group"
          :checked="option.value === modelValue"
          @change="emit('update:modelValue', option.value)"
        />
        <svg class="glyph" viewBox="0 0 32 32" aria-hidden="true">
          <path v-if="option.value === 'bolt'" class="fill" d="M18 3 L7 18 L14 18 L12 29 L25 13 L17 13 Z" />
          <template v-else-if="option.value === 'race'">
            <circle class="stroke" cx="16" cy="16" r="11" />
            <path class="stroke" d="M16 8 L16 16 L22 19" />
          </template>
          <path v-else class="stroke" d="M16 5 L16 27 M6.5 10.5 L25.5 21.5 M6.5 21.5 L25.5 10.5" />
        </svg>
        <span class="name">{{ option.label }}</span>
        <span class="blurb">{{ option.blurb }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
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
</style>
