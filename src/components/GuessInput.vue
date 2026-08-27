<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { trackLabel, type Titled } from '@/game/track'
import { suggestTitles } from '@/net/http'
import type { SuggestScope } from '@/net/protocol'

const props = defineProps<{ locked: boolean; live: boolean; suggest?: SuggestScope | undefined }>()
const emit = defineEmits<{ guess: [text: string] }>()

const MIN_QUERY = 3
const DEBOUNCE_MS = 150

const box = ref<HTMLInputElement | null>(null)
const text = ref('')
const options = ref<Titled[]>([])
const cursor = ref(-1)
const listId = useId()

let debounce: ReturnType<typeof setTimeout> | null = null
let inFlight: AbortController | null = null

const suggesting = computed(() => props.live && props.suggest !== undefined)
const open = computed(() => suggesting.value && options.value.length > 0)
const activeId = computed(() => (cursor.value >= 0 ? `${listId}-${cursor.value}` : undefined))

watch(text, (value) => {
  cursor.value = -1
  if (debounce) clearTimeout(debounce)
  if (!suggesting.value || value.trim().length < MIN_QUERY) {
    options.value = []
    return
  }
  debounce = setTimeout(() => void lookup(value.trim()), DEBOUNCE_MS)
})

watch(
  () => props.live,
  (on) => {
    close()
    if (on) box.value?.focus()
  },
)

async function lookup(query: string): Promise<void> {
  if (!props.suggest) return
  inFlight?.abort()
  inFlight = new AbortController()
  try {
    options.value = await suggestTitles(query, props.suggest, inFlight.signal)
  } catch {
    return
  }
}

function close(): void {
  inFlight?.abort()
  if (debounce) clearTimeout(debounce)
  options.value = []
  cursor.value = -1
}

function move(step: number): void {
  if (!open.value) return
  const slots = options.value.length + 1
  cursor.value = ((cursor.value + 1 + step + slots) % slots) - 1
  void nextTick(() => document.getElementById(activeId.value ?? '')?.scrollIntoView({ block: 'nearest' }))
}

function submit(): void {
  const chosen = cursor.value >= 0 ? options.value[cursor.value]?.title : text.value
  if (!chosen?.trim() || props.locked) return
  emit('guess', chosen)
  text.value = ''
  close()
}

function pick(option: Titled): void {
  text.value = option.title
  cursor.value = -1
  submit()
}

onBeforeUnmount(close)
</script>

<template>
  <div class="guess">
    <ul v-if="open" :id="listId" class="options" role="listbox" aria-label="Title suggestions">
      <li
        v-for="(option, index) in options"
        :id="`${listId}-${index}`"
        :key="trackLabel(option)"
        role="option"
        :aria-selected="index === cursor"
        :class="{ on: index === cursor }"
        @mousedown.prevent="pick(option)"
      >
        <span>{{ option.title }}</span>
        <span class="artist">{{ option.artist }}</span>
      </li>
    </ul>

    <form @submit.prevent="submit">
      <label class="visually-hidden" for="guess">{{ live ? 'Your guess' : 'Your message' }}</label>
      <input
        id="guess"
        ref="box"
        v-model="text"
        role="combobox"
        autocomplete="off"
        autocorrect="off"
        enterkeyhint="send"
        spellcheck="false"
        maxlength="280"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="activeId"
        :class="{ locked }"
        :placeholder="live ? 'Name it' : 'Say something'"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.esc="close()"
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
  max-height: min(12rem, 32dvh);
  overflow-y: auto;
}

.options li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--space-8);
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

.artist {
  font-size: var(--text-micro);
  color: var(--ink-faint);
}

input {
  font-size: var(--text-heading);
  padding: var(--space-12);
}

input.locked {
  border-color: var(--ink-faint);
}
</style>
