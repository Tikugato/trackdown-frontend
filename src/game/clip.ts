import { ref } from 'vue'
import { untilServerTime } from '@/net/clock'
import { apiUrl } from '@/net/http'

export type ClipState = 'idle' | 'fetching' | 'decoding' | 'ready' | 'playing' | 'failed'

const VOLUME_KEY = 'trackdown.volume'
const SLOW_AFTER_MS = 1200
const DEFAULT_VOLUME = 0.8

export const clipState = ref<ClipState>('idle')
export const volume = ref(readVolume())
export const soundBlocked = ref(false)
export const clipReady = ref(false)
export const clipSlow = ref(false)

let context: AudioContext | null = null
let gain: GainNode | null = null
let source: AudioBufferSourceNode | null = null
let startTimer: ReturnType<typeof setTimeout> | null = null
let held: AudioBuffer | null = null
let slowTimer: ReturnType<typeof setTimeout> | null = null

function readVolume(): number {
  try {
    const stored = Number(localStorage.getItem(VOLUME_KEY))
    return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : DEFAULT_VOLUME
  } catch {
    return DEFAULT_VOLUME
  }
}

export function setVolume(next: number): void {
  volume.value = next
  if (gain) gain.gain.value = next
  try {
    localStorage.setItem(VOLUME_KEY, String(next))
  } catch {
    return
  }
}

export function unlockAudio(): void {
  context ??= new AudioContext()
  gain ??= buildGain(context)
  if (context.state !== 'running') void context.resume().then(noteBlocked)
  noteBlocked()
}

function noteBlocked(): void {
  soundBlocked.value = context?.state !== 'running'
}

function buildGain(target: AudioContext): GainNode {
  const node = target.createGain()
  node.gain.value = volume.value
  node.connect(target.destination)
  return node
}

export function replayClip(): void {
  if (!held || !context || !gain) return
  source?.stop()
  const node = context.createBufferSource()
  node.buffer = held
  node.connect(gain)
  node.addEventListener('ended', () => {
    if (source === node) clipState.value = 'idle'
  })
  source = node
  node.start(context.currentTime)
  clipState.value = 'playing'
}

export function stopClip(): void {
  clearSlowTimer()
  if (startTimer) clearTimeout(startTimer)
  startTimer = null
  source?.stop()
  source?.disconnect()
  source = null
  held = null
  clipReady.value = false
  clipState.value = 'idle'
}

export async function playClip(
  path: string,
  playAtMs: number,
  clipLengthMs: number,
  joinedMidRound: boolean,
): Promise<void> {
  stopClip()
  unlockAudio()
  if (!context || !gain) return
  const buffer = await decode(path)
  if (!buffer) return
  schedule(buffer, playAtMs, clipLengthMs, joinedMidRound)
}

async function decode(path: string): Promise<AudioBuffer | null> {
  clipState.value = 'fetching'
  slowTimer = setTimeout(() => (clipSlow.value = true), SLOW_AFTER_MS)
  try {
    const response = await fetch(apiUrl(path))
    if (!response.ok) throw new Error(`clip request failed with ${response.status}`)
    const bytes = await response.arrayBuffer()
    clearSlowTimer()
    clipState.value = 'decoding'
    return await context!.decodeAudioData(bytes)
  } catch {
    clearSlowTimer()
    clipState.value = 'failed'
    return null
  }
}

function clearSlowTimer(): void {
  if (slowTimer) clearTimeout(slowTimer)
  slowTimer = null
  clipSlow.value = false
}

function schedule(buffer: AudioBuffer, playAtMs: number, clipLengthMs: number, joinedMidRound: boolean): void {
  held = buffer
  clipReady.value = true
  const node = context!.createBufferSource()
  node.buffer = buffer
  node.connect(gain!)
  node.addEventListener('ended', () => {
    if (source === node) clipState.value = 'idle'
  })
  source = node

  const waitMs = untilServerTime(playAtMs)
  if (waitMs >= 0) {
    node.start(context!.currentTime + waitMs / 1000)
    clipState.value = 'ready'
    startTimer = setTimeout(() => (clipState.value = 'playing'), waitMs)
    return
  }
  if (!joinedMidRound) {
    node.start(context!.currentTime)
    clipState.value = 'playing'
    return
  }
  const into = -waitMs / 1000
  if (into >= Math.min(buffer.duration, clipLengthMs / 1000)) {
    clipState.value = 'idle'
    return
  }
  node.start(context!.currentTime, into)
  clipState.value = 'playing'
}
