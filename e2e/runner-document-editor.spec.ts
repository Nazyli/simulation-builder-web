import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

async function mockDocuments(
  page: Page,
  initialContent = '<p>Original notes</p>',
  secondPage?: string,
) {
  if (process.env.DOCUMENT_EDITOR_STATIC_PREVIEW === '1') {
    await page.route('http://runner-document.test/**', (route) => {
      const path = new URL(route.request().url()).pathname
      const asset = path.startsWith('/assets/') ? `assets/${basename(path)}` : 'index.html'
      const contentType = asset.endsWith('.js')
        ? 'text/javascript'
        : asset.endsWith('.css')
          ? 'text/css'
          : asset.endsWith('.woff2')
            ? 'font/woff2'
            : 'text/html'
      return route.fulfill({
        body: readFileSync(new URL(`../dist/${asset}`, import.meta.url)),
        contentType,
      })
    })
  }
  let record = {
    participantDocId: 'doc-one',
    participantId: 'test',
    sessionId: 'session',
    executionId: null,
    participantFolderId: null,
    documentName: 'Project notes',
    documentId: null,
    isHighlight: false,
    isRead: false,
    owner: 'participant',
    openedAt: null,
    counter: 0,
    createdBy: 'test',
    createdDate: '2026-10-09T02:00:00Z',
    modifiedDate: null as string | null,
    contents: [
      {
        participantDocContentId: 'page-one',
        participantDocId: 'doc-one',
        page: 1,
        content: initialContent,
        contentMd: null,
        isHighlight: false,
      },
    ],
  }
  let failSave = false
  if (secondPage !== undefined)
    record.contents.push({
      ...record.contents[0],
      page: 2,
      content: secondPage,
      participantDocContentId: 'page-two',
    })
  const writes: { documentName: string; contents: { page: number; content: string }[] }[] = []
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path.startsWith('/api/v1/web/documents')) {
      if (['POST', 'PUT'].includes(route.request().method())) {
        const input = route.request().postDataJSON()
        writes.push(input)
        if (failSave) {
          await route.fulfill({
            status: 500,
            json: {
              status: 'error',
              info: { code: 500, message: 'Save failed. Try again.' },
              data: null,
            },
          })
          return
        }
        record = {
          ...record,
          documentName: input.documentName,
          contents: input.contents.map((content: { page: number; content: string }) => ({
            ...record.contents[0],
            ...content,
            participantDocContentId: `page-${content.page}`,
          })),
        }
        data = record
      } else data = [record]
    } else if (path.endsWith('/notifications/activity'))
      data = { activityChat: [], activityEmail: [] }
    await route.fulfill({ json: { status: 'success', info: { code: 200, message: 'ok' }, data } })
  })
  await page.goto('/simulation/test/document')
  return {
    writes,
    failNextSave: () => {
      failSave = true
    },
  }
}

