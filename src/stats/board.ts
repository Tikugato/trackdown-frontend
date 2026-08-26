import { clipLabel } from '@/game/daily'
import { trackLabel } from '@/game/track'
import { fallbackColour } from '@/game/palette'
import { avatarUrl } from '@/net/http'
import type { DailyEntry, FastestEntry, PointsEntry } from '@/net/protocol'
import { percent, seconds } from './filter'

export type BoardRow = {
  key: string
  playerId: string
  name: string
  ink: string
  avatar: string
  place: number
  you: boolean
  song?: { id: string; title: string }
  stats: string[]
  value: string
}

type Ranked = { place: number; player_id: string; name: string; colour?: string; avatar?: string }

function base(entry: Ranked, me: string): Omit<BoardRow, 'stats' | 'value'> {
  return {
    key: entry.player_id,
    playerId: entry.player_id,
    name: entry.name,
    ink: entry.colour || fallbackColour(entry.player_id),
    avatar: avatarUrl(entry.avatar),
    place: entry.place,
    you: entry.player_id === me,
  }
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

export function pointsRows(entries: PointsEntry[], me: string): BoardRow[] {
  return entries.map((entry) => ({
    ...base(entry, me),
    stats: [plural(entry.games, 'game'), `${entry.solved}/${entry.rounds} · ${percent(entry.solved, entry.rounds)}`],
    value: String(entry.points),
  }))
}

export function fastestRows(entries: FastestEntry[], me: string, when: Intl.DateTimeFormat): BoardRow[] {
  return entries.map((entry) => ({
    ...base(entry, me),
    song: { id: entry.song_id, title: trackLabel(entry) },
    stats: [when.format(new Date(entry.set_at))],
    value: seconds(entry.solved_ms),
  }))
}

export function dailyRows(entries: DailyEntry[], me: string, single: boolean): BoardRow[] {
  return entries.map((entry) => ({
    ...base(entry, me),
    stats: [outcome(entry, single), entry.hints ? plural(entry.hints, 'hint') : ''].filter(Boolean),
    value: `${entry.points} pts`,
  }))
}

function outcome(entry: DailyEntry, single: boolean): string {
  if (single) return entry.solved ? `got it at ${clipLabel(entry.fastest_ms)}` : 'missed it'
  const best = entry.fastest_ms ? `, best ${clipLabel(entry.fastest_ms)}` : ''
  return `${entry.solved}/${plural(entry.played, 'daily', 'dailies')}${best}`
}
