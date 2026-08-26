<script setup lang="ts">
import { ref } from 'vue'
import PersonRow from '@/components/PersonRow.vue'
import type { Friend } from '@/net/protocol'

defineProps<{ friends: Friend[] }>()
const emit = defineEmits<{ invite: [playerId: string] }>()

const sent = ref(new Set<string>())

function send(playerId: string): void {
  emit('invite', playerId)
  sent.value = new Set([...sent.value, playerId])
}
</script>

<template>
  <section class="invites">
    <h2>Friends online</h2>
    <ul>
      <PersonRow v-for="friend in friends" :key="friend.player_id" :person="friend">
        <button type="button" data-tone="plain" :disabled="sent.has(friend.player_id)" @click="send(friend.player_id)">
          {{ sent.has(friend.player_id) ? 'Invited' : 'Invite' }}
        </button>
      </PersonRow>
    </ul>
  </section>
</template>

<style scoped>
.invites {
  margin-top: var(--space-32);
}

h2 {
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--rule);
}
</style>
