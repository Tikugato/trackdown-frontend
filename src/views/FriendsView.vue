<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PlayerLink from '@/components/PlayerLink.vue'
import PlayerMark from '@/components/PlayerMark.vue'
import { fallbackColour } from '@/game/palette'
import { enterLobby } from '@/game/useLobbyEntry'
import { avatarUrl, searchPlayers } from '@/net/http'
import type { Person, Relation } from '@/net/protocol'
import { code } from '@/store/game'
import { befriend, friends, incoming, invite, loaded, outgoing, refreshFriends, unfriend } from '@/store/friends'
import { accountKind } from '@/store/session'

const MIN_SEARCH = 2
const SEARCH_DELAY_MS = 250

const RELATIONS: Record<Relation, string> = {
  none: 'Add',
  friend: 'Friends',
  incoming: 'Accept',
  outgoing: 'Requested',
}

const router = useRouter()
const isMember = computed(() => accountKind.value === 'discord')
const list = computed(() => [...friends.values()].sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name)))
const inLobby = computed(() => code.value !== '')

const query = ref('')
const found = ref<Person[]>([])
const searching = ref(false)
const failure = ref('')
let debounce: ReturnType<typeof setTimeout> | null = null
let inFlight: AbortController | null = null

watch(query, (value) => {
  if (debounce) clearTimeout(debounce)
  const wanted = value.trim()
  if (wanted.length < MIN_SEARCH) {
    found.value = []
    return
  }
  debounce = setTimeout(() => void lookup(wanted), SEARCH_DELAY_MS)
})

onMounted(() => {
  if (isMember.value) void act(refreshFriends)
})

onBeforeUnmount(() => {
  inFlight?.abort()
  if (debounce) clearTimeout(debounce)
})

async function lookup(wanted: string): Promise<void> {
  inFlight?.abort()
  inFlight = new AbortController()
  searching.value = true
  try {
    found.value = await searchPlayers(wanted, inFlight.signal)
  } catch (reason) {
    if (!inFlight.signal.aborted) failure.value = describe(reason)
  } finally {
    searching.value = false
  }
}

function describe(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Something went wrong.'
}

async function act(step: () => Promise<void>): Promise<void> {
  failure.value = ''
  try {
    await step()
  } catch (reason) {
    failure.value = describe(reason)
  }
}

async function add(person: Person): Promise<void> {
  await act(() => befriend(person.player_id))
  if (query.value.trim().length >= MIN_SEARCH) await lookup(query.value.trim())
}

async function joinFriend(target: string): Promise<void> {
  failure.value = await enterLobby(target)
  if (!failure.value) await router.push(`/${target}`)
}

function inkOf(person: Person): string {
  return person.colour || fallbackColour(person.player_id)
}
</script>

