import { computed, reactive, ref, shallowRef } from 'vue'
import { toLocalTime } from '@/net/clock'
import { apiUrl, avatarUrl } from '@/net/http'
import * as socket from '@/net/socket'
import type {
  AccountKind,
  ClientMessage,
  HintKind,
  Lobby,
  LobbyStatus,
  Mode,
  Player,
  RatingKind,
  Reveal,
  Round,
  RoundOutcome,
  Settings,
  Verdict,
} from '@/net/protocol'
import { toRows } from '@/game/feed'
import { fallbackColour } from '@/game/palette'
import { accountKind, forgetLobby, playerId, playerName, rememberLobby } from './session'

const FEED_LIMIT = 400
const GUESS_LOCKOUT_MS = 500
const HINT_WAIT_MS = 1500
const ENTRY_TIMEOUT_MS = 8000

export const DEFAULT_SETTINGS: Settings = {
  mode: 'bolt',
  guess_time_ms: 30000,
  clip_length_ms: 5000,
  points_to_win: 10,
  max_rounds: 30,
  intermission_ms: 5000,
  hints_enabled: true,
  mask_enabled: false,
  allow_replay: true,
  allow_suggestions: true,
  pools: [],
}

export type Seat = {
  id: string
  name: string
  colour: string
  avatar: string
  account: AccountKind
  score: number
  present: boolean
}

type Keyless<T> = T extends unknown ? Omit<T, 'key'> : never

export type FeedEntry =
  | { key: number; kind: 'chat'; playerId: string; text: string }
  | { key: number; kind: 'solved'; playerId: string; points: number; elapsedMs: number; place: number }
  | { key: number; kind: 'presence'; playerId: string; arrived: boolean }
  | { key: number; kind: 'divider'; ordinal: number; outcome: RoundOutcome; track: Reveal }
  | { key: number; kind: 'game'; number: number; over: boolean }

export type BreatherTone = 'won' | 'lost' | 'cold'

export type Breather = { tone: BreatherTone; headline: string; until: number; track: Reveal; final: boolean }

export type PrivateVerdict = { verdict: Verdict; points: number; elapsedMs: number; at: number }

export const code = ref('')
export const status = ref<LobbyStatus>('open')
export const hostId = ref('')
export const settings = shallowRef<Settings>(DEFAULT_SETTINGS)
export const seats = reactive(new Map<string, Seat>())
export const round = shallowRef<Round | null>(null)
export const rating = ref<RatingKind>('stars')
export const totalRounds = ref(0)
export const feed = ref<FeedEntry[]>([])
export const gameNumber = ref(0)
export const standings = ref<Player[]>([])
export const closedReason = ref('')
export const lastError = ref('')
export const verdict = shallowRef<PrivateVerdict | null>(null)
export const breather = shallowRef<Breather | null>(null)
export const hints = reactive(new Map<HintKind, string>())
export const hintsMissing = reactive(new Set<HintKind>())
export const solvedThisRound = reactive(new Set<string>())
export const solveCounts = reactive(new Map<string, number>())
export const roundsPlayed = ref(0)
export const skipVoted = ref(false)
export const guessLocked = ref(false)
export const joinedMidRound = ref(false)

let commandId = 0
let keyCounter = 0
let breatherTimer: ReturnType<typeof setTimeout> | null = null
let entering: { id: string; resolve: () => void; reject: (reason: Error) => void } | null = null

export const roster = computed(() => [...seats.values()])
export const mode = computed<Mode>(() => settings.value.mode)
export const isHost = computed(() => hostId.value !== '' && hostId.value === playerId.value)

export function nameOf(id: string): string {
  if (id === playerId.value) return playerName.value
  const seat = seats.get(id)
  if (seat?.name) return seat.name
  return `Player ${id.slice(-4)}`
}

export function inkOf(id: string): string {
  return seats.get(id)?.colour || fallbackColour(id)
}

export function avatarOf(id: string): string {
  return seats.get(id)?.avatar ?? ''
}

export function profileable(id: string): boolean {
  if (id === playerId.value) return accountKind.value === 'discord'
  return seats.get(id)?.account === 'discord'
}

function push(entry: Keyless<FeedEntry>): void {
  keyCounter += 1
  feed.value = [...feed.value, { ...entry, key: keyCounter } as FeedEntry].slice(-FEED_LIMIT)
}

