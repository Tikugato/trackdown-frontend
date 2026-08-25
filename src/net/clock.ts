const MAX_SAMPLES = 9

let samples: number[] = []
let offset = 0

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function recordSample(clientTimeMs: number, serverTimeMs: number, receivedAtMs: number): void {
  samples.push((serverTimeMs - clientTimeMs + (serverTimeMs - receivedAtMs)) / 2)
  if (samples.length > MAX_SAMPLES) samples.shift()
  offset = median(samples)
}

export function resetClock(): void {
  samples = []
  offset = 0
}

export function isSynced(): boolean {
  return samples.length > 0
}

export function serverNow(): number {
  return Date.now() + offset
}

export function toLocalTime(serverTimeMs: number): number {
  return serverTimeMs - offset
}

export function untilServerTime(serverTimeMs: number): number {
  return toLocalTime(serverTimeMs) - Date.now()
}
