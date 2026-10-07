import { createContext, useContext } from 'react'
import type { ThemeColors } from './theme'

export interface ThemeContextValue {
  colors: ThemeColors
  setColors: (colors: ThemeColors) => void
  reset: () => void
  persisted: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme requires ThemeProvider')
  return context
}
