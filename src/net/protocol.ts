export type Mode = 'bolt' | 'race'
export type LobbyStatus = 'open' | 'playing' | 'closed'
export type Verdict = 'hit' | 'near_miss' | 'no_match'
export type RoundOutcome = 'solved' | 'timeout' | 'skipped' | 'aborted'
export type RatingKind = 'stars' | 'complexity'
export type HintKind = 'duration' | 'bpm' | 'ranked_date' | RatingKind | 'mapper' | 'cover'
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

export type Friend = Person & { online: boolean; code?: string }

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
  is_rankable: boolean
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
}

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

export type Mask = { title: string; artist?: string }

export type Reveal = {
  title: string
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

export type ClientMessage =
  | { type: 'hello'; data: { name: string; colour?: string; resume?: string } }
  | { type: 'create'; data: Settings }
  | { type: 'settings'; data: Settings }
  | { type: 'join'; data: { code: string } }
  | { type: 'leave'; data: Record<string, never> }
  | { type: 'start'; data: Record<string, never> }
  | { type: 'guess'; data: { text: string } }
  | { type: 'hint'; data: { kind: HintKind } }
  | { type: 'skip'; data: Record<string, never> }
  | { type: 'ping'; data: { client_time_ms: number } }
  | { type: 'profile'; data: { name?: string; colour?: string } }
  | { type: 'invite'; data: { player_id: string } }

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
  | { type: 'error'; id?: string; data: { code: string; message: string } }

export type ServerMessageType = ServerMessage['type']

export type ServerMessageOf<T extends ServerMessageType> = Extract<ServerMessage, { type: T }>
