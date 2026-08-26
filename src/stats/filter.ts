import { computed, type ComputedRef } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw } from 'vue-router'
import { LADDER_MS } from '@/game/daily'
import type { HintKind, Mode, PoolFilter, Settings, TimeWindow } from '@/net/protocol'

export type SettingKey = Exclude<keyof Settings, 'pools' | 'mode' | 'filters'>
export type HintFilter = 'any' | 'none' | HintKind[]

export type StatFilter = {
  time: TimeWindow
  mode: Mode
  pools: string[]
  filters: Record<string, PoolFilter> | undefined
  hints: HintFilter
  settings: Partial<Record<SettingKey, string>>
  search: string
  song: string
  friends: boolean
  within: number
}

export const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

const WINDOWS = new Set<string>(TIME_WINDOWS.map((window) => window.value))
const WITHINS = new Set<number>(LADDER_MS)

export const SETTING_KEYS: SettingKey[] = [
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

export const EMPTY_FILTER: StatFilter = {
  time: 'all',
  mode: 'bolt',
  pools: [],
  filters: undefined,
  hints: 'any',
  settings: {},
  search: '',
  song: '',
  friends: false,
  within: 0,
}

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

function withinFrom(raw: string): number {
  const ms = Number(raw)
  return WITHINS.has(ms) ? ms : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPoolFilter(value: unknown): value is PoolFilter {
  return isRecord(value) && isRecord(value.mappers) && isRecord(value.artists)
}

function filtersFrom(raw: string): Record<string, PoolFilter> | undefined {
  if (!raw) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return undefined
    const filters: Record<string, PoolFilter> = {}
    for (const [id, filter] of Object.entries(parsed)) {
      if (isPoolFilter(filter)) filters[id] = filter
    }
    return Object.keys(filters).length ? filters : undefined
  } catch {
    return undefined
  }
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
    mode: first(query.mode) === 'race' ? 'race' : 'bolt',
    pools: list(first(query.pools)),
    filters: filtersFrom(first(query.filters)),
    hints: hintsFrom(first(query.hints)),
    settings,
    search: first(query.search),
    song: first(query.song),
    friends: first(query.friends) === '1',
    within: withinFrom(first(query.within)),
  }
}

export function toQuery(filter: StatFilter): Record<string, string> {
  const query: Record<string, string> = { ...filter.settings, mode: filter.mode }
  if (filter.time !== 'all') query.time = filter.time
  if (filter.pools.length) query.pools = filter.pools.join(',')
  if (filter.filters) query.filters = JSON.stringify(filter.filters)
  if (filter.hints !== 'any') query.hints = Array.isArray(filter.hints) ? filter.hints.join(',') : filter.hints
  if (filter.search) query.search = filter.search
  if (filter.song) query.song = filter.song
  if (filter.friends) query.friends = '1'
  if (filter.within) query.within = String(filter.within)
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

const OWNED = new Set<string>(['time', 'mode', 'pools', 'filters', 'hints', 'search', 'song', 'friends', 'within', ...SETTING_KEYS])

export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`
}

export function percent(part: number, whole: number): string {
  return whole === 0 ? '0%' : `${Math.round((part / whole) * 100)}%`
}
