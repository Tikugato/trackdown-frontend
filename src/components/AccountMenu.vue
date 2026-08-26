<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import PlayerMark from '@/components/PlayerMark.vue'
import type { AccountKind } from '@/net/protocol'

const props = defineProps<{ id: string; name: string; kind: AccountKind; colour: string; avatar: string; locked: boolean }>()
const emit = defineEmits<{ signIn: [name: string]; signOut: []; logIn: [] }>()

const open = ref(false)
const naming = ref(false)
const draft = ref('')
const field = ref<HTMLInputElement | null>(null)

const signedIn = computed(() => props.name !== '')
const isMember = computed(() => props.kind === 'discord')
const label = computed(() => (signedIn.value ? props.name : 'Log in'))
const suffix = computed(() => (signedIn.value && !isMember.value ? 'guest' : ''))

watch(naming, async (on) => {
  if (!on) return
  draft.value = props.name
  await nextTick()
  field.value?.select()
})

function toggle(): void {
  open.value = !open.value
  naming.value = false
}

function confirm(): void {
  const chosen = draft.value.trim()
  if (!chosen) return
  emit('signIn', chosen)
  open.value = false
  naming.value = false
}

function leave(): void {
  emit('signOut')
  open.value = false
}

function discord(): void {
  emit('logIn')
  open.value = false
}
</script>

<template>
  <div class="account" @keydown.esc="open = false">
    <button type="button" class="trigger" :aria-expanded="open" @click="toggle">
      <PlayerMark v-if="signedIn" :colour="colour" :avatar="avatar" :name="name" class="face" />
      <span class="who">{{ label }}</span>
      <span v-if="suffix" class="tag">{{ suffix }}</span>
    </button>

    <div v-if="open" class="panel">
      <template v-if="naming">
        <label for="guest-name">Pick a name</label>
        <input id="guest-name" ref="field" v-model="draft" maxlength="20" @keydown.enter="confirm" />
        <button type="button" data-tone="loud" :disabled="!draft.trim()" @click="confirm">Play as guest</button>
      </template>

      <template v-else-if="signedIn">
        <RouterLink v-if="isMember" :to="`/players/${id}`" class="choice" @click="open = false">Profile</RouterLink>
        <RouterLink to="/settings" class="choice" @click="open = false">Settings</RouterLink>
        <button
          v-if="!isMember"
          type="button"
          class="choice"
          :disabled="locked"
          @click="discord"
        >
          Log in with Discord
          <span v-if="locked" class="soon">in a lobby</span>
        </button>
        <button type="button" data-tone="plain" :disabled="locked" @click="leave">Sign out</button>
      </template>

      <template v-else>
        <button type="button" class="choice" :disabled="locked" @click="discord">
          Log in with Discord
          <span v-if="locked" class="soon">in a lobby</span>
        </button>
        <button type="button" class="choice" @click="naming = true">Play as a guest</button>
      </template>
    </div>

    <button v-if="open" class="scrim" type="button" aria-label="Close the account menu" @click="open = false"></button>
  </div>
</template>

<style scoped>
.account {
  position: relative;
}

.trigger {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-4) 0;
  font-weight: 700;
  font-size: var(--text-small);
  color: var(--ink);
}

.face {
  --mark: 1.35rem;
}

.trigger:hover .who {
  color: var(--spot-red-text);
}

.tag {
  font-size: var(--text-micro);
  letter-spacing: 0.04em;
  color: var(--ink-faint);
}

.panel {
  position: absolute;
  top: calc(100% + var(--space-8));
  right: 0;
  z-index: 2;
  display: grid;
  gap: var(--space-8);
  justify-items: start;
  min-width: 15rem;
  padding: var(--space-16);
  background: var(--ground-raised);
  border: 1px solid var(--ink);
}

.panel label {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.panel input {
  font-size: var(--text-heading);
}

.panel > button[data-tone='loud'] {
  width: 100%;
}

.choice {
  display: flex;
  text-decoration: none;
  color: inherit;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-16);
  width: 100%;
  padding: var(--space-8) 0;
  border-bottom: 1px solid var(--rule);
  text-align: left;
}

.choice:last-child {
  border-bottom: 0;
}

.choice:not(:disabled):hover {
  color: var(--spot-red-text);
}

.soon {
  font-size: var(--text-micro);
  font-weight: 700;
  color: var(--ink-faint);
}

.scrim {
  position: fixed;
  inset: 0;
  z-index: 1;
  cursor: default;
}
</style>