test('keyboard formatting persists through save and reopening without dirtying on load', async ({
  page,
}) => {
  const { writes } = await mockDocuments(page)
  await page.getByRole('button', { name: /Project notes/ }).click()
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  const sheet = page.getByRole('textbox', { name: 'Document content', exact: true })
  await sheet.fill('Formatted notes')
  await sheet.press('ControlOrMeta+a')
  await page.getByRole('button', { name: 'Bold', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(sheet.locator('strong')).toHaveText('Formatted notes')
  await page.getByRole('button', { name: 'Align center', exact: true }).click()
  await page.getByRole('combobox', { name: 'Font family' }).selectOption('Georgia')
  await page.getByRole('combobox', { name: 'Font size' }).selectOption('18px')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  await expect(sheet.locator('strong')).toHaveText('Formatted notes')
  await expect(sheet.locator('p')).toHaveAttribute('data-text-align', 'center')
  await expect(sheet.locator('[data-font-family="Georgia"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  expect(writes[0].contents[0].content).toContain('data-font-size="18px"')
})

test('long paragraphs create pages automatically, deletion reflows, and undo restores them', async ({
  page,
}) => {
  const { writes } = await mockDocuments(page)
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('textbox', { name: 'Document name' }).fill('Continuous writing')
  const content = page.getByRole('textbox', { name: 'Document content', exact: true })
  const words =
    'A continuous paragraph keeps its text and formatting while flowing to the next page. '.repeat(
      120,
    )
  await content.fill(words)
  await expect(
    page
      .getByRole('navigation', { name: 'Document pages' })
      .getByRole('button', { name: 'Page 3', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Create document' }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].contents.length).toBeGreaterThanOrEqual(3)
  expect(writes[0].contents.map((item) => item.content.replace(/<[^>]+>/g, '')).join('')).toBe(
    words,
  )
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  await expect(content.locator('p')).toHaveCount(1)
  await expect(content).toContainText(words.trim())
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await expect(content).toContainText(words.trim())
  await content.press('ControlOrMeta+a')
  await page.keyboard.insertText('Short text')
  await expect(
    page
      .getByRole('navigation', { name: 'Document pages' })
      .getByRole('button', { name: 'Page 2', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(content).toContainText(words.trim())
  await expect(
    page
      .getByRole('navigation', { name: 'Document pages' })
      .getByRole('button', { name: 'Page 3', exact: true }),
  ).toBeVisible()
})

test('loading legacy HTML and changing the title retains all untouched page content', async ({
  page,
}) => {
  const { writes } = await mockDocuments(page, '<div>Legacy notes<br>Second line</div>')
  await page.getByRole('button', { name: /Project notes/ }).click()
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Document name' }).fill('Renamed notes')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].contents).toEqual([
    { page: 1, content: '<div>Legacy notes<br>Second line</div>' },
  ])
})

test('undoing a legacy content edit restores clean state and original page HTML', async ({
  page,
}) => {
  const original = '<div>Legacy notes<br>Second line</div>'
  const { writes } = await mockDocuments(page, original)
  await page.getByRole('button', { name: /Project notes/ }).click()
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  const content = page.getByRole('textbox', { name: 'Document content', exact: true })
  await content.click()
  await content.press('ControlOrMeta+End')
  await page.keyboard.insertText(' Temporary addition')
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(content).not.toContainText('Temporary addition')
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Document name' }).fill('Renamed notes')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].contents).toEqual([{ page: 1, content: original }])
})

test('saving immediately after a long paste includes the latest text and settled pages', async ({
  page,
}) => {
  const { writes } = await mockDocuments(page)
  await page.getByRole('button', { name: /Project notes/ }).click()
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  const content = page.getByRole('textbox', { name: 'Document content', exact: true })
  await content.click()
  await content.press('ControlOrMeta+a')
  const words = 'A newly pasted paragraph must be saved with all of its latest text. '.repeat(160)
  await page.keyboard.insertText(words)
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByRole('button', { name: 'Edit document', exact: true })).toBeVisible()
  expect(writes[0].contents.length).toBeGreaterThanOrEqual(3)
  expect(writes[0].contents.map((item) => item.content.replace(/<[^>]+>/g, '')).join('')).toBe(
    words,
  )
})

test('formatting undo and failed saves keep the continuous draft', async ({ page }) => {
  const { failNextSave } = await mockDocuments(page)
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('textbox', { name: 'Document name' }).fill('New notes')
  const first = page.getByRole('textbox', { name: 'Document content', exact: true })
  await first.fill('First page')
  await first.press('ControlOrMeta+a')
  await page.getByRole('button', { name: 'Bold', exact: true }).click()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(first.locator('strong')).toHaveCount(0)
  await expect(first).toHaveText('First page')
  failNextSave()
  await page.getByRole('button', { name: 'Create document' }).click()
  await expect(page.getByRole('alert')).toContainText('Save failed')
  await expect(first).toHaveText('First page')
})

test('link form rejects unsafe URLs and applies a safe link to the selected text', async ({
  page,
}) => {
  await mockDocuments(page)
  await page.getByRole('button', { name: 'New', exact: true }).click()
  const sheet = page.getByRole('textbox', { name: 'Document content', exact: true })
  await sheet.fill('Read more')
  await sheet.press('ControlOrMeta+a')
  await page.getByRole('button', { name: 'Insert link', exact: true }).click()
  await page.getByRole('textbox', { name: 'Link URL' }).fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Apply link', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('https://')
  await page.getByRole('textbox', { name: 'Link URL' }).fill('https://example.com')
  await page.getByRole('button', { name: 'Apply link', exact: true }).click()
  await expect(sheet.locator('a')).toHaveAttribute('href', 'https://example.com')
})

test('an empty table survives save and reopening', async ({ page }) => {
  const { writes } = await mockDocuments(page)
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('textbox', { name: 'Document name' }).fill('Blank planning table')
  await page.getByRole('button', { name: 'Insert table', exact: true }).click()
  await page.getByRole('button', { name: 'Create document' }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].contents[0].content).toContain('<table')
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Document content', exact: true }).locator('table'),
  ).toBeVisible()
})

test('page navigation focuses an existing unvisited page before formatting', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await mockDocuments(page, '<p>' + 'First notes. '.repeat(800) + '</p>')
  await page.getByRole('button', { name: /Project notes/ }).click()
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  await page
    .getByRole('navigation', { name: 'Document pages' })
    .getByRole('button', { name: 'Page 2', exact: true })
    .click()
  const second = page.getByRole('textbox', { name: 'Document content', exact: true })
  await expect(second).toBeFocused()
  const offset = await second.evaluate(() => window.getSelection()?.anchorOffset)
  expect(offset).toBeGreaterThan(0)
  await page.keyboard.insertText('INSERTED')
  await second.press('Shift+ArrowLeft')
  await page.getByRole('button', { name: 'Bold', exact: true }).click()
  await expect(second.locator('strong')).toHaveText('D')
})

test('lists and tables spanning pages preserve their structure after save and reopening', async ({
  page,
}) => {
  const list =
    '<ul>' +
    Array.from(
      { length: 45 },
      (_, i) => `<li><p>Task ${i + 1}: review this item before the next delivery.</p></li>`,
    ).join('') +
    '</ul>'
  const table =
    '<table><tbody>' +
    Array.from(
      { length: 45 },
      (_, i) =>
        `<tr><td><p>Row ${i + 1}</p></td><td><p>Planning</p></td><td><p>Complete</p></td></tr>`,
    ).join('') +
    '</tbody></table>'
  const { writes } = await mockDocuments(page, list + table)
  await page.getByRole('button', { name: /Project notes/ }).click()
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  const content = page.getByRole('textbox', { name: 'Document content', exact: true })
  await content.press('ControlOrMeta+a')
  await page.getByRole('button', { name: 'Bold', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].contents.length).toBeGreaterThan(2)
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  await expect(content.locator('ul')).toHaveCount(1)
  await expect(content.locator('li')).toHaveCount(45)
  await expect(content.locator('table')).toHaveCount(1)
  await expect(content.locator('tr')).toHaveCount(45)
  await expect(content.locator('td')).toHaveCount(135)
  await expect(content.locator('tr').last()).toContainText('Row 45')
})

test('saved ordered list fragments continue numbering across preview pages', async ({ page }) => {
  const list =
    '<ol>' +
    Array.from(
      { length: 80 },
      (_, index) => `<li><p>Task ${index + 1}: review this item.</p></li>`,
    ).join('') +
    '</ol>'
  const { writes } = await mockDocuments(page, list)
  await page.getByRole('button', { name: /Project notes/ }).click()
  await page.getByRole('button', { name: 'Edit document', exact: true }).click()
  const content = page.getByRole('textbox', { name: 'Document content', exact: true })
  await content.press('ControlOrMeta+a')
  await page.getByRole('button', { name: 'Bold', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(() => writes.length).toBe(1)
  const fragments = writes[0].contents.filter((item) => item.content.includes('<ol'))
  expect(fragments.length).toBeGreaterThan(1)
  let expectedStart = 1
  for (const fragment of fragments) {
    const listTag = fragment.content.match(/<ol\b[^>]*>/)?.[0] ?? ''
    const start = Number(listTag.match(/\bstart="(\d+)"/)?.[1] ?? 1)
    expect(start).toBe(expectedStart)
    expectedStart += (fragment.content.match(/<li\b/g) ?? []).length
  }
})

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`document workspace fits ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await mockDocuments(page)
    await page.getByRole('button', { name: 'New', exact: true }).click()
    await page.getByRole('textbox', { name: 'Document name' }).fill('Quarterly project review')
    const sheet = page.getByRole('textbox', { name: 'Document content', exact: true })
    await sheet.fill('Project overview')
    await page.getByRole('combobox', { name: 'Paragraph style' }).selectOption('1')
    await sheet.press('End')
    await sheet.press('Enter')
    await page.keyboard.insertText(
      'Our priorities for the next quarter are clear: improve the participant experience, simplify day-to-day operations, and keep delivery on track.',
    )
    await expect(page.getByRole('toolbar', { name: 'Document formatting' })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.screenshot({
      path: `../outputs/runner-document-editor-${viewport.name}.png`,
      fullPage: true,
    })
  })
}
