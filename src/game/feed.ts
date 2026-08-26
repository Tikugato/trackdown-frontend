import type { FeedEntry } from '@/store/game'
import type { Reveal, RoundOutcome } from '@/net/protocol'

type Voice = { playerId: string; who: string; ink: string; linkable: boolean; mine: boolean }

export type FeedRow =
  | ({ key: number; kind: 'chat'; text: string } & Voice)
  | ({ key: number; kind: 'solved'; detail: string } & Voice)
  | { key: number; kind: 'presence'; text: string }
  | { key: number; kind: 'divider'; text: string; track: Reveal }
  | { key: number; kind: 'game'; text: string }

const OUTCOMES: Record<RoundOutcome, (ordinal: number) => string> = {
  solved: (ordinal) => `Round ${ordinal}`,
  timeout: (ordinal) => `Round ${ordinal}, nobody got it`,
  skipped: (ordinal) => `Round ${ordinal}, skipped`,
  aborted: (ordinal) => `Round ${ordinal}, stopped`,
}

export type Naming = {
  nameOf: (id: string) => string
  inkOf: (id: string) => string
  linkable: (id: string) => boolean
  me: string
}

export function toRows(entries: FeedEntry[], naming: Naming): FeedRow[] {
  return entries.map((entry) => toRow(entry, naming))
}

function voiceOf(playerId: string, naming: Naming): Voice {
  return {
    playerId,
    who: naming.nameOf(playerId),
    ink: naming.inkOf(playerId),
    linkable: naming.linkable(playerId),
    mine: playerId === naming.me,
  }
}

function toRow(entry: FeedEntry, naming: Naming): FeedRow {
  if (entry.kind === 'chat') {
    return { key: entry.key, kind: 'chat', text: entry.text, ...voiceOf(entry.playerId, naming) }
  }
  if (entry.kind === 'solved') {
    return {
      key: entry.key,
      kind: 'solved',
      detail: solveDetail(entry.elapsedMs, entry.points),
      ...voiceOf(entry.playerId, naming),
    }
  }
  if (entry.kind === 'presence') {
    return { key: entry.key, kind: 'presence', text: `${naming.nameOf(entry.playerId)} ${entry.arrived ? 'joined' : 'left'}` }
  }
  if (entry.kind === 'game') {
    return { key: entry.key, kind: 'game', text: entry.over ? `Game ${entry.number} over` : `Game ${entry.number}` }
  }
  return { key: entry.key, kind: 'divider', text: OUTCOMES[entry.outcome](entry.ordinal), track: entry.track }
}

function solveDetail(elapsedMs: number, points: number): string {
  const seconds = (elapsedMs / 1000).toFixed(1)
  return points > 1 ? `got it in ${seconds}s, +${points}` : `got it in ${seconds}s`
}
