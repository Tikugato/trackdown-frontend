<script setup lang="ts">
import { computed } from 'vue'
import type { Mask, Reveal } from '@/net/protocol'

const props = defineProps<{
  mask?: Mask | undefined
  reveal?: Reveal | undefined
  blurred?: string | undefined
  status: string
  note: string
  canReplay: boolean
}>()
const emit = defineEmits<{ replay: [] }>()

const known = computed(() => props.reveal ?? null)
const shape = computed(() => props.mask ?? null)

const countLabel = computed(() => {
  const words = shape.value
  if (!words) return ''
  const title = `${words.title} ${words.title === 1 ? 'word' : 'words'} in the title`
  return words.artist ? `${title}, ${words.artist} in the artist` : title
})
</script>

<template>
  <section class="plate" :class="{ open: known }">
    <div class="cover">
      <img v-if="known?.cover_url" :src="known.cover_url" alt="" width="128" height="128" />
      <img
        v-else-if="blurred"
        class="fuzzy"
        :src="blurred"
        alt="A blurred piece of the cover art"
        width="64"
        height="64"
      />
      <svg v-else viewBox="0 0 48 48" aria-hidden="true">
        <path d="M20 36 L20 10 L38 6 L38 32" />
        <circle cx="14" cy="37" r="6" />
        <circle cx="32" cy="33" r="6" />
      </svg>
    </div>

    <div class="what">
      <p class="label">{{ known ? 'That was' : status }}</p>
      <p v-if="!known && note" class="note">{{ note }}</p>

      <template v-if="known">
        <p class="title" :title="known.title">{{ known.title }}</p>
        <p v-if="known.artist" class="artist" :title="known.artist">{{ known.artist }}</p>
        <p v-if="known.mapper" class="mapper" :title="known.mapper">
          <span class="by">Mapped by</span>
          {{ known.mapper }}
        </p>
        <a
          v-if="known.source_url"
          class="source"
          :href="known.source_url"
          target="_blank"
          rel="noopener noreferrer"
        >
          View in {{ known.source_name }}
        </a>
      </template>

      <template v-else-if="shape">
        <p class="blanks lead">
          <span v-for="word in shape.title" :key="word" class="blank"></span>
        </p>
        <p v-if="shape.artist" class="blanks">
          <span v-for="word in shape.artist" :key="word" class="blank"></span>
        </p>
        <p class="count">{{ countLabel }}</p>
      </template>

      <template v-else>
        <span class="bar title"></span>
        <span class="bar artist"></span>
      </template>
    </div>

    <button type="button" class="again" :disabled="!canReplay" aria-label="Hear the clip again" @click="emit('replay')">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle class="body" cx="16" cy="16" r="14" />
        <path class="arrow" d="M13 11 L23 16 L13 21 Z" />
      </svg>
    </button>
  </section>
</template>

<style scoped>
.plate {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  padding-bottom: var(--space-16);
  border-bottom: 1px solid var(--rule);
}

.cover {
  width: 5.25rem;
  height: 5.25rem;
  flex: none;
  background: var(--ground-sunk);
  border: 1px solid var(--rule);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: arrive var(--dur-slow) var(--ease-out);
}

.cover .fuzzy {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: arrive var(--dur-slow) var(--ease-out);
}

.cover svg {
  width: 46%;
  fill: none;
  stroke: var(--ink-faint);
  stroke-width: 3.5;
  stroke-linecap: square;
}

.cover circle {
  fill: var(--ink-faint);
  stroke: none;
}

.what {
  flex: 1;
  min-width: 0;
  min-height: 6.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-4);
  overflow: hidden;
}

.label {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  margin-bottom: var(--space-4);
}

.note {
  font-size: var(--text-micro);
  color: var(--ink-faint);
  margin-top: calc(var(--space-4) * -1);
  margin-bottom: var(--space-4);
  animation: arrive var(--dur-slow) var(--ease-out);
}

.title,
.artist,
.mapper {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title {
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 500;
  line-height: 1.15;
}

.artist {
  font-size: var(--text-small);
  color: var(--ink-soft);
}

.mapper {
  font-size: var(--text-small);
  color: var(--ink-soft);
}

.by {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  margin-right: var(--space-4);
}

.source {
  display: inline-block;
  margin-top: var(--space-4);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--spot-blue-text);
}

.plate.open .title,
.plate.open .artist,
.plate.open .mapper,
.plate.open .source {
  animation: arrive var(--dur-slow) var(--ease-out);
}

.blanks {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-8);
}

.blank {
  width: 2.5rem;
  height: 1rem;
  border-bottom: 2px solid var(--ink-faint);
}

.blanks.lead .blank {
  width: 3.25rem;
  height: 1.4rem;
}

.count {
  margin-top: var(--space-4);
  font-size: var(--text-micro);
  color: var(--ink-faint);
}

.bar {
  display: block;
  height: 0.85rem;
  background: var(--ground-sunk);
  border-bottom: 1px solid var(--rule);
}

.bar.title {
  width: min(100%, 22rem);
  height: 1.15rem;
}

.bar.artist {
  width: min(100%, 13rem);
}

.again {
  flex: none;
  padding: 0;
  width: 3rem;
  color: var(--spot-red);
  transition: transform var(--dur-fast) var(--ease-out);
}

.again svg {
  width: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linejoin: miter;
}

.again .arrow {
  fill: currentColor;
  stroke: none;
}

.again:disabled {
  color: var(--ink-faint);
}

.again:not(:disabled):hover {
  transform: scale(1.06);
}

@keyframes arrive {
  from {
    transform: translateY(6px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 40rem) {
  .cover {
    width: 3.5rem;
    height: 3.5rem;
  }

  .again {
    width: 2.4rem;
  }
}
</style>
