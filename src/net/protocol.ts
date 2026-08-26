export type Mode = 'bolt' | 'race'
export type LobbyStatus = 'open' | 'playing' | 'closed'
export type Verdict = 'hit' | 'near_miss' | 'no_match'
export type RoundOutcome = 'solved' | 'timeout' | 'skipped' | 'aborted'
export type RatingKind = 'stars' | 'complexity'
export type HintKind = 'duration' | 'bpm' | 'ranked_date' | 'pool' | RatingKind | 'mapper' | 'cover'
export type LeaveReason = 'left' | 'disconnected'
export type CloseReason = 'closed' | 'internal error'
export type PoolKind = 'ranked' | 'curated' | 'user'
export type AccountKind = 'guest' | 'discord'

export type Account = {
  kind: AccountKind
  player_id?: string
  name?: string
  avatar?: string
  friends_can_join?: boolean
}

export type Relation = 'none' | 'friend' | 'incoming' | 'outgoing'

export type Person = {
  player_id: string
  name: string
  colour?: string
  avatar?: string
  relation?: Relation
}

export type Friend = Person & { online: boolean; code?: string; last_seen?: string }

export type FriendsPage = {
  friends_can_join: boolean
  friends: Friend[]
  incoming: Person[]
  outgoing: Person[]
}

export type Pool = {
  id: string
  slug: string
  name: string
  description: string
  kind: PoolKind
  song_count: number
  rating: RatingKind
  rating_min: number
  rating_max: number
  categories: string[]
}

export type NameFilter = {
  show?: string[] | undefined
  show_all?: boolean | undefined
  hide?: string[] | undefined
  hide_all?: boolean | undefined
}

export type PoolFilter = {
  rating_min?: number | undefined
  rating_max?: number | undefined
  ranked_from?: string | undefined
  ranked_to?: string | undefined
  categories?: string[] | undefined
  mappers: NameFilter
  artists: NameFilter
}

export type TimeWindow = 'today' | 'week' | 'month' | 'year' | 'all'
export type PointsSort = 'points' | 'solved' | 'rounds' | 'games'

export type PointsEntry = {
  place: number
  player_id: string
  name: string
  colour?: string
  avatar?: string
  points: number
  rounds: number
  solved: number
  games: number
}

export type FastestSolve = {
  solved_ms: number
  song_id: string
  title: string
  artist?: string
  set_at: string
}

export type FastestEntry = FastestSolve & {
  place: number
  player_id: string
  name: string
  colour?: string
  avatar?: string
}

export type ProfileStats = {
  games: number
  rounds: number
  solved: number
  points: number
  first_bloods: number
  mean_solved_ms: number
  hints_asked: number
  fastest?: FastestSolve
}

export type Profile = {
  player_id: string
  name: string
  colour?: string
  avatar?: string
  joined_at: string
  relation?: Relation
  stats: ProfileStats
}

export type Settings = {
  mode: Mode
  guess_time_ms: number
  clip_length_ms: number
  points_to_win: number
  max_rounds: number
  intermission_ms: number
  hints_enabled: boolean
  mask_enabled: boolean
  allow_replay: boolean
  allow_suggestions: boolean
  pools: string[]
  filters?: Record<string, PoolFilter> | undefined
}

export type SuggestScope = Pick<Settings, 'pools' | 'filters'>

export type Player = {
  player_id: string
  name?: string
  colour?: string
  avatar?: string
  account?: AccountKind
  score: number
  place: number
  present: boolean
  reason?: LeaveReason
}

export type Mask = { title: number; artist?: number }

export type Reveal = {
  title: string
  subtitle?: string
  artist?: string
  mapper?: string
  cover_url?: string
  source_name?: string
  source_url?: string
}

export type Round = {
  round_id: string
  mask?: Mask
  ordinal: number
  clip_url: string
  clip_length_ms: number
  play_at_ms: number
  deadline_ms: number
  server_time_ms: number
  rating: RatingKind
}

