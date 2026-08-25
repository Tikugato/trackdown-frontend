<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { enterLobby } from '@/game/useLobbyEntry'
import type { Invite } from '@/store/friends'

defineProps<{ invites: Invite[] }>()
const emit = defineEmits<{ dismiss: [key: number] }>()

const router = useRouter()
const failure = ref('')

async function accept(invite: Invite): Promise<void> {
  failure.value = await enterLobby(invite.code)
  if (failure.value) return
  emit('dismiss', invite.key)
  await router.push(`/${invite.code}`)
}
</script>

<template>
  <ul v-if="invites.length" class="notices" aria-live="polite">
    <li v-for="invite in invites" :key="invite.key">
      <span class="line"><strong>{{ invite.name }}</strong> invited you to <span class="code">{{ invite.code }}</span></span>
      <button type="button" data-tone="loud" @click="accept(invite)">Join</button>
      <button type="button" data-tone="plain" @click="emit('dismiss', invite.key)">Not now</button>
    </li>
    <li v-if="failure" class="failure" role="alert">{{ failure }}</li>
  </ul>
</template>

<style scoped>
.notices {
  margin-bottom: var(--space-24);
  border-bottom: 1px solid var(--rule);
}

.notices li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-12);
  padding-block: var(--space-12);
  border-top: 1px solid var(--rule);
}

.line {
  flex: 1;
  color: var(--ink-soft);
}

.code {
  font-family: var(--font-stamp);
  letter-spacing: 0.12em;
  color: var(--ink);
}

.failure {
  font-size: var(--text-small);
  color: var(--spot-red-text);
}
</style>
