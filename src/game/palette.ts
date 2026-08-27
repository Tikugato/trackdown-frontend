export const PLAYER_COLOURS = [
  '#d0453b',
  '#bd6526',
  '#a07a1a',
  '#4e8c3f',
  '#2c8a80',
  '#3b6fc4',
  '#7e5bc8',
  '#c24a8e',
] as const

export function randomColour(): string {
  const index = Math.floor(Math.random() * PLAYER_COLOURS.length)
  return PLAYER_COLOURS[index] ?? PLAYER_COLOURS[0]
}

export function fallbackColour(id: string): string {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  return PLAYER_COLOURS[hash % PLAYER_COLOURS.length] ?? PLAYER_COLOURS[0]
}
