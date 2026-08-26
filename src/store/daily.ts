import { ref, shallowRef } from 'vue'
import * as socket from '@/net/socket'
import type { ClientMessage, DailyState, HintKind, Verdict } from '@/net/protocol'
import { connect } from './game'

const ANSWER_TIMEOUT_MS = 8000
const ID_PREFIX = 'daily-'

export type DailyVerdict = { verdict: Verdict; at: number }

export const state = shallowRef<DailyState | null>(null)
export const verdict = shallowRef<DailyVerdict | null>(null)
export const failure = ref('')
export const busy = ref(false)

let poolId = ''
let commandId = 0
let answerTimer: ReturnType<typeof setTimeout> | null = null

function send(message: ClientMessage): void {
  commandId += 1
  busy.value = true
  failure.value = ''
  socket.send(message, `${ID_PREFIX}${commandId}`)
  if (answerTimer) clearTimeout(answerTimer)
  answerTimer = setTimeout(() => (busy.value = false), ANSWER_TIMEOUT_MS)
}

function settle(): void {
  busy.value = false
  if (answerTimer) clearTimeout(answerTimer)
  answerTimer = null
}

export async function openDaily(pool: string): Promise<void> {
  poolId = pool
  state.value = null
  verdict.value = null
  await connect()
  send({ type: 'daily', data: { pool } })
}

export function closeDaily(): void {
  poolId = ''
  state.value = null
  verdict.value = null
  settle()
}

export function guessDaily(text: string): void {
  if (!poolId || busy.value || state.value?.done) return
  send({ type: 'daily_guess', data: { pool: poolId, text } })
}

export function skipDaily(): void {
  if (!poolId || busy.value || state.value?.done) return
  send({ type: 'daily_skip', data: { pool: poolId } })
}

export function askDailyHint(kind: HintKind): void {
  if (!poolId || busy.value || state.value?.done) return
  send({ type: 'daily_hint', data: { pool: poolId, kind } })
}

socket.on('daily_state', (data) => {
  if (data.pool_id !== poolId) return
  settle()
  state.value = data
  if (data.verdict) verdict.value = { verdict: data.verdict, at: Date.now() }
})

socket.on('error', (data, id) => {
  if (!id?.startsWith(ID_PREFIX)) return
  settle()
  failure.value = data.message
})

socket.onReconnected(() => {
  if (poolId) send({ type: 'daily', data: { pool: poolId } })
})
