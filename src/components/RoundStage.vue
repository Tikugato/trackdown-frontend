<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BreatherBand from '@/components/BreatherBand.vue'
import GuessFeed from '@/components/GuessFeed.vue'
import GuessInput from '@/components/GuessInput.vue'
import HintBoard from '@/components/HintBoard.vue'
import RoundClock from '@/components/RoundClock.vue'
import TrackPlate from '@/components/TrackPlate.vue'
import ScorePanel, { type ScoreRow } from '@/components/ScorePanel.vue'
import {
  type ClipState,
  clipReady,
  clipSlow,
  clipState,
  playClip,
  replayClip,
  setVolume,
  soundBlocked,
  stopClip,
  unlockAudio,
  volume,
} from '@/game/clip'
import {
  askHint,
  breather,
  feedRows,
  guessLocked,
  hints,
  hintsMissing,
  inkOf,
  joinedMidRound,
  mode,
  nameOf,
  profileable,
  rating,
  round,
  roster,
  settings,
  skipVoted,
  solvedThisRound,
  say,
  totalRounds,
  verdict,
  voteSkip,
} from '@/store/game'
import { playerId } from '@/store/session'

const NEAR_MISS_FLASH_MS = 2500

const PLAYBACK: Record<ClipState, string> = {
  idle: 'Clip finished',
  fetching: 'Preparing the audio',
  decoding: 'Getting it ready',
  ready: 'Everyone starts together',
  playing: 'Now playing',
  failed: 'The clip did not load',
}

const nearMiss = ref(false)

const scores = computed<ScoreRow[]>(() =>
  [...roster.value]
    .sort((a, b) => b.score - a.score)
    .map((seat) => ({
      id: seat.id,
      name: nameOf(seat.id),
      ink: inkOf(seat.id),
      avatar: seat.avatar,
      score: seat.score,
      you: seat.id === playerId.value,
      present: seat.present,
      solved: solvedThisRound.has(seat.id),
      linkable: profileable(seat.id),
    })),
)

const live = computed(() => round.value !== null)
const askable = computed(() => live.value && !solvedThisRound.has(playerId.value))
const playback = computed(() => PLAYBACK[clipState.value])
const playbackNote = computed(() =>
  clipSlow.value && clipState.value === 'fetching' ? 'Nobody has played this track before, so it is being fetched.' : '',
)
const blurredCover = computed(() => hints.get('cover'))
const canReplay = computed(() => settings.value.allow_replay && clipReady.value)
const heading = computed(() => {
  const ordinal = round.value?.ordinal ?? 0
  if (mode.value === 'bolt' || !totalRounds.value) return `Round ${ordinal}`
  return `Round ${ordinal} of ${totalRounds.value}`
})

const chase = computed(() => (mode.value === 'bolt' ? settings.value.points_to_win : 0))
const announcement = computed(() => (live.value ? `${heading.value}, listen and guess` : breather.value?.headline ?? ''))

watch(
  round,
  (next, previous) => {
    if (!next || previous?.round_id === next.round_id) return
    void playClip(next.clip_url, next.play_at_ms, next.clip_length_ms, joinedMidRound.value)
  },
  { immediate: true },
)

watch(verdict, (result) => {
  if (result?.verdict !== 'near_miss') return
  nearMiss.value = true
  setTimeout(() => (nearMiss.value = false), NEAR_MISS_FLASH_MS)
})

function onVolume(event: Event): void {
  setVolume(Number((event.target as HTMLInputElement).value))
}

onBeforeUnmount(stopClip)
</script>

<template>
  <div class="stage">
    <TrackPlate
      :mask="round?.mask"
      :reveal="breather?.track"
      :blurred="blurredCover"
      :status="playback"
      :note="playbackNote"
      :can-replay="canReplay"
      @replay="replayClip"
    />

    <BreatherBand v-if="breather" :breather="breather" />

    <RoundClock v-else-if="round" :play-at-ms="round.play_at_ms" :deadline-ms="round.deadline_ms">
      <p class="ordinal">{{ heading }} <span v-if="chase" class="chase">first to {{ chase }}</span></p>
    </RoundClock>

    <div v-else class="between">
      <p class="ordinal">Warming up</p>
      <div class="rail"></div>
    </div>

    <div class="controls">
      <label class="volume">
        <span class="visually-hidden">Volume</span>
        <input type="range" min="0" max="1" step="0.05" :value="volume" @input="onVolume" />
      </label>

      <button v-if="soundBlocked" type="button" data-tone="quiet" @click="unlockAudio">Turn the sound on</button>

      <button type="button" data-tone="quiet" class="skip" :disabled="!live || skipVoted || (mode === 'race' && solvedThisRound.has(playerId))" @click="voteSkip">
        {{ skipVoted ? 'Skip asked' : 'Skip' }}
      </button>
    </div>

    <div class="board">
      <div class="column">
        <GuessFeed :rows="feedRows" empty="Type what you think it is. Everyone sees your wrong answers." class="feed" />
        <p v-if="nearMiss" class="near" role="status">
          <span class="mark" aria-hidden="true"></span>
          So close. Not the right track.
        </p>
        <GuessInput :locked="guessLocked" :live="live" :suggest="settings.allow_suggestions ? settings : undefined" @guess="say" />
      </div>

      <aside class="side">
        <ScorePanel :rows="scores" />
        <HintBoard
          v-if="settings.hints_enabled"
          :revealed="hints"
          :missing="hintsMissing"
          :rating="rating"
          :pooled="settings.pools.length > 1"
          :askable="askable"
          @ask="askHint"
        />
      </aside>
    </div>

    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  height: calc(100dvh - 12rem);
  min-height: 30rem;
}

.ordinal {
  font-family: var(--font-stamp);
  font-size: var(--text-heading);
  letter-spacing: 0.08em;
}

.chase {
  font-family: var(--font-body);
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  margin-left: var(--space-8);
}

.between .rail {
  height: var(--rail);
  background: var(--ground-sunk);
  margin-top: var(--space-8);
}

.controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-12);
  font-size: var(--text-small);
}

.volume {
  margin: 0;
  width: 6rem;
}

.volume input {
  accent-color: var(--ink-soft);
  padding: 0;
  border: 0;
  background: none;
}

.skip {
  margin-left: auto;
}

.board {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 14rem;
  gap: var(--space-32);
  min-height: 0;
}

.column {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.side {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  overflow-y: auto;
}

.feed {
  flex: 1;
  min-height: 0;
}

.near {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding-block: var(--space-8);
  color: var(--spot-ochre);
  font-weight: 700;
}

.near .mark {
  width: var(--mark);
  height: var(--mark);
  border: 2px solid var(--spot-ochre);
}

@media (max-width: 52rem) {
  .board {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--space-12);
  }

  .column {
    order: 2;
  }

  .side {
    order: 1;
    overflow: visible;
  }

  .skip {
    margin-left: 0;
  }
}
</style>
