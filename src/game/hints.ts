import type { HintKind, RatingKind } from '@/net/protocol'

export const HINT_ORDER: HintKind[] = ['duration', 'bpm', 'ranked_date', 'pool', 'mapper', 'cover', 'stars', 'complexity']

export const HINT_LABELS: Record<HintKind, string> = {
  duration: 'Length',
  bpm: 'BPM',
  ranked_date: 'Ranked',
  pool: 'Pool',
  stars: 'Rating',
  complexity: 'Rating',
  mapper: 'Mapper',
  cover: 'Cover',
}

export function isRating(kind: HintKind): kind is RatingKind {
  return kind === 'stars' || kind === 'complexity'
}

export function boardOrder(rating: RatingKind, pooled: boolean): HintKind[] {
  return HINT_ORDER.filter((kind) => (isRating(kind) ? kind === rating : kind !== 'pool' || pooled))
}

const TONES: Record<string, string> = {
  easy: 'var(--diff-easy)',
  normal: 'var(--diff-normal)',
  hard: 'var(--diff-hard)',
  expert: 'var(--diff-expert)',
  expertplus: 'var(--diff-expert-plus)',
}

export type RatingRow = { name: string; rating: string; tone: string }

export function parseRating(value: string): RatingRow[] {
  return value.split(',').flatMap((chunk) => {
    const split = chunk.indexOf(':')
    if (split < 0) return []
    const name = chunk.slice(0, split).trim()
    const rating = chunk.slice(split + 1).trim()
    if (!name || !rating) return []
    return [{ name, rating, tone: TONES[toneKey(name)] ?? 'var(--ink-soft)' }]
  })
}

function toneKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z+]/g, '').replace('+', 'plus')
}
