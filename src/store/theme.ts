import { ref } from 'vue'

export type ThemeChoice = 'system' | 'light' | 'dark'

const THEME_KEY = 'trackdown.theme'

export const theme = ref<ThemeChoice>(readTheme())

function readTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function setTheme(next: ThemeChoice): void {
  theme.value = next
  if (next === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = next
  try {
    if (next === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, next)
  } catch {
    return
  }
}
