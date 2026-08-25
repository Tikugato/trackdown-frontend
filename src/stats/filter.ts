import { computed, type ComputedRef } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw } from 'vue-router'
import type { HintKind, Settings, TimeWindow } from '@/net/protocol'

export type SettingKey = Exclude<keyof Settings, 'pools'>
export type HintFilter = 'any' | 'none' | HintKind[]

export type StatFilter = {
  time: TimeWindow
  pools: string[]
  hints: HintFilter
  settings: Partial<Record<SettingKey, string>>
  search: string
  song: string
}

export const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

const WINDOWS = new Set<string>(TIME_WINDOWS.map((window) => window.value))

export const SETTING_KEYS: SettingKey[] = [
  'mode',
  'clip_length_ms',
  'guess_time_ms',
  'points_to_win',
  'max_rounds',
  'intermission_ms',
  'hints_enabled',
  'mask_enabled',
  'allow_replay',
  'allow_suggestions',
]

export const EMPTY_FILTER: StatFilter = { time: 'all', pools: [], hints: 'any', settings: {}, search: '', song: '' }

function first(value: LocationQuery[string] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value
  return typeof single === 'string' ? single : ''
}

function list(raw: string): string[] {
  return raw.split(',').filter(Boolean)
}

function hintsFrom(raw: string): HintFilter {
  if (raw === '' || raw === 'any') return 'any'
  if (raw === 'none') return 'none'
  return list(raw) as HintKind[]
}

export function fromQuery(query: LocationQuery): StatFilter {
  const time = first(query.time)
  const settings: StatFilter['settings'] = {}
  for (const key of SETTING_KEYS) {
    const value = first(query[key])
    if (value) settings[key] = value
  }
  return {
    time: WINDOWS.has(time) ? (time as TimeWindow) : 'all',
    pools: list(first(query.pools)),
    hints: hintsFrom(first(query.hints)),
    settings,
    search: first(query.search),
    song: first(query.song),
  }
}

export function toQuery(filter: StatFilter): Record<string, string> {
  const query: Record<string, string> = { ...filter.settings }
  if (filter.time !== 'all') query.time = filter.time
  if (filter.pools.length) query.pools = filter.pools.join(',')
  if (filter.hints !== 'any') query.hints = Array.isArray(filter.hints) ? filter.hints.join(',') : filter.hints
  if (filter.search) query.search = filter.search
  if (filter.song) query.song = filter.song
  return query
}

export function toSearchParams(filter: StatFilter): URLSearchParams {
  return new URLSearchParams(toQuery(filter))
}

export function useStatFilter(): { filter: ComputedRef<StatFilter>; update: (next: StatFilter) => void } {
  const route = useRoute()
  const router = useRouter()
  const filter = computed(() => fromQuery(route.query))
  function update(next: StatFilter): void {
    const kept: LocationQueryRaw = {}
    for (const [key, value] of Object.entries(route.query)) {
      if (!OWNED.has(key)) kept[key] = value
    }
    void router.replace({ query: { ...kept, ...toQuery(next) } })
  }
  return { filter, update }
}

const OWNED = new Set<string>(['time', 'pools', 'hints', 'search', 'song', ...SETTING_KEYS])

export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`
}

export function percent(part: number, whole: number): string {
  return whole === 0 ? '0%' : `${Math.round((part / whole) * 100)}%`
}
