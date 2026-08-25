import type { Settings } from '@/net/protocol'
import { DEFAULT_SETTINGS } from './game'
import { readStored, writeStored } from './storage'

const RULES_KEY = 'trackdown.rules'

export function rememberRules(rules: Settings): void {
  writeStored(localStorage, RULES_KEY, JSON.stringify(rules))
}

export function rememberedRules(): Settings {
  const stored = readStored(localStorage, RULES_KEY)
  if (!stored) return { ...DEFAULT_SETTINGS }
  try {
    return merge(JSON.parse(stored) as Partial<Settings>)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function merge(stored: Partial<Settings>): Settings {
  const settled = { ...DEFAULT_SETTINGS }
  for (const key of Object.keys(settled) as (keyof Settings)[]) {
    if (sameShape(stored[key], settled[key])) {
      Object.assign(settled, { [key]: stored[key] })
    }
  }
  return settled
}

function sameShape(value: unknown, against: unknown): boolean {
  if (Array.isArray(against)) {
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  }
  return typeof value === typeof against
}
