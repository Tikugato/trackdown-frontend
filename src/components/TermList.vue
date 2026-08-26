<script setup lang="ts">
import { ref, useId } from 'vue'

const props = defineProps<{ label: string; terms: string[] }>()
const emit = defineEmits<{ 'update:terms': [terms: string[]] }>()

const MAX_TERMS = 20

const draft = ref('')
const inputId = useId()

function add(): void {
  const term = draft.value.trim()
  if (!term || props.terms.length >= MAX_TERMS) return
  const lowered = term.toLowerCase()
  if (!props.terms.some((held) => held.toLowerCase() === lowered)) emit('update:terms', [...props.terms, term])
  draft.value = ''
}

function remove(term: string): void {
  emit(
    'update:terms',
    props.terms.filter((held) => held !== term),
  )
}
</script>

<template>
  <div class="terms">
    <label :for="inputId">{{ label }}</label>
    <div class="held">
      <button
        v-for="term in terms"
        :key="term"
        type="button"
        data-tone="chip"
        aria-pressed="true"
        :aria-label="`Remove ${term}`"
        @click="remove(term)"
      >
        {{ term }}<span class="off" aria-hidden="true">×</span>
      </button>
      <input
        :id="inputId"
        v-model="draft"
        type="text"
        autocomplete="off"
        spellcheck="false"
        maxlength="60"
        placeholder="Name, then Enter"
        @keydown.enter.prevent="add"
      />
    </div>
  </div>
</template>

<style scoped>
.terms {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-24);
  padding-block: var(--space-12);
  border-bottom: 1px solid var(--rule);
}

label {
  flex: none;
  margin: 0;
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.held {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: baseline;
  gap: var(--space-8);
  min-width: 0;
}

.held button {
  padding: var(--space-4) var(--space-8);
}

.off {
  margin-left: var(--space-8);
  color: var(--ink-faint);
}

.held input {
  width: 12rem;
  min-width: 0;
  padding: var(--space-4) var(--space-8);
  font-size: var(--text-small);
}
</style>
