import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { closedReason, code, connect, joinLobby } from '@/store/game'
import { forgetLobby, lobbyCode, playerName } from '@/store/session'

export async function enterLobby(target: string): Promise<string> {
  if (code.value === target) return ''
  try {
    await connect()
    await joinLobby(target)
    return ''
  } catch (reason) {
    if (lobbyCode.value === target) forgetLobby()
    return reason instanceof Error ? reason.message : 'Could not reach that lobby.'
  }
}

export function useLobbyEntry(target: string) {
  const router = useRouter()
  const joining = ref(code.value !== target)
  const failure = ref('')

  watch(closedReason, (reason) => {
    if (reason) void router.replace(`/?closed=${encodeURIComponent(reason)}`)
  })

  onMounted(async () => {
    if (!playerName.value) {
      await router.replace(`/?join=${target}`)
      return
    }
    failure.value = await enterLobby(target)
    joining.value = false
  })

  return { joining, failure }
}
