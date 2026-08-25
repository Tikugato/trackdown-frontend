import { ref } from 'vue'
import { randomColour } from '@/game/palette'
import { avatarUrl, loadAccount, logOut } from '@/net/http'
import type { AccountKind } from '@/net/protocol'
import { readStored, writeStored } from './storage'

const NAME_KEY = 'trackdown.name'
const RESUME_KEY = 'trackdown.resume'
const CODE_KEY = 'trackdown.code'
const COLOUR_KEY = 'trackdown.colour'

export type Identity = {
  id?: string
  name?: string
  kind: AccountKind
  avatar?: string
  resume?: string
  friendsCanJoin?: boolean
}

export const playerName = ref(readStored(localStorage, NAME_KEY))
export const playerId = ref('')
export const resumeToken = ref(readStored(localStorage, RESUME_KEY))
export const lobbyCode = ref(readStored(sessionStorage, CODE_KEY))
export const accountKind = ref<AccountKind>('guest')
export const playerAvatar = ref('')
export const friendsCanJoin = ref(false)
export const playerColour = ref(settleColour())

function settleColour(): string {
  const stored = readStored(localStorage, COLOUR_KEY)
  if (stored) return stored
  const picked = randomColour()
  writeStored(localStorage, COLOUR_KEY, picked)
  return picked
}

export function pickColour(colour: string): void {
  playerColour.value = colour
  writeStored(localStorage, COLOUR_KEY, colour)
}

export function rename(name: string): void {
  playerName.value = name
  writeStored(localStorage, NAME_KEY, name)
}

export function signIn(name: string): void {
  rename(name)
  accountKind.value = 'guest'
}

export function adoptIdentity(identity: Identity): void {
  accountKind.value = identity.kind
  playerAvatar.value = avatarUrl(identity.avatar)
  if (identity.friendsCanJoin !== undefined) friendsCanJoin.value = identity.friendsCanJoin
  if (identity.id) playerId.value = identity.id
  if (identity.resume !== undefined) {
    resumeToken.value = identity.resume
    writeStored(localStorage, RESUME_KEY, identity.resume)
  }
  if (identity.name) {
    playerName.value = identity.name
    writeStored(localStorage, NAME_KEY, identity.name)
  }
}

export async function refreshAccount(): Promise<void> {
  try {
    const account = await loadAccount()
    adoptIdentity({
      kind: account.kind,
      id: account.player_id ?? '',
      name: account.name ?? '',
      avatar: account.avatar ?? '',
      friendsCanJoin: account.friends_can_join ?? false,
    })
  } catch {
    return
  }
}

async function revokeSession(): Promise<void> {
  try {
    await logOut()
  } catch {
    return
  }
}

export async function signOut(): Promise<void> {
  if (accountKind.value === 'discord') await revokeSession()
  accountKind.value = 'guest'
  playerAvatar.value = ''
  friendsCanJoin.value = false
  playerName.value = ''
  playerId.value = ''
  resumeToken.value = ''
  writeStored(localStorage, NAME_KEY, '')
  writeStored(localStorage, RESUME_KEY, '')
}

export function rememberLobby(code: string): void {
  lobbyCode.value = code
  writeStored(sessionStorage, CODE_KEY, code)
}

export function forgetLobby(): void {
  lobbyCode.value = ''
  writeStored(sessionStorage, CODE_KEY, '')
}
