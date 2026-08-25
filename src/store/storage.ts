export function readStored(store: Storage, key: string): string {
  try {
    return store.getItem(key) ?? ''
  } catch {
    return ''
  }
}

export function writeStored(store: Storage, key: string, value: string): void {
  try {
    if (value) store.setItem(key, value)
    else store.removeItem(key)
  } catch {
    return
  }
}
