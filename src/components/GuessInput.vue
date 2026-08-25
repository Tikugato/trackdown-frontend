<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { suggestTitles } from '@/net/http'

const props = defineProps<{ locked: boolean; disabled: boolean; suggest: boolean }>()
const emit = defineEmits<{ guess: [text: string] }>()

const MIN_QUERY = 3
const DEBOUNCE_MS = 150

const box = ref<HTMLInputElement | null>(null)
const text = ref('')
const options = ref<string[]>([])
const cursor = ref(-1)
const listId = useId()

let debounce: ReturnType<typeof setTimeout> | null = null
let inFlight: AbortController | null = null

const open = computed(() => props.suggest && options.value.length > 0 && !props.disabled)
const activeId = computed(() => (cursor.value >= 0 ? `${listId}-${cursor.value}` : undefined))

watch(text, (value) => {
  cursor.value = -1
  if (debounce) clearTimeout(debounce)
  if (!props.suggest || value.trim().length < MIN_QUERY) {
    options.value = []
    return
  }
  debounce = setTimeout(() => void lookup(value.trim()), DEBOUNCE_MS)
})

watch(
  () => props.disabled,
  (off) => {
    if (off) options.value = []
    else box.value?.focus()
  },
)

async function lookup(query: string): Promise<void> {
  inFlight?.abort()
  inFlight = new AbortController()
  try {
    options.value = await suggestTitles(query, inFlight.signal)
  } catch {
    return
  }
}

function move(step: number): void {
  if (!open.value) return
  const count = options.value.length
  cursor.value = (cursor.value + step + count + 1) % (count + 1) - 1
}

function submit(): void {
  const chosen = cursor.value >= 0 ? options.value[cursor.value] : text.value
  if (!chosen?.trim() || props.locked) return
  emit('guess', chosen)
  text.value = ''
  options.value = []
  cursor.value = -1
}

function pick(option: string): void {
  text.value = option
  cursor.value = -1
  submit()
}

onBeforeUnmount(() => {
  inFlight?.abort()
  if (debounce) clearTimeout(debounce)
})
</script>

<template>
  <div class="guess">
    <ul v-if="open" :id="listId" class="options" role="listbox" aria-label="Title suggestions">
      <li
        v-for="(option, index) in options"
        :id="`${listId}-${index}`"
        :key="option"
        role="option"
        :aria-selected="index === cursor"
        :class="{ on: index === cursor }"
        @mousedown.prevent="pick(option)"
      >
        {{ option }}
      </li>
    </ul>

    <form @submit.prevent="submit">
      <label class="visually-hidden" for="guess">Your guess</label>
      <input
        id="guess"
        ref="box"
        v-model="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="activeId"
        :class="{ locked }"
        :disabled="disabled"
        :placeholder="disabled ? 'Wait for the next clip' : 'Name it'"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.esc="options = []"
      />
    </form>
  </div>
</template>

<style scoped>
.guess {
  border-top: 1px solid var(--rule);
  padding-top: var(--space-12);
}

.options {
  border-bottom: 1px solid var(--rule);
  margin-bottom: var(--space-12);
  max-height: 12rem;
  overflow-y: auto;
}

.options li {
  padding: var(--space-4) var(--space-8);
  border-top: 1px solid var(--rule);
  cursor: pointer;
  color: var(--ink-soft);
}

.options li.on,
.options li:hover {
  color: var(--ink);
  background: var(--ground-sunk);
}

input {
  font-size: var(--text-heading);
  padding: var(--space-12);
}

input.locked {
  border-color: var(--ink-faint);
}

input:disabled {
  color: var(--ink-faint);
}
</style>
