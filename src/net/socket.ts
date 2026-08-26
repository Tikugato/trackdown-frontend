import { ref } from 'vue'
import { recordSample, resetClock } from './clock'
import { socketUrl } from './http'
import type { ClientMessage, ServerMessageOf, ServerMessageType } from './protocol'
import { adoptIdentity, playerColour, resumeToken } from '@/store/session'

export type ConnectionStatus = 'offline' | 'connecting' | 'ready' | 'reconnecting'

const SYNC_BURST = 5
const SYNC_BURST_GAP_MS = 250
const SYNC_INTERVAL_MS = 20000
const BACKOFF_MS = [500, 1000, 2000, 4000, 8000]

type Listener = (data: never, id?: string) => void
type Waiter = { resolve: () => void; reject: (reason: Error) => void }

export const connectionStatus = ref<ConnectionStatus>('offline')

const listeners = new Map<ServerMessageType, Set<Listener>>()
const reconnected = new Set<() => void>()

let socket: WebSocket | null = null
let waiters: Waiter[] = []
let syncTimer: ReturnType<typeof setInterval> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let attempt = 0
let closing = false
let everWelcomed = false

export function on<T extends ServerMessageType>(
  type: T,
  handler: (data: ServerMessageOf<T>['data'], id?: string) => void,
): () => void {
  const bucket = listeners.get(type) ?? new Set<Listener>()
  listeners.set(type, bucket)
  bucket.add(handler as Listener)
  return () => void bucket.delete(handler as Listener)
}

export function onReconnected(handler: () => void): () => void {
  reconnected.add(handler)
  return () => void reconnected.delete(handler)
}

export function send(message: ClientMessage, id?: string): boolean {
  if (socket?.readyState !== WebSocket.OPEN) return false
  socket.send(JSON.stringify(id ? { ...message, id } : message))
  return true
}

export function connect(name: string): Promise<void> {
  if (socket?.readyState === WebSocket.OPEN && connectionStatus.value === 'ready') return Promise.resolve()
  const waiting = new Promise<void>((resolve, reject) => waiters.push({ resolve, reject }))
  if (!socket && !retryTimer) open(name)
  return waiting
}

export function disconnect(): void {
  closing = true
  everWelcomed = false
  attempt = 0
  stopTimers()
  socket?.close()
  socket = null
  resetClock()
  connectionStatus.value = 'offline'
  settleWaiters(new Error('disconnected'))
}

function settleWaiters(reason: Error | null): void {
  const held = waiters
  waiters = []
  for (const waiter of held) {
    if (reason) waiter.reject(reason)
    else waiter.resolve()
  }
}

function open(name: string): void {
  closing = false
  connectionStatus.value = everWelcomed ? 'reconnecting' : 'connecting'

  const next = new WebSocket(socketUrl)
  socket = next
  let helloSentAt = Date.now()

  const stopWaiting = on('welcome', (data) => {
    stopWaiting()
    adoptIdentity({ id: data.player_id, name: data.name, kind: data.account, avatar: data.avatar ?? '', resume: data.resume })
    recordSample(helloSentAt, data.server_time_ms, Date.now())
    connectionStatus.value = 'ready'
    attempt = 0
    startSync()
    if (everWelcomed) reconnected.forEach((handler) => handler())
    everWelcomed = true
    settleWaiters(null)
  })

  next.addEventListener('open', () => {
    helloSentAt = Date.now()
    sayHello(name)
  })
  next.addEventListener('message', (event: MessageEvent<string>) => dispatch(event.data))
  next.addEventListener('close', () => {
    stopWaiting()
    stopTimers()
    if (socket === next) socket = null
    if (closing) return
    if (everWelcomed) scheduleRetry(name)
    else {
      connectionStatus.value = 'offline'
      settleWaiters(new Error('could not reach the server'))
    }
  })
}

function sayHello(name: string): void {
  const colour = playerColour.value
  const token = resumeToken.value
  send({ type: 'hello', data: token ? { name, colour, resume: token } : { name, colour } })
}

function scheduleRetry(name: string): void {
  connectionStatus.value = 'reconnecting'
  const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] ?? 8000
  attempt += 1
  retryTimer = setTimeout(() => {
    retryTimer = null
    open(name)
  }, wait)
}

function dispatch(raw: string): void {
  const envelope = parse(raw)
  if (!envelope) return
  if (envelope.type === 'pong') {
    const data = envelope.data as { client_time_ms: number; server_time_ms: number }
    recordSample(data.client_time_ms, data.server_time_ms, Date.now())
    return
  }
  const bucket = listeners.get(envelope.type)
  if (!bucket) return
  for (const handler of [...bucket]) {
    ;(handler as (data: unknown, id?: string) => void)(envelope.data, envelope.id)
  }
}

function parse(raw: string): { type: ServerMessageType; id?: string; data?: unknown } | null {
  try {
    return JSON.parse(raw) as { type: ServerMessageType; id?: string; data?: unknown }
  } catch {
    return null
  }
}

function startSync(): void {
  for (let index = 0; index < SYNC_BURST; index += 1) {
    setTimeout(ping, index * SYNC_BURST_GAP_MS)
  }
  syncTimer = setInterval(ping, SYNC_INTERVAL_MS)
}

function ping(): void {
  send({ type: 'ping', data: { client_time_ms: Date.now() } })
}

function stopTimers(): void {
  if (syncTimer) clearInterval(syncTimer)
  if (retryTimer) clearTimeout(retryTimer)
  syncTimer = null
  retryTimer = null
}

export function sendProfile(name: string, colour: string): void {
  send({ type: 'profile', data: { name, colour } })
}
