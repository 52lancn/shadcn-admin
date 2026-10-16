import { useLayoutEffect } from 'react'
import { storage } from '@/lib/http'

export type ThemeMode = 'light' | 'dark'
export type ColorToken = 'zinc' | 'blue' | 'green' | 'emerald' | 'violet' | 'rose' | 'amber'
/** 侧边栏背景色调：default 跟随主题（浅色模式白底、深色模式深底） */
export type SidebarTone = 'default' | 'white' | 'gray' | 'graphite' | 'ink'

export const themeColors: { id: ColorToken; label: string; swatch: string }[] = [
  { id: 'zinc', label: 'Zinc', swatch: 'hsl(240 5% 18%)' },
  { id: 'blue', label: 'Blue', swatch: 'hsl(221 83% 53%)' },
  { id: 'green', label: 'Green', swatch: 'hsl(142 71% 45%)' },
  { id: 'emerald', label: 'Emerald 翡翠绿', swatch: 'hsl(160 85% 36%)' },
  { id: 'violet', label: 'Violet', swatch: 'hsl(262 83% 58%)' },
  { id: 'rose', label: 'Rose', swatch: 'hsl(347 77% 50%)' },
  { id: 'amber', label: 'Amber', swatch: 'hsl(32 95% 44%)' },
]

export const sidebarTones: { id: SidebarTone; label: string; swatch: string }[] = [
  {
    id: 'default',
    label: '跟随主题',
    swatch: 'linear-gradient(135deg, hsl(0 0% 100%) 50%, hsl(240 10% 8%) 50%)',
  },
  { id: 'white', label: '纯白', swatch: 'hsl(0 0% 100%)' },
  { id: 'gray', label: '浅灰', swatch: 'hsl(210 20% 96%)' },
  { id: 'graphite', label: '深灰', swatch: 'hsl(220 8% 18%)' },
  { id: 'ink', label: '墨黑', swatch: 'hsl(216 10% 10%)' },
]

export function applyTheme() {
  const root = document.documentElement
  const mode = storage.getTheme()
  const color = storage.getColor() as ColorToken
  const sidebar = storage.getSidebar()
  Array.from(root.classList).forEach((c) => {
    if (c.startsWith('theme-') || c.startsWith('sidebar-')) root.classList.remove(c)
  })
  if (mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  if (color !== 'zinc') root.classList.add(`theme-${color}`)
  if (sidebar !== 'default') root.classList.add(`sidebar-${sidebar}`)
}

export function setTheme(mode: ThemeMode) {
  storage.setTheme(mode)
  applyTheme()
}

export function setColor(color: ColorToken) {
  storage.setColor(color)
  applyTheme()
}

export function setSidebar(tone: SidebarTone) {
  storage.setSidebar(tone)
  applyTheme()
}

/** Initialise once at boot. */
export function useThemeBootstrap() {
  useLayoutEffect(() => {
    applyTheme()
  }, [])
}
