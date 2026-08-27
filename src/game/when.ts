const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1000],
]

const SMALLEST = STEPS[STEPS.length - 1] as [Intl.RelativeTimeFormatUnit, number]
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function ago(stamp: string | undefined): string {
  const at = stamp ? Date.parse(stamp) : Number.NaN
  if (Number.isNaN(at)) return ''
  const gap = Date.now() - at
  const [unit, span] = STEPS.find(([, size]) => gap >= size) ?? SMALLEST
  return relative.format(-Math.floor(gap / span), unit)
}
