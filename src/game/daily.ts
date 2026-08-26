import type { DailyDistribution } from '@/net/protocol'

export const LADDER_MS = [100, 500, 1000, 2000, 5000, 10000]

export type StepMark = 'x' | '-' | 'o'

export type DistRow = { key: string; label: string; count: number; fraction: number; mine: boolean }

export function distRows(dist: DailyDistribution, mineMs: number, mineMissed: boolean): DistRow[] {
  const byMs = new Map(dist.solved.map((bucket) => [bucket.clip_length_ms, bucket.count]))
  const rows: DistRow[] = LADDER_MS.map((ms) => ({
    key: String(ms),
    label: clipLabel(ms),
    count: byMs.get(ms) ?? 0,
    fraction: 0,
    mine: !mineMissed && mineMs === ms,
  }))
  rows.push({ key: 'missed', label: 'Missed', count: dist.missed, fraction: 0, mine: mineMissed })
  const most = Math.max(1, ...rows.map((row) => row.count))
  for (const row of rows) row.fraction = row.count / most
  return rows
}

export function distTotal(dist: DailyDistribution): number {
  return dist.missed + dist.solved.reduce((sum, bucket) => sum + bucket.count, 0)
}

export function clipLabel(ms: number): string {
  return `${ms / 1000}s`
}

export function markAt(pattern: string, index: number): StepMark | undefined {
  const mark = pattern[index]
  return mark === 'x' || mark === '-' || mark === 'o' ? mark : undefined
}

export function nextDailyAt(): Date {
  const next = new Date()
  next.setUTCHours(24, 0, 0, 0)
  return next
}

const GLYPHS: Record<StepMark, string> = { x: '🟥', '-': '⬛', o: '🟩' }

export type ShareResult = {
  date: string
  poolName: string
  pattern: string
  ladder: number[]
  hints: number
  url: string
}

function shareDate(iso: string): string {
  const on = new Date(`${iso}T00:00:00Z`)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(on)
}

export function shareText(result: ShareResult): string {
  const grid = [...result.pattern].map((mark) => GLYPHS[mark as StepMark] ?? mark).join('')
  const solved = result.pattern.endsWith('o')
  const outcome = solved ? `🎯 Got it at ${clipLabel(result.ladder[result.pattern.length - 1] ?? 0)}` : '💀 Missed it'
  const hints = result.hints === 0 ? '🧠 no hints' : `💡 ${result.hints} hint${result.hints === 1 ? '' : 's'}`
  return [
    `🎧 Trackdown Daily · ${result.poolName}`,
    shareDate(result.date),
    grid,
    `${outcome} · ${hints}`,
    `🔗 ${result.url}`,
  ].join('\n')
}
