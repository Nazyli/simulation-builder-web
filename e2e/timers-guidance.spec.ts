import { expect, test } from '@playwright/test'

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`timers participant columns and guide work on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.route('**/admin/timers?*', (route) =>
      route.fulfill({
        json: {
          status: 'success',
          info: { code: 200, message: 'OK' },
          data: {
            content: [
              {
                participantTimerId: 'timer-record-1',
                nodeExecutionId: 'node-execution-1',
                participantId: 'participant-001',
                participantFullName: 'Anisa Putri',
                groupSimulationName: 'Hidden group name',
                masterSimulation: 'Budget Simulation',
                status: 'scheduled',
                canReschedule: true,
                dueAt: '2030-10-06T10:10:00Z',
                createdDate: '2030-10-06T10:00:00Z',
                cancelledAt: null,
                attemptCount: 0,
                maxAttempts: 3,
                retryDelaySeconds: 30,
                nodeName: 'Wait for reply',
                nodeType: 'wait_for_reply',
                lastError: null,
              },
            ],
            totalElements: 1,
            totalPages: 1,
            number: 0,
            size: 10,
            first: true,
            last: true,
          },
        },
      }),
    )
    await page.goto('/timers')
    await expect(page.getByRole('cell', { name: 'Anisa Putri', exact: true })).toBeVisible()
    const headings = (await page.getByRole('columnheader').allTextContents()).map((label) =>
      label.replace(/[↑↓]/g, '').trim(),
    )
    expect(headings).toEqual([
      'ID',
      'Name',
      'Status',
      'Countdown',
      'Due at',
      'Created at',
      'Timeout',
      'Cancel at',
      'Retries',
      'Retry delay',
      'Node',
      'Simulation',
      'Actions',
    ])
    await expect(page.getByRole('cell', { name: 'participant-001', exact: true })).toBeVisible()
    await expect(page.getByText('Hidden group name')).toHaveCount(0)
    const guide = page.getByRole('button', { name: 'Panduan', exact: true })
    const filterBox = await page.getByRole('textbox', { name: 'Filter rows' }).boundingBox()
    const guideBox = await guide.boundingBox()
    expect(guideBox!.x).toBeGreaterThan(filterBox!.x)
    expect(Math.abs(guideBox!.y - filterBox!.y)).toBeLessThan(4)
    await guide.click()
    const dialog = page.getByRole('dialog', { name: 'Panduan timer' })
    await expect(dialog).toBeVisible()
    for (const status of ['scheduled', 'running', 'retry', 'completed', 'failed', 'cancelled']) {
      await expect(dialog.getByText(status, { exact: true })).toBeVisible()
    }
    for (const label of ['Due at', 'Created at', 'Timeout', 'Cancel at']) {
      await expect(dialog.getByText(label, { exact: true })).toHaveCount(1)
    }
    await expect(dialog.getByText(/tidak selalu sama dengan timeout awal/)).toHaveCount(1)
    const bounds = await dialog.boundingBox()
    expect(bounds!.width).toBeLessThanOrEqual(viewport.width)
    expect(bounds!.height).toBeLessThanOrEqual(viewport.height)
    await page.screenshot({ path: `../outputs/timers-guide-${viewport.name}.png` })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(guide).toBeFocused()
  })
}

for (const example of [
  { status: 'cancelled', canReschedule: true, available: false },
  { status: 'scheduled', canReschedule: false, available: false },
  { status: 'scheduled', canReschedule: true, available: true },
]) {
  test(`reschedule visibility: ${example.status}, eligible=${example.canReschedule}`, async ({
    page,
  }) => {
    await page.route('**/admin/timers?*', (route) =>
      route.fulfill({
        json: {
          status: 'success',
          info: { code: 200, message: 'OK' },
          data: {
            content: [
              {
                participantTimerId: 'timer-1',
                nodeExecutionId: 'owner-1',
                participantId: 'participant-1',
                participantFullName: 'Participant',
                status: example.status,
                canReschedule: example.canReschedule,
                dueAt: '2030-10-06T10:10:00Z',
                createdDate: '2030-10-06T10:00:00Z',
                cancelledAt: null,
                attemptCount: 0,
                maxAttempts: 3,
                retryDelaySeconds: 30,
              },
            ],
            totalElements: 1,
            totalPages: 1,
          },
        },
      }),
    )
    await page.goto('/timers')
    await expect(page.getByRole('button', { name: 'Details', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reschedule', exact: true })).toHaveCount(
      example.available ? 1 : 0,
    )
  })
}
