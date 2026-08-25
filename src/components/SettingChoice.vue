<script setup lang="ts" generic="T extends string | number">
import { useId } from 'vue'

defineProps<{
  label: string
  options: { value: T; label: string }[]
  modelValue: T
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
const group = useId()
</script>

<template>
  <div class="setting">
    <span class="label">{{ label }}</span>
    <div class="choices" role="radiogroup" :aria-label="label">
      <label v-for="option in options" :key="option.value" class="choice" :class="{ on: option.value === modelValue }">
        <input
          type="radio"
          :name="group"
          :checked="option.value === modelValue"
          @change="emit('update:modelValue', option.value)"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.setting {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-24);
  padding-block: var(--space-12);
  border-bottom: 1px solid var(--rule);
}

.label {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.choices {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-8) var(--space-16);
}

.choice {
  margin: 0;
  cursor: pointer;
  font-size: var(--text-body);
  font-weight: 400;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
  border-bottom: 2px solid transparent;
  transition: color var(--dur-fast) var(--ease-out);
}

.choice:hover {
  color: var(--ink-soft);
}

.choice.on {
  color: var(--ink);
  font-weight: 700;
  border-bottom-color: var(--spot-red);
}

.choice input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.choice:has(input:focus-visible) {
  outline: 2px solid var(--spot-blue);
  outline-offset: 3px;
}
</style>
