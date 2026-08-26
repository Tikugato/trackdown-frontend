import type {
  Account,
  DailyDistribution,
  DailyEntry,
  FastestEntry,
  FriendsPage,
  Person,
  PointsEntry,
  Pool,
  PoolFilter,
  Profile,
  Relation,
} from './protocol'

export const apiOrigin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/+$/, '')
export const socketUrl = new URL(`${apiOrigin}/ws`, location.origin).href.replace(/^http/, 'ws')

export function avatarUrl(key: string | undefined): string {
  return key ? `${apiOrigin}/avatar/${key}` : ''
}

export function apiUrl(path: string): string {
  return `${apiOrigin}${path}`
}

let poolRequest: Promise<Pool[]> | null = null

export function loadPools(): Promise<Pool[]> {
  poolRequest ??= fetch(`${apiOrigin}/pools`)
    .then((response) => {
      if (!response.ok) throw new Error(`pools request failed with ${response.status}`)
      return response.json() as Promise<Pool[]>
    })
    .catch((reason: unknown) => {
      poolRequest = null
      throw reason
    })
  return poolRequest
}

export async function countSongs(
  pools: string[],
  filters: Record<string, PoolFilter>,
  signal: AbortSignal,
): Promise<Record<string, number>> {
  const response = await fetch(`${apiOrigin}/pools/count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pools, filters }),
    signal,
  })
  if (!response.ok) throw new Error(`count request failed with ${response.status}`)
  return (await response.json()) as Record<string, number>
}

export async function suggestTitles(query: string, signal: AbortSignal): Promise<string[]> {
  const response = await fetch(`${apiOrigin}/autocomplete?q=${encodeURIComponent(query)}`, { signal })
  if (!response.ok) return []
  return (await response.json()) as string[]
}

async function loadJSON<T>(path: string, query: URLSearchParams, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}?${query}`, { signal, credentials: 'include' })
  if (!response.ok) throw new Error(`${path} request failed with ${response.status}`)
  return (await response.json()) as T
}

export function loadDailyBoard(query: URLSearchParams, signal: AbortSignal): Promise<DailyEntry[]> {
  return loadJSON('/daily/standings', query, signal)
}

export function loadDailyDistribution(pool: string, signal: AbortSignal): Promise<DailyDistribution> {
  return loadJSON('/daily/distribution', new URLSearchParams({ pool }), signal)
}

export function loadPointsBoard(query: URLSearchParams, signal: AbortSignal): Promise<PointsEntry[]> {
  query.set('board', 'points')
  return loadJSON('/leaderboards', query, signal)
}

export function loadFastestBoard(query: URLSearchParams, signal: AbortSignal): Promise<FastestEntry[]> {
  query.set('board', 'fastest')
  return loadJSON('/leaderboards', query, signal)
}

export async function loadProfile(playerId: string, query: URLSearchParams, signal: AbortSignal): Promise<Profile | null> {
  const response = await fetch(`${apiOrigin}/players/${encodeURIComponent(playerId)}?${query}`, { signal, credentials: 'include' })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`profile request failed with ${response.status}`)
  return (await response.json()) as Profile
}

export function loginUrl(playerId: string): string {
  const query = new URLSearchParams({ return: location.origin })
  if (playerId) query.set('player', playerId)
  return `${apiOrigin}/auth/discord/login?${query}`
}

async function withSession(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${apiOrigin}${path}`, { credentials: 'include', ...init })
  if (!response.ok) throw new Error(`${path} request failed with ${response.status}`)
  return response
}

export async function loadAccount(): Promise<Account> {
  const response = await fetch(`${apiOrigin}/auth/me`, { credentials: 'include' })
  if (!response.ok) return { kind: 'guest' }
  return (await response.json()) as Account
}

export async function logOut(): Promise<void> {
  await withSession('/auth/logout', { method: 'POST' })
}

export async function loadFriends(): Promise<FriendsPage> {
  return (await (await withSession('/friends')).json()) as FriendsPage
}

export async function searchPlayers(search: string, signal: AbortSignal): Promise<Person[]> {
  const query = new URLSearchParams({ search })
  return (await (await withSession(`/players?${query}`, { signal })).json()) as Person[]
}

export async function requestFriend(playerId: string): Promise<Relation> {
  const response = await withSession(`/friends/${encodeURIComponent(playerId)}`, { method: 'POST' })
  return ((await response.json()) as { relation: Relation }).relation
}

export async function removeFriend(playerId: string): Promise<void> {
  await withSession(`/friends/${encodeURIComponent(playerId)}`, { method: 'DELETE' })
}

export async function saveFriendsCanJoin(allowed: boolean): Promise<void> {
  await withSession('/account/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friends_can_join: allowed }),
  })
}
