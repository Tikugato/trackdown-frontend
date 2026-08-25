<script setup lang="ts">
import { ref } from 'vue'
import PlayerMark from '@/components/PlayerMark.vue'
import { fallbackColour } from '@/game/palette'
import { avatarUrl } from '@/net/http'
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
      <li v-for="friend in friends" :key="friend.player_id">
        <PlayerMark
          :colour="friend.colour || fallbackColour(friend.player_id)"
          :avatar="avatarUrl(friend.avatar)"
          :name="friend.name"
          class="chip"
        />
        <span class="who">{{ friend.name }}</span>
        <button type="button" data-tone="plain" :disabled="sent.has(friend.player_id)" @click="send(friend.player_id)">
          {{ sent.has(friend.player_id) ? 'Invited' : 'Invite' }}
        </button>
      </li>
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

li {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding-block: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

.chip {
  --mark: 1.25rem;
}

.who {
  flex: 1;
  font-family: var(--font-display);
  font-weight: 500;
}
</style>