<template>
  <section class="intro">
    <h1>Friends</h1>
    <p v-if="isMember">Add people by name, see who is online, and jump into their lobby or pull them into yours.</p>
    <p v-else>Log in with Discord to add friends. Guests have nothing stable to befriend.</p>
  </section>

  <p v-if="failure" class="failure" role="alert">{{ failure }}</p>

  <template v-if="isMember">
    <section class="block">
      <label for="friend-search">Find someone</label>
      <input id="friend-search" v-model="query" type="search" spellcheck="false" autocomplete="off" placeholder="Their Discord name" />
      <ul v-if="found.length" class="people">
        <li v-for="person in found" :key="person.player_id" :style="{ '--player': inkOf(person) }">
          <PlayerMark :colour="inkOf(person)" :avatar="avatarUrl(person.avatar)" :name="person.name" class="chip" />
          <PlayerLink :id="person.player_id" linkable class="who">{{ person.name }}</PlayerLink>
          <button
            type="button"
            data-tone="plain"
            :disabled="person.relation === 'friend' || person.relation === 'outgoing'"
            @click="add(person)"
          >
            {{ RELATIONS[person.relation ?? 'none'] }}
          </button>
        </li>
      </ul>
      <p v-else-if="query.trim().length >= MIN_SEARCH && !searching" class="quiet">Nobody by that name has logged in yet.</p>
    </section>

    <section v-if="incoming.length" class="block">
      <h2>Requests for you</h2>
      <ul class="people">
        <li v-for="person in incoming" :key="person.player_id" :style="{ '--player': inkOf(person) }">
          <PlayerMark :colour="inkOf(person)" :avatar="avatarUrl(person.avatar)" :name="person.name" class="chip" />
          <PlayerLink :id="person.player_id" linkable class="who">{{ person.name }}</PlayerLink>
          <button type="button" data-tone="loud" @click="act(() => befriend(person.player_id))">Accept</button>
          <button type="button" data-tone="plain" @click="act(() => unfriend(person.player_id))">Decline</button>
        </li>
      </ul>
    </section>

    <section v-if="outgoing.length" class="block">
      <h2>Waiting on them</h2>
      <ul class="people">
        <li v-for="person in outgoing" :key="person.player_id" :style="{ '--player': inkOf(person) }">
          <PlayerMark :colour="inkOf(person)" :avatar="avatarUrl(person.avatar)" :name="person.name" class="chip" />
          <PlayerLink :id="person.player_id" linkable class="who">{{ person.name }}</PlayerLink>
          <button type="button" data-tone="plain" @click="act(() => unfriend(person.player_id))">Cancel</button>
        </li>
      </ul>
    </section>

    <section class="block">
      <h2>Your friends <span class="count">{{ list.length }}</span></h2>
      <ul v-if="!loaded" class="people" aria-hidden="true">
        <li v-for="row in 3" :key="row"><span class="ghost"></span></li>
      </ul>
      <p v-else-if="!list.length" class="quiet">Nobody yet. Search a name above.</p>
      <ul v-else class="people">
        <li v-for="friend in list" :key="friend.player_id" :class="{ away: !friend.online }" :style="{ '--player': inkOf(friend) }">
          <PlayerMark :colour="inkOf(friend)" :avatar="avatarUrl(friend.avatar)" :name="friend.name" class="chip" />
          <PlayerLink :id="friend.player_id" linkable class="who">{{ friend.name }}</PlayerLink>
          <span class="state">{{ friend.online ? (friend.code ? `in ${friend.code}` : 'online') : 'offline' }}</span>
          <button v-if="friend.code" type="button" data-tone="quiet" @click="joinFriend(friend.code)">Join them</button>
          <button v-else-if="friend.online && inLobby" type="button" data-tone="quiet" @click="invite(friend.player_id)">Invite</button>
          <button type="button" data-tone="plain" @click="act(() => unfriend(friend.player_id))">Remove</button>
        </li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
.intro {
  padding-bottom: var(--space-24);
}

h1 {
  font-size: var(--text-display);
  font-weight: 200;
  letter-spacing: -0.02em;
}

.intro p {
  margin-top: var(--space-12);
  color: var(--ink-soft);
  max-width: 52ch;
}

.block {
  margin-top: var(--space-32);
  padding-top: var(--space-16);
  border-top: 1px solid var(--rule);
}

.block label {
  display: block;
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  margin-bottom: var(--space-8);
}

.block input {
  max-width: 24rem;
}

h2 {
  display: flex;
  align-items: baseline;
  gap: var(--space-8);
}

.count {
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.people {
  margin-top: var(--space-8);
}

.people li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-12);
  padding-block: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

.people li.away {
  opacity: 0.6;
}

.chip {
  --mark: 1.5rem;
}

.who {
  flex: 1;
  min-width: 8ch;
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 500;
  color: color-mix(in oklab, var(--player) 78%, var(--ink));
}

.state {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  font-family: var(--font-body);
}

.quiet {
  margin-top: var(--space-12);
  font-size: var(--text-small);
  color: var(--ink-faint);
}

.failure {
  margin-bottom: var(--space-16);
  font-size: var(--text-small);
  color: var(--spot-red-text);
}

.ghost {
  display: block;
  width: 10ch;
  height: 1.1em;
  background: var(--ground-sunk);
}
</style>
