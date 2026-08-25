<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Pool } from '@/net/protocol'

const props = defineProps<{
  pools: Pool[]
  loading: boolean
  selected: string[]
}>()

const emit = defineEmits<{ 'update:selected': [ids: string[]] }>()

const BANNERS = import.meta.glob<string>('../assets/pools/*.png', { eager: true, import: 'default', query: '?url' })

const counter = new Intl.NumberFormat('en-US')
const query = ref('')

const matches = computed(() => {
  const wanted = query.value.trim().toLowerCase()
  if (!wanted) return props.pools
  return props.pools.filter((pool) => haystack(pool).includes(wanted))
})

function haystack(pool: Pool): string {
  return `${pool.name} ${pool.description}`.toLowerCase()
}

function bannerFor(slug: string): string | undefined {
  return BANNERS[`../assets/pools/${slug}.png`]
}

function isPicked(id: string): boolean {
  return props.selected.includes(id)
}

function toggle(id: string): void {
  emit('update:selected', isPicked(id) ? props.selected.filter((held) => held !== id) : [...props.selected, id])
}
</script>

<template>
  <div v-if="!loading && pools.length > 1" class="find">
    <label for="pool-search">Search pools</label>
    <input
      id="pool-search"
      v-model="query"
      type="search"
      spellcheck="false"
      autocomplete="off"
      placeholder="Name or description"
    />
  </div>

  <ul v-if="loading" class="grid" aria-hidden="true">
    <li v-for="row in 2" :key="row" class="card">
      <div class="banner"></div>
      <div class="body">
        <span class="ghost name"></span>
        <span class="ghost desc"></span>
      </div>
    </li>
  </ul>

  <p v-else-if="matches.length === 0" class="empty" role="status">No pool matches that.</p>

  <ul v-else class="grid">
    <li v-for="pool in matches" :key="pool.id">
      <label class="card" :class="{ picked: isPicked(pool.id) }">
        <div class="banner">
          <img v-if="bannerFor(pool.slug)" :src="bannerFor(pool.slug)" alt="" width="563" height="143" />
        </div>
        <div class="body">
          <p class="title">
            <input type="checkbox" :checked="isPicked(pool.id)" @change="toggle(pool.id)" />
            <span class="name">{{ pool.name }}</span>
          </p>
          <p class="desc">{{ pool.description }}</p>
          <p class="meta">
            <span>{{ counter.format(pool.song_count) }} songs</span>
            <span>{{ pool.is_rankable ? 'Counts for rankings' : 'Just for fun' }}</span>
          </p>
        </div>
      </label>
    </li>
  </ul>
</template>

<style scoped>
.find {
  margin-bottom: var(--space-16);
}

.find label {
  display: block;
  margin-bottom: var(--space-4);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.find input {
  max-width: 22rem;
}

.empty {
  padding-block: var(--space-16);
  font-size: var(--text-small);
  color: var(--ink-soft);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(17rem, 100%), 21rem));
  gap: var(--space-16);
}

.card {
  display: block;
  margin: 0;
  border: 1px solid var(--rule);
  background: var(--ground-raised);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.card:hover {
  border-color: var(--ink-faint);
}

.card.picked {
  border-color: var(--ink);
}

.card:has(input:focus-visible) {
  outline: 2px solid var(--spot-blue);
  outline-offset: 2px;
}

.banner {
  aspect-ratio: 563 / 143;
  background: var(--ground-sunk);
  overflow: hidden;
}

.banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.body {
  padding: var(--space-12) var(--space-16) var(--space-16);
}

.title {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.title input {
  width: auto;
  margin: 0;
  flex: none;
  accent-color: var(--spot-red);
}

.name {
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 500;
  line-height: 1.2;
}

.card.picked .name {
  font-weight: 600;
}

.desc {
  margin-top: var(--space-4);
  font-size: var(--text-small);
  color: var(--ink-soft);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4) var(--space-16);
  margin-top: var(--space-12);
  padding-top: var(--space-8);
  border-top: 1px solid var(--rule);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.ghost {
  display: block;
  background: var(--ground-sunk);
  height: 1.1em;
}

.ghost.name {
  width: 12ch;
}

.ghost.desc {
  width: 20ch;
  margin-top: var(--space-8);
  height: 0.9em;
}
</style>
