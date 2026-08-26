import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { countSongs } from '@/net/http'
import type { PoolFilter, Settings } from '@/net/protocol'

const COUNT_DELAY_MS = 300

export function useMatchCounts(settings: Ref<Settings>): Ref<Record<string, number>> {
  const counts = ref<Record<string, number>>({})
  let pending: ReturnType<typeof setTimeout> | undefined
  let inFlight: AbortController | null = null

  async function refresh(pools: string[], filters: Record<string, PoolFilter>): Promise<void> {
    inFlight?.abort()
    inFlight = new AbortController()
    try {
      counts.value = await countSongs(pools, filters, inFlight.signal)
    } catch {
      return
    }
  }

  watch(
    () => JSON.stringify([settings.value.pools, settings.value.filters ?? {}]),
    () => {
      clearTimeout(pending)
      const filters = settings.value.filters ?? {}
      const filtered = settings.value.pools.filter((id) => id in filters)
      if (!filtered.length) {
        inFlight?.abort()
        counts.value = {}
        return
      }
      pending = setTimeout(() => void refresh(filtered, filters), COUNT_DELAY_MS)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    clearTimeout(pending)
    inFlight?.abort()
  })

  return counts
}
