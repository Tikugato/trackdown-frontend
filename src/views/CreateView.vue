<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import RulesForm from '@/components/RulesForm.vue'
import { MIN_POOL_SONGS, keepFilters, tooSmall } from '@/game/filters'
import { useMatchCounts } from '@/game/useMatchCounts'
import type { Settings } from '@/net/protocol'
import { code as lobbyCode, connect, createLobby } from '@/store/game'
import { ensurePools, pools } from '@/store/pools'
import { rememberRules, rememberedRules } from '@/store/preferences'
import { playerName } from '@/store/session'

const router = useRouter()

const loading = ref(true)
const draft = ref<Settings>(rememberedRules())
const counts = useMatchCounts(draft)
const failure = ref('')
const busy = ref(false)

const ready = computed(() => draft.value.pools.length > 0 && !busy.value)
const thin = computed(() => pools.value.some((pool) => draft.value.pools.includes(pool.id) && tooSmall(pool, counts.value[pool.id])))

onMounted(async () => {
  if (!playerName.value) {
    await router.replace('/')
    return
  }
  try {
    await ensurePools()
    const live = pools.value.filter((pool) => draft.value.pools.includes(pool.id)).map((pool) => pool.id)
    draft.value = { ...draft.value, pools: live, filters: keepFilters(draft.value.filters, live) }
  } catch {
    failure.value = 'Could not load the pools.'
  } finally {
    loading.value = false
  }
})

async function make(): Promise<void> {
  if (!ready.value) return
  busy.value = true
  failure.value = ''
  try {
    await connect()
    rememberRules(draft.value)
    await createLobby(draft.value)
    await router.push(`/${lobbyCode.value}`)
  } catch (reason) {
    failure.value = reason instanceof Error ? reason.message : 'Could not make the lobby.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <h1>New lobby</h1>

  <RulesForm :settings="draft" :pools="pools" :loading="loading" :counts="counts" @change="draft = $event" />

  <p v-if="thin" class="thin">A pool under {{ MIN_POOL_SONGS }} songs keeps this game out of the stats.</p>

  <div class="go">
    <button type="button" data-tone="loud" :disabled="!ready" @click="make">
      {{ busy ? 'Creating...' : 'Make the lobby' }}
    </button>
    <p v-if="failure" class="failure" role="alert">{{ failure }}</p>
  </div>
</template>

<style scoped>
h1 {
  font-size: var(--text-display);
  font-weight: 200;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-32);
}

.thin {
  margin-top: var(--space-12);
  font-size: var(--text-small);
  color: var(--spot-red-text);
}

.go {
  margin-top: var(--space-32);
}

.failure {
  margin-top: var(--space-12);
  color: var(--spot-red-text);
  font-size: var(--text-small);
}
</style>
