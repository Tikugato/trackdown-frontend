<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import PoolFilterForm from '@/components/PoolFilterForm.vue'
import { isEmptyFilter } from '@/game/filters'
import type { Pool, PoolFilter } from '@/net/protocol'

const GAP = 8
const EDGE = 16

const props = defineProps<{ pool: Pool; filter: PoolFilter }>()
const emit = defineEmits<{ 'update:filter': [filter: PoolFilter] }>()

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLDivElement | null>(null)
const spot = ref({ top: '0px', left: '0px' })

const filtered = computed(() => !isEmptyFilter(props.filter))

function toggle(): void {
  if (open.value) hide()
  else void show()
}

async function show(): Promise<void> {
  open.value = true
  await nextTick()
  place()
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', hide)
}

function hide(): void {
  open.value = false
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', hide)
}

function onScroll(event: Event): void {
  if (!(event.target instanceof Node && panel.value?.contains(event.target))) hide()
}

function place(): void {
  if (!trigger.value || !panel.value) return
  const anchor = trigger.value.getBoundingClientRect()
  const size = panel.value.getBoundingClientRect()
  const below = anchor.bottom + GAP
  const fitsBelow = below + size.height <= window.innerHeight - EDGE
  const top = fitsBelow ? below : Math.max(EDGE, anchor.top - GAP - size.height)
  const left = Math.max(EDGE, Math.min(anchor.right - size.width, window.innerWidth - EDGE - size.width))
  spot.value = { top: `${top}px`, left: `${left}px` }
}

onBeforeUnmount(hide)
</script>

<template>
  <span class="popover" @keydown.esc="hide">
    <button ref="trigger" type="button" data-tone="plain" class="open" :class="{ on: filtered }" :aria-expanded="open" @click="toggle">
      {{ filtered ? 'Filtered' : 'Filter this pool' }}
    </button>
    <button v-if="open" class="scrim" type="button" aria-label="Close the pool filter" @click="hide"></button>
    <div v-if="open" ref="panel" class="panel" :style="spot">
      <PoolFilterForm :pool="pool" :filter="filter" @update:filter="emit('update:filter', $event)" />
    </div>
  </span>
</template>

<style scoped>
.open {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.open.on,
.open[aria-expanded='true'] {
  color: var(--ink);
}

.scrim {
  position: fixed;
  inset: 0;
  z-index: 1;
  cursor: default;
}

.panel {
  position: fixed;
  z-index: 2;
  width: min(24rem, calc(100vw - var(--space-32)));
  max-height: calc(100vh - var(--space-32));
  overflow-y: auto;
  padding-inline: var(--space-16);
  background: var(--ground-raised);
  border: 1px solid var(--ink);
  text-align: left;
}
</style>
