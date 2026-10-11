import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const contacts = [
  {
    actorId: 'alice',
    actorName: 'Alice',
    actorEmail: 'alice@example.test',
    actorPosition: 'Coach',
    actorGroupPosition: 'Client',
  },
  {
    actorId: 'carol',
    actorName: 'Carol',
    actorEmail: 'carol@example.test',
    actorPosition: 'Director',
    actorGroupPosition: 'Leaders',
  },
  {
    actorId: 'bob',
    actorName: 'Bob',
    actorEmail: null,
    actorPosition: 'Manager',
    actorGroupPosition: 'Client',
  },
]

async function mockRunner(page: Page) {
  // Optional offline mode serves the real production build through interception.
  // It avoids localhost restrictions without changing the app or its API calls.
  if (process.env.RUNNER_PICKER_STATIC_PREVIEW === '1') {
    await page.route('http://runner.test/**', (route) => {
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
  const contactRequests: URL[] = []
  const sends: string[] = []
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    let data: unknown = []
    if (route.request().method() === 'POST') {
      if (path === '/api/v1/web/chat' || path === '/api/v1/web/email') sends.push(path)
      data = { status: 'success', count: 0 }
    } else if (path === '/api/v1/web/actors/groups') {
      data = ['Client', 'Leaders']
    } else if (path === '/api/v1/web/actors') {
      contactRequests.push(url)
      const search = (url.searchParams.get('search') ?? '').toLowerCase()
      const group = url.searchParams.get('actorGroupPosition')
      if (search) await new Promise((resolve) => setTimeout(resolve, 350))
      data = contacts.filter(
        (actor) =>
          (group === null || actor.actorGroupPosition === group) &&
          [actor.actorName, actor.actorEmail, actor.actorPosition, actor.actorGroupPosition].some(
            (value) => value?.toLowerCase().includes(search),
          ),
      )
    } else if (path === '/api/v1/web/chat/master_group_simulations') {
      data = [
        {
          simulationId: 'sim',
          groupSimulationName: 'Simulation',
          simulationName: 'Scenario',
          status: 'waiting',
          unreadCount: 0,
        },
      ]
    } else if (path === '/api/v1/web/chat/actors') {
      data = [{ actorId: 'bob', actorName: 'Bob', unreadCount: 0 }]
    } else if (path === '/api/v1/web/notifications/activity') {
      data = { activityChat: [], activityEmail: [] }
    } else if (path === '/api/v1/web/email/inbox') {
      data = [
        {
          rootId: 'email',
          latestMessageId: 'email',
          latestSenderId: 'bob',
          latestSenderType: 'actor',
          latestSubject: 'Existing email',
          latestContent: 'Hello',
          latestIsRead: true,
          latestCreatedDate: '2026-10-09T02:00:00Z',
          unreadCount: 0,
          messageCount: 1,
          simulationId: 'sim',
        },
      ]
    } else if (path === '/api/v1/admin/master-data/actors') {
      data = { content: contacts, last: true }
    }
    await route.fulfill({ json: { status: 'success', info: { code: 200, message: 'ok' }, data } })
  })
  return { contactRequests, sends }
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`shared contact drawer preserves single-actor chat flow on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const { contactRequests, sends } = await mockRunner(page)
    await page.goto('/simulation/test/chat')
    const trigger = page.getByRole('button', { name: 'New Chat', exact: true })
    await trigger.click()
    const panel = page.getByRole('dialog', { name: 'Contacts', exact: true })
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('radio', { name: /Bob/ })).toHaveCount(0)
    await panel.getByRole('radio', { name: /Alice/ }).check()
    await panel.getByRole('radio', { name: /Carol/ }).check()
    await expect(panel.getByRole('radio', { checked: true })).toHaveCount(1)
    await panel.getByRole('combobox', { name: 'Contact group' }).click()
    await page.getByRole('option', { name: 'Client', exact: true }).click()
    await expect(panel.getByRole('radio', { name: /Carol/ })).toHaveCount(0)
    await panel.getByRole('radio', { name: /Alice/ }).check()
    await panel.getByRole('textbox', { name: 'Search contacts' }).fill('missing')
    await expect(panel.getByRole('button', { name: 'Add to chat', exact: true })).toBeDisabled()
    await expect(panel.getByText('No contacts found.')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(panel.getByRole('textbox', { name: 'Search contacts' })).toHaveValue('')
    await panel.getByRole('radio', { name: /Alice/ }).check()
    await page.screenshot({
      path: `../outputs/runner-actor-picker-${viewport.name}.png`,
      fullPage: true,
    })
    const bounds = await panel.boundingBox()
    expect(bounds!.x + bounds!.width).toBeCloseTo(viewport.width - 8, 0)
    expect(bounds!.width).toBeLessThanOrEqual(viewport.width)
    await panel.getByRole('button', { name: 'Add to chat', exact: true }).click()
    await expect(panel).not.toBeVisible()
    await expect(page.locator('input[name="target"]')).toHaveValue('alice')
    expect(
      contactRequests.every(
        (url) =>
          url.searchParams.get('designId') === 'ambj-01' && url.searchParams.get('levelId') === '3',
      ),
    ).toBe(true)
    expect(sends).toEqual([])
  })
}

test('email uses the same drawer and cancellation preserves its recipient', async ({ page }) => {
  const { sends } = await mockRunner(page)
  await page.goto('/simulation/test/email')
  await page.getByText('Existing email', { exact: true }).click()
  const recipient = page.locator('input[name="target"]')
  await expect(recipient).toHaveValue('bob')
  const trigger = page.getByRole('button', { name: 'Pick actor', exact: true })
  await trigger.click()
  const panel = page.getByRole('dialog', { name: 'Contacts', exact: true })
  await expect(panel.getByRole('radio', { name: /Bob/ })).toBeChecked()
  await panel.getByRole('radio', { name: /Alice/ }).check()
  await page.keyboard.press('Escape')
  await expect(recipient).toHaveValue('bob')
  await trigger.click()
  await expect(panel.getByRole('radio', { name: /Bob/ })).toBeChecked()
  await panel.getByRole('radio', { name: /Carol/ }).check()
  await panel.getByRole('button', { name: 'Use recipient', exact: true }).click()
  await expect(recipient).toHaveValue('carol')
  expect(sends).toEqual([])
})
