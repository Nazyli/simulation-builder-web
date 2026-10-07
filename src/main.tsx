import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProviders } from './app/providers/app-providers'
import { applyTheme, browserThemeStorage, readTheme } from './shared/theme/theme'
import { ThemeProvider } from './shared/theme/theme-provider'

const initialTheme = readTheme(browserThemeStorage())
applyTheme(document.documentElement.style, initialTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider initialColors={initialTheme}>
      <AppProviders>
        <App />
      </AppProviders>
    </ThemeProvider>
  </StrictMode>,
)
