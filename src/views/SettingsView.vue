<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PlayerMark from '@/components/PlayerMark.vue'
import { PLAYER_COLOURS } from '@/game/palette'
import { sendProfile } from '@/net/socket'
import { setFriendsCanJoin } from '@/store/friends'
import { accountKind, friendsCanJoin, playerAvatar, playerColour, playerName, pickColour, rename } from '@/store/session'

const router = useRouter()

const draftName = ref(playerName.value)
const saved = ref(false)

const isMember = computed(() => accountKind.value === 'discord')
const trimmed = computed(() => draftName.value.trim())
const nameChanged = computed(() => trimmed.value !== '' && trimmed.value !== playerName.value)

onMounted(async () => {
  if (!playerName.value) await router.replace('/')
})

function chooseColour(colour: string): void {
  if (colour === playerColour.value) return
  pickColour(colour)
  sendProfile(playerName.value, colour)
  flash()
}

async function toggleFriendsCanJoin(): Promise<void> {
  await setFriendsCanJoin(!friendsCanJoin.value)
  flash()
}

function saveName(): void {
  if (!nameChanged.value) return
  rename(trimmed.value)
  sendProfile(trimmed.value, playerColour.value)
  flash()
}

let clearing: ReturnType<typeof setTimeout> | null = null

function flash(): void {
  saved.value = true
  if (clearing) clearTimeout(clearing)
  clearing = setTimeout(() => (saved.value = false), 1600)
}
</script>

<template>
  <h1>Settings</h1>

  <section class="block">
    <h2>How you look</h2>
    <div class="preview">
      <PlayerMark :colour="playerColour" :avatar="playerAvatar" :name="playerName" class="big" />
      <p class="who">{{ playerName }}</p>
    </div>
  </section>

  <section class="block">
    <h2>Your colour</h2>
    <p class="hint">This is the ink beside your name in the room.</p>
    <ul class="swatches">
      <li v-for="colour in PLAYER_COLOURS" :key="colour">
        <button
          type="button"
          class="swatch"
          :class="{ chosen: colour === playerColour }"
          :style="{ '--swatch': colour }"
          :aria-label="`Use ${colour}`"
          :aria-pressed="colour === playerColour"
          @click="chooseColour(colour)"
        ></button>
      </li>
    </ul>
  </section>

  <section class="block">
    <h2>Your name</h2>
    <p v-if="isMember" class="hint">Your name comes from Discord, so it is not editable here.</p>
    <template v-else>
      <p class="hint">Everyone in the room sees this.</p>
      <div class="row">
        <input v-model="draftName" maxlength="20" aria-label="Your name" @keydown.enter="saveName" />
        <button type="button" data-tone="loud" :disabled="!nameChanged" @click="saveName">Save</button>
      </div>
    </template>
  </section>

  <section v-if="isMember" class="block">
    <h2>Friends</h2>
    <p class="hint">With this on, friends see which lobby you are in and can join it without the code.</p>
    <button type="button" data-tone="chip" class="toggle" :aria-pressed="friendsCanJoin" @click="toggleFriendsCanJoin">
      Friends can join my lobby
    </button>
  </section>

  <p v-if="saved" class="saved" role="status">Saved.</p>
</template>

<style scoped>
.block {
  margin-top: var(--space-32);
  padding-top: var(--space-16);
  border-top: 1px solid var(--rule);
}

.hint {
  margin-top: var(--space-4);
  font-size: var(--text-small);
  color: var(--ink-soft);
  max-width: 48ch;
}

.preview {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  margin-top: var(--space-16);
}

.big {
  --mark: 3.5rem;
}

.who {
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 600;
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-12);
  margin-top: var(--space-16);
}

.swatch {
  display: block;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  background: var(--swatch);
  border: 1px solid var(--rule);
  transition: transform var(--dur-fast) var(--ease-out);
}

.swatch:hover {
  transform: translateY(-2px);
}

.swatch.chosen {
  border: 2px solid var(--ink);
}

.row {
  display: flex;
  gap: var(--space-12);
  margin-top: var(--space-12);
  max-width: 26rem;
}

.toggle {
  margin-top: var(--space-12);
}

.saved {
  margin-top: var(--space-24);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--spot-red-text);
}
</style>
