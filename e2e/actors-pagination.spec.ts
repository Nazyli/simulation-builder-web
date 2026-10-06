import { expect, test } from '@playwright/test'

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`actors paging and dialogs work on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const requests: URL[] = []
    await page.route('**/admin/master-data/actors?*', (route) => {
      const url = new URL(route.request().url())
      requests.push(url)
      const number = Number(url.searchParams.get('page'))
      const size = Number(url.searchParams.get('size'))
      const total = url.searchParams.get('search') === 'missing' ? 0 : 13
      const content = Array.from(
        { length: Math.max(0, Math.min(size, total - number * size)) },
        (_, index) => {
          const id = number * size + index
          return {
            actorId: `actor-${id}`,
            actorName: `Actor ${id}`,
            actorEmail: `actor-${id}@example.test`,
            actorPosition: 'Manager',
            actorGroupPosition: null,
            isParticipant: id === 0,
            personaDesc: id === 0 ? '# Calm\n- Clear communication' : null,
          }
        },
      )
      return route.fulfill({
        json: {
          status: 'success',
          data: {
            content,
            number,
            size,
            totalElements: total,
            totalPages: Math.ceil(total / size),
            last: number >= Math.ceil(total / size) - 1,
          },
        },
      })
    })
    await page.goto('/master-data/actors')
    await expect(page.getByText('13 records', { exact: true })).toBeVisible()
    expect(
      (await page.getByRole('columnheader').allTextContents()).map((text) =>
        text.replace(/[↑↓]/g, '').trim(),
      ),
    ).toEqual(['ID', 'Name', 'Email', 'Position', 'Participant', 'Personality', 'Actions'])
    await page.screenshot({
      path: `../outputs/actors-pagination-${viewport.name}.png`,
      fullPage: true,
    })
    await page.getByRole('button', { name: 'View personality for Actor 0', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Calm', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByText('Page 2 / 2', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Edit Actor 12', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByLabel('Actor ID', { exact: true })).toHaveValue('actor-12')
    await page.keyboard.press('Escape')
    await page.getByRole('textbox', { name: 'Filter rows' }).fill('missing')
    await expect(page.getByText('No matching records.', { exact: true })).toBeVisible()
    await expect(page.getByText('0 records', { exact: true })).toBeVisible()
    await page.getByRole('textbox', { name: 'Filter rows' }).clear()
    await expect(page.getByText('13 records', { exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('20')
    await expect.poll(() => requests.at(-1)?.searchParams.get('size')).toBe('20')
    await page.getByRole('button', { name: 'Sort by Email', exact: true }).click()
    await expect.poll(() => requests.at(-1)?.searchParams.get('sort')).toBe('actorEmail,asc')
    await page.getByRole('button', { name: 'Add actor', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Add actor', exact: true })).toBeVisible()
    await expect(page.getByLabel('Actor ID', { exact: true })).toHaveValue('')
  })
}
