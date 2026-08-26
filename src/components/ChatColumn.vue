<script setup lang="ts">
import GuessFeed from '@/components/GuessFeed.vue'
import GuessInput from '@/components/GuessInput.vue'
import type { FeedRow } from '@/game/feed'

defineProps<{ rows: FeedRow[]; empty: string }>()
const emit = defineEmits<{ say: [text: string] }>()
</script>

<template>
  <section class="chat">
    <h2>Chat</h2>
    <GuessFeed :rows="rows" :empty="empty" class="feed" />
    <GuessInput :locked="false" :live="false" :suggest="false" @guess="emit('say', $event)" />
  </section>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  min-height: 18rem;
  max-height: 28rem;
}

h2 {
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

.feed {
  flex: 1;
  min-height: 0;
  padding-top: var(--space-8);
}
</style>
