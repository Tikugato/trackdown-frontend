import type { NameFilter, Pool, PoolFilter, RatingKind } from '@/net/protocol'

export const RATING_LABELS: Record<RatingKind, string> = { stars: 'Stars', complexity: 'Complexity' }

export const MIN_POOL_SONGS = 100

export const EMPTY_FILTER: PoolFilter = { mappers: {}, artists: {} }

export function tooSmall(pool: Pool, matched: number | undefined): boolean {
  return (matched ?? pool.song_count) < MIN_POOL_SONGS
}

export function filterFor(filters: Record<string, PoolFilter> | undefined, poolId: string): PoolFilter {
  return filters?.[poolId] ?? EMPTY_FILTER
}

export function isEmptyFilter(filter: PoolFilter): boolean {
  return (
    filter.rating_min === undefined &&
    filter.rating_max === undefined &&
    !filter.ranked_from &&
    !filter.ranked_to &&
    !filter.categories?.length &&
    isEmptyNames(filter.mappers) &&
    isEmptyNames(filter.artists)
  )
}

function isEmptyNames(names: NameFilter): boolean {
  return !names.show?.length && !names.hide?.length
}

export function withFilter(
  filters: Record<string, PoolFilter> | undefined,
  poolId: string,
  filter: PoolFilter,
): Record<string, PoolFilter> | undefined {
  const next = { ...filters }
  if (isEmptyFilter(filter)) delete next[poolId]
  else next[poolId] = filter
  return Object.keys(next).length ? next : undefined
}

export function keepFilters(
  filters: Record<string, PoolFilter> | undefined,
  poolIds: string[],
): Record<string, PoolFilter> | undefined {
  if (!filters) return undefined
  const kept = Object.fromEntries(Object.entries(filters).filter(([id]) => poolIds.includes(id)))
  return Object.keys(kept).length ? kept : undefined
}

export function categoryLabel(code: string): string {
  return code
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
}

export function describeFilter(pool: Pool, filter: PoolFilter): string[] {
  const lines: string[] = []
  const rating = RATING_LABELS[pool.rating].toLowerCase()
  if (filter.rating_min !== undefined && filter.rating_max !== undefined) {
    lines.push(`${rating} ${filter.rating_min} to ${filter.rating_max}`)
  } else if (filter.rating_min !== undefined) {
    lines.push(`${rating} ${filter.rating_min} and up`)
  } else if (filter.rating_max !== undefined) {
    lines.push(`${rating} up to ${filter.rating_max}`)
  }
  if (filter.ranked_from && filter.ranked_to) lines.push(`ranked ${filter.ranked_from} to ${filter.ranked_to}`)
  else if (filter.ranked_from) lines.push(`ranked since ${filter.ranked_from}`)
  else if (filter.ranked_to) lines.push(`ranked before ${filter.ranked_to}`)
  if (filter.categories?.length) lines.push(filter.categories.map(categoryLabel).join(', '))
  lines.push(...describeNames('mappers', filter.mappers), ...describeNames('artists', filter.artists))
  return lines
}

function describeNames(noun: string, names: NameFilter): string[] {
  const lines: string[] = []
  if (names.show?.length) lines.push(`${noun} ${joinTerms(names.show, names.show_all)}`)
  if (names.hide?.length) lines.push(`no ${noun} ${joinTerms(names.hide, names.hide_all)}`)
  return lines
}

function joinTerms(terms: string[], all?: boolean): string {
  return terms.join(all && terms.length > 1 ? ' and ' : ' or ')
}
