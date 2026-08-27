<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ChatColumn from '@/components/ChatColumn.vue'
import FriendInvites from '@/components/FriendInvites.vue'
import PlayerLink from '@/components/PlayerLink.vue'
import PlayerMark from '@/components/PlayerMark.vue'
import RulesForm from '@/components/RulesForm.vue'
import { describeFilter, filterFor, isEmptyFilter } from '@/game/filters'
import { useMatchCounts } from '@/game/useMatchCounts'
import {
  avatarOf,
  changeSettings,
  feedRows,
  inkOf,
  isHost,
  lastError,
  leaveLobby,
  hostId,
  mode,
  nameOf,
  profileable,
  roster,
  say,
  settings,
  startGame,
} from '@/store/game'
import { invite, online } from '@/store/friends'
import { ensurePools, pools, poolsReady } from '@/store/pools'
import { playerId } from '@/store/session'

const props = defineProps<{ code: string; joining: boolean; failure: string }>()

const router = useRouter()
const copied = ref(false)
const editing = ref(false)
const counts = useMatchCounts(settings)

onMounted(() => void ensurePools().catch(() => {}))

const modeLine = computed(() =>
  mode.value === 'bolt' ? 'Bolt, first to the target takes it' : 'Continuous, everyone keeps guessing',
)

const rules = computed(() => {
  const chosen = settings.value
  return [
    `${chosen.clip_length_ms / 1000} second clip`,
    `${chosen.guess_time_ms / 1000} seconds a round`,
    mode.value === 'bolt' ? `First to ${chosen.points_to_win}` : `${chosen.max_rounds} rounds`,
    `${chosen.intermission_ms / 1000} second breather`,
    chosen.hints_enabled ? 'Hints on' : 'Hints off',
    chosen.mask_enabled ? 'Word count shown' : 'No word count',
    chosen.allow_replay ? 'Replay allowed' : 'One listen only',
    chosen.allow_suggestions ? 'Title suggestions on' : 'No title suggestions',
  ]
})

const poolLines = computed(() =>
  pools.value
    .filter((pool) => settings.value.pools.includes(pool.id))
    .map((pool) => {
      const filter = filterFor(settings.value.filters, pool.id)
      return isEmptyFilter(filter) ? pool.name : `${pool.name}, ${describeFilter(pool, filter).join(', ')}`
    }),
)

async function copyLink(): Promise<void> {
  await navigator.clipboard.writeText(`${location.origin}/${props.code}`)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function quit(): void {
  leaveLobby()
  void router.push('/')
}
</script>

<template>
  <section class="code">
    <p class="stamp" :class="{ waiting: joining }">{{ joining ? '. . . .' : code }}</p>
    <div class="share">
      <p>Anyone with this code can drop in.</p>
      <button type="button" data-tone="plain" @click="copyLink">{{ copied ? 'Copied' : 'Copy the link' }}</button>
    </div>
  </section>

  <p v-if="failure" class="failure" role="alert">{{ failure }}</p>

  <div class="split">
    <section>
      <h2>In the room <span class="count">{{ roster.length }}</span></h2>
      <ul v-if="joining" class="people" aria-hidden="true">
        <li v-for="row in 3" :key="row"><span class="ghost"></span></li>
      </ul>
      <ul v-else class="people">
        <li v-for="seat in roster" :key="seat.id" :class="{ gone: !seat.present }" :style="{ '--player': inkOf(seat.id) }">
          <PlayerMark :colour="inkOf(seat.id)" :avatar="avatarOf(seat.id)" :name="nameOf(seat.id)" class="chip" />
          <PlayerLink :id="seat.id" :linkable="profileable(seat.id)" new-tab class="who">{{ nameOf(seat.id) }}</PlayerLink>
          <span v-if="seat.id === hostId" class="tag">host</span>
          <span v-if="seat.id === playerId" class="tag">you</span>
          <span v-if="!seat.present" class="tag">left</span>
        </li>
      </ul>
    </section>

    <section>
      <h2>
        The rules
        <button v-if="isHost" type="button" data-tone="plain" class="edit" @click="editing = !editing">
          {{ editing ? 'Done' : 'Change' }}
        </button>
      </h2>
      <ul v-if="!editing" class="rules">
        <li>{{ modeLine }}</li>
        <li v-for="line in rules" :key="line">{{ line }}</li>
        <li v-for="line in poolLines" :key="line">{{ line }}</li>
      </ul>
    </section>

    <ChatColumn :rows="feedRows" empty="Say something, the whole room sees it." class="talk" @say="say" />
  </div>

  <section v-if="editing" class="editor">
    <RulesForm :settings="settings" :pools="pools" :loading="!poolsReady" :counts="counts" @change="changeSettings" />
  </section>

  <FriendInvites v-if="online.length" :friends="online" @invite="invite" />

  <div class="actions">
    <button v-if="isHost" type="button" data-tone="loud" :disabled="joining" @click="startGame">
      Start the game
    </button>
    <p v-else class="waiting-line">Waiting for {{ nameOf(hostId) }} to start.</p>
    <button type="button" data-tone="quiet" @click="quit">Leave</button>
  </div>

  <p v-if="lastError" class="failure" role="alert">{{ lastError }}</p>
</template>

<style scoped>
.code {
  padding-bottom: var(--space-24);
  border-bottom: 1px solid var(--rule);
}

.stamp {
  font-family: var(--font-stamp);
  font-size: var(--text-display-xl);
  letter-spacing: 0.18em;
  line-height: 1.1;
}

.stamp.waiting {
  color: var(--ink-faint);
}

.share {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-16);
  margin-top: var(--space-8);
  font-size: var(--text-small);
  color: var(--ink-soft);
}

h2 {
  display: flex;
  align-items: baseline;
  gap: var(--space-8);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

.count {
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr);
  gap: var(--space-48);
  margin-top: var(--space-32);
}

@media (max-width: 64rem) {
  .split {
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  }

  .talk {
    grid-column: 1 / -1;
  }
}

@media (max-width: 40rem) {
  .split {
    grid-template-columns: 1fr;
    gap: var(--space-32);
  }
}

.people li {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding-block: var(--space-8);
  border-bottom: 1px solid var(--rule);
}

.chip {
  --mark: 1.5rem;
}

.people .who {
  font-family: var(--font-display);
  font-size: var(--text-heading);
  font-weight: 500;
  color: color-mix(in oklab, var(--player) 78%, var(--ink));
}

.people li.gone {
  opacity: 0.5;
}

.people li.gone .who {
  text-decoration: line-through;
}

.tag {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}

.edit {
  margin-left: auto;
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.editor {
  margin-top: var(--space-32);
  padding-top: var(--space-24);
  border-top: 1px solid var(--rule);
}

.rules li {
  padding-block: var(--space-8);
  border-bottom: 1px solid var(--rule);
  color: var(--ink-soft);
  font-size: var(--text-small);
}

.ghost {
  display: block;
  width: 9ch;
  height: 1.1em;
  background: var(--ground-sunk);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-16);
  margin-top: var(--space-48);
}

.waiting-line {
  color: var(--ink-soft);
  font-size: var(--text-small);
}

.failure {
  margin-top: var(--space-16);
  color: var(--spot-red-text);
  font-size: var(--text-small);
}

@media (max-width: 40rem) {
  .stamp {
    font-size: var(--text-display);
  }

  .split {
    grid-template-columns: 1fr;
    gap: var(--space-32);
  }
}
</style>
