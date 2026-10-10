import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const processing = 'Simulation is processing. Messages will appear when ready.'

async function mockRunner(page: Page) {
  if (process.env.RUNNER_BACKGROUND_STATIC_PREVIEW === '1') {
    await page.route('http://runner.test/**', (route) => {
      const path = new URL(route.request().url()).pathname
      const asset = path.startsWith('/assets/') ? `assets/${basename(path)}` : 'index.html'
      return route.fulfill({
        body: readFileSync(new URL(`../dist/${asset}`, import.meta.url)),
        contentType: asset.endsWith('.js')
          ? 'text/javascript'
          : asset.endsWith('.css')
            ? 'text/css'
            : asset.endsWith('.woff2')
              ? 'font/woff2'
              : 'text/html',
      })
    })
  }
  await page.addInitScript(() => {
    const streams: EventTarget[] = []
    class TestEventSource extends EventTarget {
      constructor() {
        super()
        streams.push(this)
      }
      close() {
        streams.splice(streams.indexOf(this), 1)
      }
    }
    Object.assign(window, { EventSource: TestEventSource, runnerStreams: streams })
  })
  let status = 'running'
  let reads = 0
  const run = () => ({
    executionId: 'execution-1',
    simulationId: 'sim-1',
    sessionId: 'session-1',
    status,
    context: {},
    startedAt: '2026-10-10T00:00:00Z',
    completedAt: null,
  })
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path.endsWith('/executions/batch')) {
      data = { participantId: '17737', runs: [{ ...run(), outcome: 'created' }] }
    } else if (path.endsWith('/sessions/executions')) {
      reads++
      data = [run()]
    } else if (path.endsWith('/notifications/activity')) {
      data = { activityChat: [], activityEmail: [] }
    } else if (path.endsWith('/simulations/published')) {
      data = [
        {
          simulationId: 'sim-1',
          simulationName: 'Scenario',
          groupSimulationId: 'group-1',
          groupSimulationName: 'Group',
          simulationDesc: '',
          channelName: 'chat',
          version: 1,
          duration: 0,
          status: 'published',
        },
      ]
    }
    await route.fulfill({ json: { status: 'success', info: { code: 200, message: 'ok' }, data } })
  })
  return {
    setStatus: (value: string) => {
      status = value
    },
    reads: () => reads,
  }
}

async function emit(page: Page, name: string) {
  await page.evaluate((type) => {
    const streams = (window as unknown as { runnerStreams: EventTarget[] }).runnerStreams
    streams[0].dispatchEvent(
      type === 'notification'
        ? new MessageEvent(type, {
            data: JSON.stringify({ type: 'execution_status', status: 'failed' }),
          })
        : new Event(type),
    )
  }, name)
}

test('subscription-ready notification reconciles completion after the open refresh', async ({
  page,
}) => {
  const runner = await mockRunner(page)
  await page.goto('/simulation/17737')
  await expect(page.getByText(processing, { exact: true })).toBeVisible()
  const before = runner.reads()
  await emit(page, 'open')
  await expect.poll(runner.reads).toBeGreaterThan(before)
  runner.setStatus('completed')
  await page.evaluate(() => {
    const streams = (window as unknown as { runnerStreams: EventTarget[] }).runnerStreams
    streams[0].dispatchEvent(
      new MessageEvent('notification', {
        data: JSON.stringify({ type: 'stream_ready' }),
      }),
    )
  })
  await expect(page.getByText(processing, { exact: true })).toHaveCount(0)
})

test('batch acceptance opens workspace while the simulation is processing', async ({ page }) => {
  await mockRunner(page)
  await page.goto('/simulation')
  await page.getByLabel('Participant ID', { exact: true }).fill('17737')
  await page.getByLabel('Participant actor', { exact: true }).fill('participant-001')
  await page.getByLabel('Full name', { exact: true }).fill('Nazyli')
  await page.getByRole('checkbox').first().check()
  await page.getByRole('button', { name: 'Run selected', exact: true }).click()
  await expect(page).toHaveURL(/\/simulation\/17737$/)
  await expect(page.getByText('1 simulation opened.', { exact: true })).toBeVisible()
  await expect(page.getByText(processing, { exact: true })).toBeVisible()
})

test('status-only events surface failure without a channel message', async ({ page }) => {
  const runner = await mockRunner(page)
  await page.goto('/simulation/17737')
  await expect(page.getByText(processing, { exact: true })).toBeVisible()
  runner.setStatus('failed')
  await emit(page, 'notification')
  await expect(page.getByRole('alert').filter({ hasText: 'A simulation failed.' })).toBeVisible()
  await expect(page.getByText(processing, { exact: true })).toHaveCount(0)
  await expect(page.getByText(/New message from|New email from/)).toHaveCount(0)
})

test('open, reconnect and visibility reconcile missed status events using one stream', async ({
  page,
}) => {
  const runner = await mockRunner(page)
  await page.goto('/simulation/17737')
  await expect(page.getByText(processing, { exact: true })).toBeVisible()
  runner.setStatus('completed')
  await emit(page, 'open')
  await expect(page.getByText(processing, { exact: true })).toHaveCount(0)
  const before = runner.reads()
  await emit(page, 'open')
  await expect.poll(runner.reads).toBeGreaterThan(before)
  const reconnected = runner.reads()
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(runner.reads).toBeGreaterThan(reconnected)
  expect(
    await page.evaluate(
      () => (window as unknown as { runnerStreams: EventTarget[] }).runnerStreams.length,
    ),
  ).toBe(1)
})
