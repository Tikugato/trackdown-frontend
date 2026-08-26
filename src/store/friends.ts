import { computed, reactive, ref } from 'vue'
import { loadFriends, removeFriend, requestFriend, saveFriendsCanJoin } from '@/net/http'
import * as socket from '@/net/socket'
import type { Friend, Person, Relation } from '@/net/protocol'
import { accountKind, friendsCanJoin } from './session'

export const RELATIONS: Record<Relation, string> = {
  none: 'Add friend',
  friend: 'Friends',
  incoming: 'Accept',
  outgoing: 'Requested',
}

export type Invite = { key: number; playerId: string; name: string; code: string }

export const friends = reactive(new Map<string, Friend>())
export const incoming = ref<Person[]>([])
export const outgoing = ref<Person[]>([])
export const invites = ref<Invite[]>([])
export const loaded = ref(false)

export const online = computed(() => [...friends.values()].filter((friend) => friend.online))
export const roster = computed(() => [...friends.values()].sort(byPresence))

function seenAt(friend: Friend): number {
  return friend.last_seen ? Date.parse(friend.last_seen) : 0
}

function byPresence(a: Friend, b: Friend): number {
  if (a.online !== b.online) return a.online ? -1 : 1
  if (!a.online) return seenAt(b) - seenAt(a)
  return a.name.localeCompare(b.name)
}

let inviteKey = 0

function forget(): void {
  friends.clear()
  incoming.value = []
  outgoing.value = []
  invites.value = []
  loaded.value = false
}

export async function refreshFriends(): Promise<void> {
  if (accountKind.value !== 'discord') {
    forget()
    return
  }
  const page = await loadFriends()
  friends.clear()
  for (const friend of page.friends) friends.set(friend.player_id, friend)
  incoming.value = page.incoming
  outgoing.value = page.outgoing
  friendsCanJoin.value = page.friends_can_join
  loaded.value = true
}

export async function befriend(playerId: string): Promise<Relation> {
  const relation = await requestFriend(playerId)
  await refreshFriends()
  return relation
}

export async function unfriend(playerId: string): Promise<void> {
  await removeFriend(playerId)
  await refreshFriends()
}

export async function setFriendsCanJoin(allowed: boolean): Promise<void> {
  await saveFriendsCanJoin(allowed)
  friendsCanJoin.value = allowed
}

export function invite(playerId: string): void {
  socket.send({ type: 'invite', data: { player_id: playerId } })
}

export function dismissInvite(key: number): void {
  invites.value = invites.value.filter((held) => held.key !== key)
}

socket.onReconnected(() => void refreshFriends().catch(() => undefined))

socket.on('friend_presence', (data) => {
  const friend = friends.get(data.player_id)
  if (!friend) return
  friend.online = data.online
  friend.code = data.code ?? ''
  if (!data.online) friend.last_seen = new Date().toISOString()
})

socket.on('invited', (data) => {
  inviteKey += 1
  invites.value = [
    ...invites.value.filter((held) => held.playerId !== data.player_id),
    { key: inviteKey, playerId: data.player_id, name: data.name, code: data.code },
  ]
})
