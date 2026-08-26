<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import PersonRow from '@/components/PersonRow.vue'
import TrackdownMark from '@/components/TrackdownMark.vue'
import { unlockAudio } from '@/game/clip'
import { enterLobby } from '@/game/useLobbyEntry'
import { loaded, online, roster } from '@/store/friends'
import { accountKind, lobbyCode, playerName } from '@/store/session'

const route = useRoute()
const router = useRouter()

const SHOWN = 6

const code = ref(clean(String(route.query.join ?? '')))
const failure = ref('')
const busy = ref(false)

const named = computed(() => playerName.value !== '')
const joinable = computed(() => named.value && code.value.length === 4 && !busy.value)
const closed = computed(() => closedMessage(String(route.query.closed ?? '')))
const login = computed(() => loginMessage(String(route.query.login ?? '')))
const rejoinable = computed(() => named.value && lobbyCode.value !== '' && lobbyCode.value !== code.value)
const isMember = computed(() => accountKind.value === 'discord')
const shortlist = computed(() => roster.value.slice(0, SHOWN))

function clean(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
}

const LOGIN_MESSAGES: Record<string, string> = {
  ok: 'You are logged in with Discord.',
  failed: 'That Discord login did not go through.',
  in_lobby: 'Leave your lobby before logging in.',
}

function loginMessage(outcome: string): string {
  return LOGIN_MESSAGES[outcome] ?? ''
}

function closedMessage(reason: string): string {
  if (reason === 'internal error') return 'That lobby crashed on the server. Nothing you did.'
  return reason ? 'That lobby is gone.' : ''
}

function onCodeInput(event: Event): void {
  code.value = clean((event.target as HTMLInputElement).value)
  failure.value = ''
}

async function join(target: string): Promise<void> {
  if (busy.value || !named.value) return
  busy.value = true
  failure.value = await enterLobby(target)
  busy.value = false
  if (!failure.value) await router.push(`/${target}`)
}

function go(where: string): void {
  unlockAudio()
  void router.push(where)
}
</script>

<template>
  <section class="hero">
    <TrackdownMark class="giant" />
    <p class="pitch">Name the track before your friends do.</p>
  </section>

  <p v-if="closed" class="notice" role="status">{{ closed }}</p>
  <p v-if="login" class="notice" role="status">{{ login }}</p>
  <p v-if="!named" class="notice quiet">Pick a name up in the corner first.</p>

  <form class="join" @submit.prevent="join(code)">
    <label for="code">Join a game</label>
    <div class="row">
      <input
        id="code"
        :value="code"
        class="stamp"
        spellcheck="false"
        autocapitalize="characters"
        placeholder="CODE"
        :disabled="!named"
        @input="onCodeInput"
      />
      <button type="submit" data-tone="loud" :disabled="!joinable">{{ busy ? 'Joining...' : 'Go' }}</button>
    </div>
    <p v-if="failure" class="failure" role="alert">{{ failure }}</p>
    <button v-if="rejoinable" type="button" data-tone="plain" @click="join(lobbyCode)">
      Back to {{ lobbyCode }}
    </button>
  </form>

  <nav class="rest">
    <button type="button" class="big" :disabled="!named" @click="go('/create')">Create a lobby</button>
    <button type="button" class="big" :disabled="!named" @click="go('/daily')">Daily</button>
    <button type="button" class="big" @click="go('/leaderboard')">Leaderboards</button>
  </nav>

  <section v-if="isMember" class="friends">
    <h2>Friends <span class="count">{{ online.length }} online</span></h2>
    <ul v-if="!loaded" aria-hidden="true">
      <li v-for="row in 3" :key="row" class="ghost"><span></span></li>
    </ul>
    <p v-else-if="!roster.length" class="quiet">Nobody yet. <RouterLink to="/friends">Add someone</RouterLink>.</p>
    <template v-else>
      <ul>
        <PersonRow v-for="friend in shortlist" :key="friend.player_id" :person="friend">
          <button v-if="friend.code" type="button" data-tone="quiet" @click="join(friend.code)">Join them</button>
        </PersonRow>
      </ul>
      <RouterLink v-if="roster.length > SHOWN" to="/friends" class="more">All {{ roster.length }} friends</RouterLink>
    </template>
  </section>
</template>

<style scoped>
.hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-24);
  padding-block: var(--space-16) var(--space-48);
}

.giant {
  font-size: 5.2rem;
}

.pitch {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 200;
  color: var(--ink-soft);
  max-width: 18ch;
  padding-bottom: var(--space-12);
}

.notice {
  border-top: 1px solid var(--rule);
  padding-top: var(--space-16);
  margin-bottom: var(--space-16);
  color: var(--spot-red-text);
  font-weight: 700;
}

.notice.quiet {
  color: var(--ink-faint);
  font-weight: 400;
  font-size: var(--text-small);
}

.join {
  border-top: 1px solid var(--rule);
  padding-top: var(--space-24);
}

.join label {
  display: block;
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  margin-bottom: var(--space-8);
}

.row {
  display: flex;
  gap: var(--space-12);
  max-width: 30rem;
}

.stamp {
  font-family: var(--font-stamp);
  font-size: var(--text-display);
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  padding-block: var(--space-4);
}

.row button {
  padding-inline: var(--space-32);
}

.failure {
  margin-top: var(--space-8);
  font-size: var(--text-small);
  color: var(--spot-red-text);
}

.rest {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: var(--space-32);
  border-top: 1px solid var(--rule);
}

.big {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 300;
  text-align: left;
  padding: var(--space-24) var(--space-24) var(--space-24) 0;
  color: var(--ink);
  border-bottom: 1px solid var(--rule);
  transition: color var(--dur-fast) var(--ease-out), padding-left var(--dur-mid) var(--ease-out);
}

.big + .big {
  border-left: 1px solid var(--rule);
  padding-left: var(--space-24);
}

.big:last-child {
  padding-right: 0;
}

.big:not(:disabled):hover {
  color: var(--spot-red-text);
}

.friends {
  margin-top: var(--space-48);
  padding-top: var(--space-16);
  border-top: 1px solid var(--rule);
}

.friends h2 {
  display: flex;
  align-items: baseline;
  gap: var(--space-8);
  padding-bottom: var(--space-8);
}

.count {
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.quiet {
  font-size: var(--text-small);
  color: var(--ink-faint);
}

.more {
  display: inline-block;
  margin-top: var(--space-12);
  font-size: var(--text-small);
  color: var(--spot-blue-text);
}

.ghost {
  display: flex;
  align-items: center;
  padding-block: var(--space-12);
  border-bottom: 1px solid var(--rule);
}

.ghost span {
  width: 10ch;
  height: 1.1em;
  background: var(--ground-sunk);
}

@media (max-width: 40rem) {
  .giant {
    font-size: 3.4rem;
  }

  .stamp {
    font-size: var(--text-title);
  }

  .rest {
    grid-template-columns: 1fr;
  }

  .big,
  .big + .big {
    border-left: 0;
    padding-inline: 0;
  }
}
</style>