export type Lobby = {
  code: string
  status: LobbyStatus
  host_id: string
  settings: Settings
  players: Player[]
  round?: Round
  server_time_ms: number
}

export type DailyState = {
  challenge_id: string
  pool_id: string
  date: string
  ladder_ms: number[]
  step: number
  pattern: string
  guesses: string[]
  solved: boolean
  done: boolean
  clip_url: string
  clip_length_ms: number
  rating?: RatingKind
  hint_kinds: HintKind[]
  hints: Partial<Record<HintKind, string>>
  track?: Reveal
  verdict?: Verdict
  server_time_ms: number
}

export type DailyEntry = {
  place: number
  player_id: string
  name: string
  colour?: string
  avatar?: string
  points: number
  played: number
  solved: number
  hints: number
  fastest_ms: number
}

export type DailyBucket = { clip_length_ms: number; count: number }

export type DailyDistribution = { solved: DailyBucket[]; missed: number }

export type ClientMessage =
  | { type: 'hello'; data: { name: string; colour?: string; resume?: string } }
  | { type: 'create'; data: Settings }
  | { type: 'settings'; data: Settings }
  | { type: 'join'; data: { code: string } }
  | { type: 'leave'; data: Record<string, never> }
  | { type: 'start'; data: Record<string, never> }
  | { type: 'guess'; data: { text: string } }
  | { type: 'chat'; data: { text: string } }
  | { type: 'hint'; data: { kind: HintKind } }
  | { type: 'skip'; data: Record<string, never> }
  | { type: 'ping'; data: { client_time_ms: number } }
  | { type: 'profile'; data: { name?: string; colour?: string } }
  | { type: 'invite'; data: { player_id: string } }
  | { type: 'daily'; data: { pool: string } }
  | { type: 'daily_guess'; data: { pool: string; text: string } }
  | { type: 'daily_skip'; data: { pool: string } }
  | { type: 'daily_hint'; data: { pool: string; kind: HintKind } }

export type ServerMessage =
  | {
      type: 'welcome'
      data: { player_id: string; name: string; account: AccountKind; avatar?: string; resume: string; server_time_ms: number }
    }
  | { type: 'pong'; data: { client_time_ms: number; server_time_ms: number } }
  | { type: 'lobby'; data: Lobby }
  | { type: 'lobby_settings'; data: { settings: Settings; by: string } }
  | { type: 'host_changed'; data: { player_id: string } }
  | { type: 'player_joined'; data: Player }
  | { type: 'player_updated'; data: Player }
  | { type: 'player_left'; data: Player }
  | { type: 'game_started'; data: { rounds: number } }
  | { type: 'round_started'; data: Round }
  | { type: 'intermission'; data: { next_ordinal: number; resumes_at_ms: number; server_time_ms: number } }
  | { type: 'solved'; data: { player_id: string; points: number; elapsed_ms: number; place: number } }
  | { type: 'skip_voted'; data: { player_id: string } }
  | { type: 'chat'; data: { player_id: string; text: string } }
  | { type: 'guess_result'; data: { verdict: Verdict; points: number; elapsed_ms: number } }
  | { type: 'hint'; data: { kind: HintKind; value: string; requested_by: string } }
  | {
      type: 'round_ended'
      data: { ordinal: number; outcome: RoundOutcome; scores: Record<string, number>; track: Reveal }
    }
  | { type: 'game_ended'; data: { standings: Player[] } }
  | { type: 'lobby_closed'; data: { reason: CloseReason } }
  | { type: 'friend_presence'; data: { player_id: string; online: boolean; code?: string } }
  | { type: 'invited'; data: { player_id: string; name: string; code: string } }
  | { type: 'daily_state'; data: DailyState }
  | { type: 'error'; id?: string; data: { code: string; message: string } }

export type ServerMessageType = ServerMessage['type']

export type ServerMessageOf<T extends ServerMessageType> = Extract<ServerMessage, { type: T }>
