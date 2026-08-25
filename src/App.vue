<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import AccountMenu from '@/components/AccountMenu.vue'
import InviteNotices from '@/components/InviteNotices.vue'
import TrackdownMark from '@/components/TrackdownMark.vue'
import { loginUrl } from '@/net/http'
import { connectionStatus, disconnect } from '@/net/socket'
import { code } from '@/store/game'
import { dismissInvite, invites, refreshFriends } from '@/store/friends'
import { accountKind, playerAvatar, playerColour, playerId, playerName, refreshAccount, signIn, signOut } from '@/store/session'
import { setTheme, theme, type ThemeChoice } from '@/store/theme'

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }

const themeLabel = computed(() => ({ system: 'System', light: 'Paper', dark: 'Ink' })[theme.value])
const dropped = computed(() => connectionStatus.value === 'reconnecting')
const inLobby = computed(() => code.value !== '')
const isMember = computed(() => accountKind.value === 'discord')

onMounted(async () => {
  await refreshAccount()
  await refreshFriends()
})

function logIn(): void {
  location.assign(loginUrl(playerId.value))
}

async function leave(): Promise<void> {
  await signOut()
  disconnect()
}
</script>

<template>
  <header class="bar">
    <RouterLink to="/" class="home"><TrackdownMark /></RouterLink>
    <div class="tools">
      <p v-if="dropped" class="dropped" role="status">Reconnecting</p>
      <RouterLink v-if="isMember" to="/friends" class="friends">Friends</RouterLink>
      <button type="button" class="theme" @click="setTheme(NEXT_THEME[theme])">{{ themeLabel }}</button>
      <AccountMenu
        :name="playerName"
        :kind="accountKind"
        :colour="playerColour"
        :avatar="playerAvatar"
        :locked="inLobby"
        @sign-in="signIn"
        @sign-out="leave"
        @log-in="logIn"
      />
    </div>
  </header>

  <main>
    <InviteNotices :invites="invites" @dismiss="dismissInvite" />
    <RouterView />
  </main>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-24);
  max-width: var(--column);
  margin: 0 auto;
  padding: var(--space-16) var(--space-24) var(--space-12);
  border-bottom: 1px solid var(--rule);
}

.home {
  font-size: var(--text-heading);
  text-decoration: none;
}

.tools {
  display: flex;
  align-items: center;
  gap: var(--space-16);
}

.dropped {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--spot-red-text);
}

.friends {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  text-decoration: none;
}

.friends:hover,
.friends.router-link-active {
  color: var(--ink);
}

.theme {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  padding: var(--space-4);
}

.theme:hover {
  color: var(--ink);
}

main {
  max-width: var(--column);
  margin: 0 auto;
  padding: var(--space-32) var(--space-24) var(--space-64);
}

@media (max-width: 40rem) {
  .bar,
  main {
    padding-inline: var(--space-16);
  }
}
</style>
