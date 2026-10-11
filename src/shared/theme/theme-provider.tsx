import { useLayoutEffect, useState, type PropsWithChildren } from 'react'
import {
  applyTheme,
  browserThemeStorage,
  DEFAULT_THEME,
  normalizeTheme,
  saveTheme,
  type ThemeBaseColors,
  type ThemeColors,
} from './theme'
import { ThemeContext } from './use-theme'

export function ThemeProvider({
  children,
  initialColors,
}: PropsWithChildren<{ initialColors: ThemeColors }>) {
  const [colors, updateColors] = useState(initialColors)
  const [persisted, setPersisted] = useState(true)

  useLayoutEffect(() => {
    applyTheme(document.documentElement.style, colors)
    setPersisted(saveTheme(browserThemeStorage(), colors))
  }, [colors])

  function setColors(next: ThemeBaseColors) {
    const normalized = normalizeTheme(next)
    if (normalized) updateColors(normalized)
  }

  return (
    <ThemeContext.Provider
      value={{ colors, setColors, reset: () => setColors({ ...DEFAULT_THEME }), persisted }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
