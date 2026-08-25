<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import RulesForm from '@/components/RulesForm.vue'
import { loadPools } from '@/net/http'
import type { Pool, Settings } from '@/net/protocol'
import { code as lobbyCode, connect, createLobby } from '@/store/game'
import { rememberRules, rememberedRules } from '@/store/preferences'
import { playerName } from '@/store/session'

const router = useRouter()

const pools = ref<Pool[]>([])
const loading = ref(true)
const draft = ref<Settings>(rememberedRules())
const failure = ref('')
const busy = ref(false)

const ready = computed(() => draft.value.pools.length > 0 && !busy.value)
const ranked = computed(() => {
  const chosen = pools.value.filter((pool) => draft.value.pools.includes(pool.id))
  return chosen.length > 0 && chosen.every((pool) => pool.is_rankable)
})

onMounted(async () => {
  if (!playerName.value) {
    await router.replace('/')
    return
  }
  try {
    pools.value = await loadPools()
    draft.value = { ...draft.value, pools: stillAvailable() }
  } catch {
    failure.value = 'Could not load the pools.'
  } finally {
    loading.value = false
  }
})

function stillAvailable(): string[] {
  const live = pools.value.filter((pool) => draft.value.pools.includes(pool.id)).map((pool) => pool.id)
  return live.length > 0 ? live : pools.value.slice(0, 1).map((pool) => pool.id)
}

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

  <RulesForm :settings="draft" :pools="pools" :loading="loading" @change="draft = $event" />

  <p class="ranked">{{ ranked ? 'This game counts for pool rankings.' : 'This game will not count for rankings.' }}</p>

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

.ranked {
  margin-top: var(--space-12);
  font-size: var(--text-small);
  color: var(--ink-faint);
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
