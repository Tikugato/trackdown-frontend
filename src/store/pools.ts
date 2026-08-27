import { shallowRef } from 'vue'
import { loadPools } from '@/net/http'
import type { Pool } from '@/net/protocol'

export const pools = shallowRef<Pool[]>([])
export const poolsReady = shallowRef(false)

let request: Promise<void> | null = null

export function ensurePools(): Promise<void> {
  request ??= loadPools()
    .then((list) => {
      pools.value = list
    })
    .catch((reason: unknown) => {
      request = null
      throw reason
    })
    .finally(() => {
      poolsReady.value = true
    })
  return request
}

export function poolSlug(id: string): string {
  return pools.value.find((pool) => pool.id === id)?.slug ?? ''
}

export function poolIdOf(slug: string): string {
  return pools.value.find((pool) => pool.slug === slug)?.id ?? ''
}
