import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useTicker(steppedEveryMs: number) {
  const now = ref(Date.now())
  const stepped = matchMedia('(prefers-reduced-motion: reduce)').matches

  let frame = 0
  let ticker: ReturnType<typeof setInterval> | null = null

  function measure(): void {
    now.value = Date.now()
  }

  function loop(): void {
    measure()
    frame = requestAnimationFrame(loop)
  }

  onMounted(() => {
    measure()
    if (stepped) ticker = setInterval(measure, steppedEveryMs)
    else frame = requestAnimationFrame(loop)
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    if (ticker) clearInterval(ticker)
  })

  return { now, measure }
}