export const feedRows = computed(() =>
  toRows(feed.value, { nameOf, inkOf, linkable: profileable, me: playerId.value }),
)

function seatFor(id: string): Seat {
  const existing = seats.get(id)
  if (existing) return existing
  const created: Seat = { id, name: '', colour: '', avatar: '', account: 'guest', score: 0, present: true }
  seats.set(id, created)
  return created
}

function absorb(player: Player): Seat {
  const seat = seatFor(player.player_id)
  if (player.name) seat.name = player.name
  if (player.colour) seat.colour = player.colour
  if (player.avatar) seat.avatar = avatarUrl(player.avatar)
  if (player.account) seat.account = player.account
  seat.score = player.score
  seat.present = player.present
  return seat
}

function resetRound(): void {
  verdict.value = null
  skipVoted.value = false
  hints.clear()
  hintsMissing.clear()
  solvedThisRound.clear()
}

function resetLobby(): void {
  seats.clear()
  feed.value = []
  gameNumber.value = 0
  standings.value = []
  round.value = null
  totalRounds.value = 0
  closedReason.value = ''
  lastError.value = ''
  breather.value = null
  solveCounts.clear()
  roundsPlayed.value = 0
  resetRound()
}

function applyLobby(data: Lobby): void {
  code.value = data.code
  status.value = data.status
  hostId.value = data.host_id
  settings.value = data.settings
  rememberLobby(data.code)
  const seen = new Set(data.players.map((player) => player.player_id))
  data.players.forEach(absorb)
  for (const id of [...seats.keys()]) {
    if (!seen.has(id)) seats.delete(id)
  }
  joinedMidRound.value = data.round != null
  round.value = data.round ?? null
  if (data.round) rating.value = data.round.rating
  settleEntry(null)
}

function applyRoundEnd(ordinal: number, outcome: RoundOutcome, scores: Record<string, number>, track: Reveal): void {
  for (const [id, score] of Object.entries(scores)) {
    seatFor(id).score = score
  }
  roundsPlayed.value = ordinal
  push({ kind: 'divider', ordinal, outcome, track })
  breather.value = { ...describeBreather(outcome, track), final: gameDecided(ordinal, scores) }
  holdBreather(Date.now() + settings.value.intermission_ms)
  round.value = null
  skipVoted.value = false
}

function gameDecided(ordinal: number, scores: Record<string, number>): boolean {
  return ordinal >= totalRounds.value || Object.values(scores).some((score) => score >= settings.value.points_to_win)
}

function describeBreather(outcome: RoundOutcome, track: Reveal): Omit<Breather, 'final'> {
  const until = Date.now()
  if (outcome === 'skipped') return { tone: 'cold', headline: 'Skipped', until, track }
  if (outcome !== 'solved') return { tone: 'cold', headline: 'Nobody got it', until, track }
  if (solvedThisRound.has(playerId.value)) return { tone: 'won', headline: 'You got it', until, track }
  return { tone: 'lost', headline: 'Beaten to it', until, track }
}

function holdBreather(untilLocal: number): void {
  if (breatherTimer) clearTimeout(breatherTimer)
  if (breather.value) breather.value = { ...breather.value, until: untilLocal }
  breatherTimer = setTimeout(() => (breather.value = null), Math.max(0, untilLocal - Date.now()))
}

