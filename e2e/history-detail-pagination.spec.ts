import { expect, test } from '@playwright/test'

test('history detail requests the exact execution beyond the first page', async ({ page }) => {
  let requested: URL | undefined
  await page.route('**/admin/history/executions?*', (route) => {
    requested = new URL(route.request().url())
    return route.fulfill({
      json: {
        status: 'success',
        data: {
          content: [
            {
              executionId: 'execution-42',
              participantId: 'participant-42',
              sessionId: 'session-42',
              groupSimulationName: 'Budget Simulation',
              simulationName: 'Version 42',
              status: 'completed',
              startedAt: '2026-10-06T10:00:00Z',
              completedAt: '2026-10-06T11:00:00Z',
              createdAt: '2026-10-06T10:00:00Z',
              unreadCounts: { chat: 0 },
            },
          ],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 1,
        },
      },
    })
  })
  await page.route('**/web/executions/*/node-executions', (route) =>
    route.fulfill({ json: { status: 'success', data: [] } }),
  )
  await page.goto('/history/execution-42')
  await expect(page.getByRole('heading', { name: /Budget Simulation.*Version 42/ })).toBeVisible()
  expect(requested?.searchParams.get('executionId')).toBe('execution-42')
  expect(requested?.searchParams.get('size')).toBe('1')
})
