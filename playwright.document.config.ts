import { defineConfig, devices } from '@playwright/test'

// Serve the production build through Playwright interception; no local server required.
process.env.DOCUMENT_EDITOR_STATIC_PREVIEW = '1'
export default defineConfig({
  testDir: './e2e',
  testMatch: 'runner-document-editor.spec.ts',
  reporter: 'list',
  timeout: 20000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  use: { baseURL: 'http://runner-document.test' },
})