function bind(): void {
  socket.on('lobby', applyLobby)
  socket.on('lobby_settings', (data) => (settings.value = data.settings))
  socket.on('host_changed', (data) => (hostId.value = data.player_id))
  socket.on('player_joined', (data) => {
    absorb(data)
    push({ kind: 'presence', playerId: data.player_id, arrived: true })
  })
  socket.on('player_updated', absorb)
  socket.on('player_left', (data) => {
    seatFor(data.player_id).present = false
    push({ kind: 'presence', playerId: data.player_id, arrived: false })
  })
  socket.on('game_started', (data) => {
    status.value = 'playing'
    totalRounds.value = data.rounds
    standings.value = []
    solveCounts.clear()
    roundsPlayed.value = 0
    gameNumber.value += 1
    push({ kind: 'game', number: gameNumber.value, over: false })
  })
  socket.on('round_started', (data) => {
    joinedMidRound.value = false
    round.value = data
    rating.value = data.rating
    breather.value = null
    resetRound()
  })
  socket.on('intermission', (data) => holdBreather(toLocalTime(data.resumes_at_ms)))
  socket.on('solved', (data) => {
    solvedThisRound.add(data.player_id)
    solveCounts.set(data.player_id, (solveCounts.get(data.player_id) ?? 0) + 1)
    push({
      kind: 'solved',
      playerId: data.player_id,
      points: data.points,
      elapsedMs: data.elapsed_ms,
      place: data.place,
    })
  })
  socket.on('chat', (data) => push({ kind: 'chat', playerId: data.player_id, text: data.text }))
  socket.on('guess_result', (data) => {
    verdict.value = { verdict: data.verdict, points: data.points, elapsedMs: data.elapsed_ms, at: Date.now() }
  })
  socket.on('hint', (data) => {
    hintsMissing.delete(data.kind)
    hints.set(data.kind, data.kind === 'cover' ? apiUrl(data.value) : data.value)
  })
  socket.on('round_ended', (data) => applyRoundEnd(data.ordinal, data.outcome, data.scores, data.track))
  socket.on('game_ended', (data) => {
    status.value = 'open'
    standings.value = data.standings
    data.standings.forEach(absorb)
    round.value = null
    push({ kind: 'game', number: gameNumber.value, over: true })
  })
  socket.on('lobby_closed', (data) => {
    closedReason.value = data.reason
    code.value = ''
    round.value = null
    forgetLobby()
  })
  socket.on('error', (data, id) => {
    if (!settleEntry(new Error(data.message), id)) lastError.value = data.message
  })
  socket.onReconnected(() => {
    if (!code.value) return
    enter({ type: 'join', data: { code: code.value } }).catch(() => abandonLobby())
  })
}

function settleEntry(reason: Error | null, id?: string): boolean {
  if (!entering) return false
  if (reason && id !== entering.id) return false
  const pending = entering
  entering = null
  if (reason) pending.reject(reason)
  else pending.resolve()
  return true
}

function nextCommandId(): string {
  commandId += 1
  return `c${commandId}`
}

function enter(message: ClientMessage): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const id = nextCommandId()
    entering = { id, resolve, reject }
    socket.send(message, id)
    setTimeout(() => settleEntry(new Error('the server did not answer'), id), ENTRY_TIMEOUT_MS)
  })
}

export function connect(): Promise<void> {
  return socket.connect(playerName.value)
}

export function createLobby(chosen: Settings): Promise<void> {
  resetLobby()
  settings.value = chosen
  return enter({ type: 'create', data: chosen })
}

export function joinLobby(target: string): Promise<void> {
  resetLobby()
  return enter({ type: 'join', data: { code: target.trim().toUpperCase() } })
}

export function changeSettings(chosen: Settings): void {
  socket.send({ type: 'settings', data: chosen }, nextCommandId())
}

export function abandonLobby(): void {
  closedReason.value = 'closed'
  code.value = ''
  hostId.value = ''
  round.value = null
  forgetLobby()
}

export function dismissResults(): void {
  standings.value = []
}

export function leaveLobby(): void {
  socket.send({ type: 'leave', data: {} })
  code.value = ''
  hostId.value = ''
  forgetLobby()
  resetLobby()
}

export function startGame(): void {
  socket.send({ type: 'start', data: {} }, nextCommandId())
}

export function say(text: string): boolean {
  const clean = text.trim()
  if (!clean) return false
  if (!round.value) {
    socket.send({ type: 'chat', data: { text: clean } })
    return true
  }
  if (guessLocked.value) return false
  guessLocked.value = true
  setTimeout(() => (guessLocked.value = false), GUESS_LOCKOUT_MS)
  socket.send({ type: 'guess', data: { text: clean } })
  return true
}

export function askHint(kind: HintKind): void {
  if (hints.has(kind) || hintsMissing.has(kind)) return
  socket.send({ type: 'hint', data: { kind } })
  setTimeout(() => {
    if (!hints.has(kind)) hintsMissing.add(kind)
  }, HINT_WAIT_MS)
}

export function voteSkip(): void {
  if (skipVoted.value) return
  skipVoted.value = true
  socket.send({ type: 'skip', data: {} })
}

bind()
