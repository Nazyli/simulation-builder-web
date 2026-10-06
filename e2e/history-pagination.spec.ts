import { expect, test } from '@playwright/test'

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`history pagination and search work on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const requests: URL[] = []
    let total = 13
    await page.route('**/admin/history/executions?*', async (route) => {
      const url = new URL(route.request().url())
      requests.push(url)
      const number = Number(url.searchParams.get('page'))
      const size = Number(url.searchParams.get('size'))
      const search = url.searchParams.get('search') ?? ''
      const count = search === 'missing' ? 0 : total
      const content = Array.from(
        { length: Math.max(0, Math.min(size, count - number * size)) },
        (_, index) => ({
          executionId: `execution-${number * size + index}`,
          sessionId: `session-${index}-full-id`,
          participantId: `participant-${number * size + index}`,
          participantFullName: 'Anisa Putri',
          groupSimulationName: 'Budget Simulation',
          simulationName: 'Bottleneck V1',
          status: 'waiting',
          startedAt: '2026-10-06T10:00:00Z',
          createdAt: '2026-10-06T10:00:00Z',
          completedAt: null,
        }),
      )
      await route.fulfill({
        json: {
          status: 'success',
          data: {
            content,
            number,
            size,
            totalElements: count,
            totalPages: Math.ceil(count / size),
          },
        },
      })
    })
    await page.route('**/web/executions/*', (route) => {
      total = 10
      return route.fulfill({ json: { status: 'success', data: null } })
    })
    await page.goto('/history')
    await expect(page.getByText('13 records', { exact: true })).toBeVisible()
    expect(
      (await page.getByRole('columnheader').allTextContents()).map((label) =>
        label.replace(/[↑↓]/g, '').trim(),
      ),
    ).toEqual([
      'ID',
      'Name',
      'Status',
      'Session',
      'Simulation',
      'Started at',
      'Completed at',
      'Actions',
    ])
    await expect(page.getByRole('cell', { name: 'Bottleneck V1', exact: true })).toHaveCount(10)
    await expect(page.getByRole('cell', { name: 'Budget Simulation', exact: true })).toHaveCount(0)
    const sessionCell = page.getByRole('cell', { name: 'session-', exact: true }).first()
    await expect(sessionCell.locator('[title="session-0-full-id"]')).toBeAttached()
    await page.screenshot({
      path: `../outputs/history-pagination-${viewport.name}.png`,
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByText('Page 2 / 2', { exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'participant-12', exact: true })).toBeAttached()
    // Deleting from the last page recovers to the last valid page.
    await page.getByRole('button', { name: 'Delete execution execution-12', exact: true }).click()
    await page.getByRole('button', { name: 'Delete log', exact: true }).click()
    await expect(page.getByText('Page 1 / 1', { exact: true })).toBeVisible()
    await expect(page.getByText('10 records', { exact: true })).toBeVisible()
    await page.getByRole('textbox', { name: 'Filter rows' }).fill('missing')
    await expect(page.getByText('No matching records.', { exact: true })).toBeVisible()
    await expect(page.getByText('0 records', { exact: true })).toBeVisible()
    await page.getByRole('textbox', { name: 'Filter rows' }).clear()
    await expect(page.getByText('10 records', { exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('20')
    await expect.poll(() => requests.at(-1)?.searchParams.get('size')).toBe('20')
    await page.getByRole('button', { name: 'Sort by Name', exact: true }).click()
    await expect
      .poll(() => requests.at(-1)?.searchParams.get('sort'))
      .toBe('participantFullName,asc')
    const bounds = await page.getByRole('textbox', { name: 'Filter rows' }).boundingBox()
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
  })
}
