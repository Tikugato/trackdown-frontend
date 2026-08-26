import type { Mode } from '@/net/protocol'

export type Choice<T> = { value: T; label: string }

export const MODES: (Choice<Mode> & { blurb: string })[] = [
  {
    value: 'bolt',
    label: 'Bolt',
    blurb: 'One point for the first right answer, and the round ends there. First to the target wins.',
  },
  {
    value: 'race',
    label: 'Continuous',
    blurb: 'The round runs on until everyone lands it. Faster is worth more and first in keeps the most.',
  },
]

export const CLIP_LENGTHS: Choice<number>[] = [
  { value: 3000, label: '3s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
]

export const GUESS_TIMES: Choice<number>[] = [
  { value: 15000, label: '15s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '60s' },
]

export const TARGETS: Choice<number>[] = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
]

export const ROUND_COUNTS: Choice<number>[] = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
]

export const BREATHERS: Choice<number>[] = [
  { value: 3000, label: '3s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
]

export type Flag = 'hints_enabled' | 'mask_enabled' | 'allow_replay' | 'allow_suggestions'

export const FLAGS: { key: Flag; label: string }[] = [
  { key: 'hints_enabled', label: 'Global hints' },
  { key: 'mask_enabled', label: 'Show word amount for title' },
  { key: 'allow_replay', label: 'Replay clip' },
  { key: 'allow_suggestions', label: 'Suggest titles while typing' },
]
