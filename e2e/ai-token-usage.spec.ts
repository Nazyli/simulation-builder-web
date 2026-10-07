import { expect, test } from '@playwright/test'

const aggregate = <T extends object>(extra: T) => ({
  requestCount: 13,
  totalTokens: 1800,
  inputTokens: 1350,
  outputTokens: 450,
  averageTokensPerRequest: 138.46,
  costs: [{ currency: 'USD', amount: 0.12 }],
  ...extra,
})
const analytics = {
  summary: { ...aggregate({}), participantCount: 13 },
  trendInterval: 'weekly',
  requestActivity: {
    dateFrom: '2026-01-01',
    dateTo: '2026-04-01',
    days: [
      { date: '2026-01-01', requestCount: 2 },
      { date: '2026-01-15', requestCount: 3 },
      { date: '2026-03-03', requestCount: 5 },
      { date: '2026-04-01', requestCount: 3 },
    ],
  },
  trend: [0, 20, 0, 80, 100, 148, 60, 240, 300, 52, 120, 0, 400, 180].map((tokens, index) => ({
    date: new Date(Date.UTC(2025, 11, 29 + index * 7)).toISOString().slice(0, 10),
    requestCount: [0, 1, 0, 1, 1, 2, 1, 1, 1, 1, 1, 0, 2, 1][index],
    totalTokens: tokens,
    inputTokens: tokens * 0.75,
    outputTokens: tokens * 0.25,
  })),
  byActivityType: [
    aggregate({
      activityType: 'send_chat',
      requestCount: 7,
      totalTokens: 1000,
      inputTokens: 750,
      outputTokens: 250,
    }),
    aggregate({
      activityType: 'invite_to_call',
      requestCount: 6,
      totalTokens: 800,
      inputTokens: 600,
      outputTokens: 200,
    }),
  ],
  byNodeType: [
    aggregate({
      nodeType: 'send_chat',
      requestCount: 7,
      totalTokens: 1000,
      inputTokens: 750,
      outputTokens: 250,
    }),
    aggregate({
      nodeType: 'call',
      requestCount: 5,
      totalTokens: 800,
      inputTokens: 600,
      outputTokens: 200,
    }),
    aggregate({ nodeType: null, requestCount: 1, totalTokens: 0, inputTokens: 0, outputTokens: 0 }),
  ],
  byModel: [
    aggregate({
      model: 'openai.gpt-oss-120b',
      provider: 'openai',
      serviceType: 'LLM',
      requestCount: 7,
      totalTokens: 900,
      inputTokens: 675,
      outputTokens: 225,
    }),
    aggregate({
      model: 'claude-sonnet',
      provider: 'anthropic',
      serviceType: 'LLM',
      requestCount: 4,
      totalTokens: 600,
      inputTokens: 450,
      outputTokens: 150,
    }),
    aggregate({
      model: 'openai.gpt-oss-20b',
      provider: 'openai',
      serviceType: 'LLM',
      requestCount: 2,
      totalTokens: 300,
      inputTokens: 225,
      outputTokens: 75,
    }),
  ],
  bySimulation: [
    aggregate({
      simulationId: 'coaching',
      requestCount: 7,
      totalTokens: 1000,
      inputTokens: 750,
      outputTokens: 250,
    }),
    aggregate({
      simulationId: 'onboarding',
      requestCount: 4,
      totalTokens: 500,
      inputTokens: 375,
      outputTokens: 125,
    }),
    aggregate({
      simulationId: 'manager-review',
      requestCount: 2,
      totalTokens: 300,
      inputTokens: 225,
      outputTokens: 75,
    }),
  ],
  filterOptions: {
    simulationIds: ['coaching'],
    providers: ['openai'],
    models: ['openai.gpt-oss-120b'],
    activityTypes: ['send_chat', 'invite_to_call'],
  },
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`usage charts and independent table pagination on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    let analyticsRequests = 0
    const analyticsUrls: URL[] = []
    let crowded = false
    let singlePeriod = false
    const tableRequests: URL[] = []
    await page.route('**/admin/ai-token-usage**', async (route) => {
      const url = new URL(route.request().url())
      const participants = url.pathname.endsWith('/participants')
      const events = url.pathname.endsWith('/events')
      if (!participants && !events) {
        analyticsRequests++
        analyticsUrls.push(url)
        const detail = url.pathname.includes('/participants/')
        const data = {
          ...analytics,
          ...(crowded
            ? {
                byNodeType: Array.from({ length: 12 }, (_, index) =>
                  aggregate({
                    nodeType: `node_${index}_with_a_long_label_that_must_remain_readable`,
                    totalTokens: 12 - index,
                  }),
                ),
                bySimulation: Array.from({ length: 8 }, (_, index) =>
                  aggregate({ simulationId: `simulation-${index}`, totalTokens: 8 - index }),
                ),
                byActivityType: [
                  ...analytics.byActivityType,
                  aggregate({
                    activityType: 'cache_adjusted',
                    totalTokens: 100,
                    inputTokens: 10,
                    outputTokens: 20,
                  }),
                ],
              }
            : {}),
        }
        return route.fulfill({
          json: {
            status: 'success',
            data: {
              summary: {
                requestCount: data.summary.requestCount,
                totalTokens: data.summary.totalTokens,
                averageTokensPerRequest: data.summary.averageTokensPerRequest,
                costs: data.summary.costs,
                ...(detail
                  ? {
                      inputTokens: data.summary.inputTokens,
                      outputTokens: data.summary.outputTokens,
                    }
                  : { participantCount: data.summary.participantCount }),
              },
              ...(detail && singlePeriod
                ? {}
                : {
                    trendInterval: data.trendInterval,
                    trend: data.trend.map(({ date, inputTokens, outputTokens, totalTokens }) => ({
                      date,
                      inputTokens,
                      outputTokens,
                      totalTokens,
                    })),
                  }),
              ...(!detail
                ? { requestActivity: data.requestActivity, filterOptions: data.filterOptions }
                : {}),
              byActivityType: data.byActivityType.map((row) => ({
                activityType: row.activityType,
                requestCount: row.requestCount,
                inputTokens: row.inputTokens,
                outputTokens: row.outputTokens,
                totalTokens: row.totalTokens,
              })),
              byNodeType: data.byNodeType.map((row) => ({
                nodeType: row.nodeType,
                requestCount: row.requestCount,
                totalTokens: row.totalTokens,
              })),
              bySimulation: data.bySimulation.map((row) => ({
                simulationId: row.simulationId,
                totalTokens: row.totalTokens,
              })),
              byModel: data.byModel.map((row) => ({
                provider: row.provider,
                model: row.model,
                serviceType: row.serviceType,
                requestCount: row.requestCount,
                totalTokens: row.totalTokens,
                ...(detail
                  ? {
                      inputTokens: row.inputTokens,
                      outputTokens: row.outputTokens,
                      costs: row.costs,
                    }
                  : {}),
              })),
            },
          },
        })
      }
      tableRequests.push(url)
      const number = Number(url.searchParams.get('page'))
      const size = Number(url.searchParams.get('size'))
      const total = url.searchParams.get('search') === 'missing' ? 0 : 13
      const content = Array.from(
        { length: Math.max(0, Math.min(size, total - number * size)) },
        (_, index) =>
          participants
            ? {
                participantId: index === 0 ? '94839' : `participant-${number * size + index}`,
                requestCount: 13,
                totalTokens: 1800,
                inputTokens: 1350,
                outputTokens: 450,
                averageTokensPerRequest: 138.46,
              }
            : {
                usageId: `usage-${number * size + index}`,
                simulationId: 'coaching',
                activityType: 'send_chat',
                nodeType: 'send_chat',
                serviceType: 'LLM',
                provider: 'openai',
                model: 'openai.gpt-oss-120b',
                inputTokens:
                  42 + (number * size + index) * 10 + (number * size + index === 0 ? 24 : 0),
                outputTokens: number * size + index === 0 ? 0 : 18 + (number * size + index) * 3,
                totalTokens: number * size + index === 0 ? 66 : 60 + (number * size + index) * 13,
                totalCost: 0.01,
                currency: 'USD',
                capturedAt: '2026-10-07T00:00:00Z',
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
          },
        },
      })
    })
    await page.goto('/ai-token-usage?from=2026-01-01&to=2026-04-01')
    await expect(page.getByText('13 records', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Request activity', exact: true })).toBeVisible()
    await expect(page.getByLabel('2026-04-01: 3 recorded requests', { exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: 'Activity month' }).click()
    await page.getByRole('option', { name: 'February 2026', exact: true }).click()
    await expect(page.getByLabel('2026-02-01: 0 recorded requests', { exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: 'Activity month' }).click()
    await page.getByRole('option', { name: 'April 2026', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Usage by activity type' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Usage by node type' })).toBeVisible()
    await expect(page.locator('.usage-category-chart').first()).toHaveCSS('min-height', '0px')
    await expect(page.locator('[data-chart-kind="stacked"] .usage-stacked-track')).toHaveCount(2)
    await expect(page.locator('[data-chart-kind="columns"] .usage-columns li')).toHaveCount(3)
    await expect(page.locator('[data-chart-kind="dots"] .usage-dot-track')).toHaveCount(3)
    await expect(page.locator('[data-chart-kind="share"] .usage-share-ring')).toBeVisible()
    const palette = await page.locator('[data-chart-kind="stacked"]').evaluate((chart) => {
      const style = getComputedStyle(chart)
      const probe = document.createElement('span')
      chart.append(probe)
      const textColors = ['--usage-ink', '--usage-muted', '--usage-accent'].map((token) => {
        probe.style.color = `var(${token})`
        return getComputedStyle(probe).color
      })
      const chartColors = [
        '--usage-input',
        '--usage-output',
        '--usage-total',
        '--usage-category-four',
        '--usage-category-five',
      ].map((token) => {
        probe.style.color = `var(${token})`
        return getComputedStyle(probe).color
      })
      probe.remove()
      return { textColors, chartColors, background: style.backgroundColor }
    })
    const luminance = (color: string) => {
      const channels = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const channel = value / 255
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        })
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }
    const background = luminance(palette.background)
    for (const color of palette.textColors) {
      const foreground = luminance(color)
      expect(
        (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05),
      ).toBeGreaterThanOrEqual(4.5)
    }
    for (const color of palette.chartColors) {
      const foreground = luminance(color)
      expect(
        (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05),
      ).toBeGreaterThanOrEqual(3)
    }
    const inputBar = page.locator('.usage-stacked-track__input').first()
    await expect(
      page.locator('.recharts-line').first().locator('path.recharts-line-curve'),
    ).toHaveCSS('stroke', await inputBar.evaluate((bar) => getComputedStyle(bar).backgroundColor))
    await expect(page.getByText(/Showing weekly totals/)).toBeVisible()
    const originalInput = await inputBar.evaluate((bar) => getComputedStyle(bar).backgroundColor)
    const activityDay = page.getByLabel('2026-04-01: 3 recorded requests', { exact: true })
    const originalDay = await activityDay.evaluate((day) => getComputedStyle(day).backgroundColor)
    await page.getByRole('button', { name: 'Customize theme' }).click()
    await page.getByRole('radio', { name: 'Teal theme' }).check()
    await page.keyboard.press('Escape')
    await expect(inputBar).not.toHaveCSS('background-color', originalInput)
    await expect(activityDay).not.toHaveCSS('background-color', originalDay)
    const tealInput = await inputBar.evaluate((bar) => getComputedStyle(bar).backgroundColor)
    await expect(
      page.locator('.recharts-line').first().locator('path.recharts-line-curve'),
    ).toHaveCSS('stroke', tealInput)
    const beforePage = analyticsRequests
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByText('Page 2 / 2')).toBeVisible()
    expect(analyticsRequests).toBe(beforePage)
    await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('20')
    await expect.poll(() => tableRequests.at(-1)?.searchParams.get('size')).toBe('20')
    await expect(page.getByText('Page 1 / 1')).toBeVisible()
    expect(analyticsRequests).toBe(beforePage)
    await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('10')
    await page.getByRole('button', { name: 'Sort by Total tokens', exact: true }).click()
    await expect.poll(() => tableRequests.at(-1)?.searchParams.get('sort')).toBe('totalTokens,asc')
    await page.getByRole('textbox', { name: 'Filter rows' }).fill('missing')
    await expect(page.getByText('0 records', { exact: true })).toBeVisible()
    expect(analyticsRequests).toBe(beforePage)
    await page.getByRole('textbox', { name: 'Filter rows' }).clear()
    await expect(page.getByText('13 records', { exact: true })).toBeVisible()
    await page.screenshot({
      path: `../outputs/ai-token-usage-${viewport.name}.png`,
      fullPage: true,
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    )

    const detailLink = page.getByRole('link', { name: 'View usage for participant 94839' }).first()
    await expect(detailLink).toHaveAttribute('href', '/ai-token-usage/94839')
    await detailLink.click()
    await page.goto(
      '/ai-token-usage/94839?from=2026-01-01&to=2026-01-01&interval=monthly&provider=missing',
    )
    await expect(page.getByRole('heading', { name: 'Participant 94839' })).toBeVisible()
    await expect(page.locator('.usage-stacked-track__input').first()).toHaveCSS(
      'background-color',
      tealInput,
    )
    await expect(page.getByRole('region', { name: 'Filter participant usage' })).toHaveCount(0)
    await expect(page.getByLabel('Date from', { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Date to', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('combobox', { name: 'Time interval' })).toHaveCount(0)
    await expect(page.getByText('All recorded usage, grouped weekly.')).toBeVisible()
    expect(analyticsUrls.at(-1)?.search).toBe('')
    const history = page.locator('.usage-request-history')
    await expect(history.getByText('13 records', { exact: true })).toBeVisible()
    const trendBounds = await page
      .locator('.usage-participant-workspace .usage-dashboard__trend')
      .boundingBox()
    const historyBounds = await history.boundingBox()
    expect(trendBounds).not.toBeNull()
    expect(historyBounds).not.toBeNull()
    if (viewport.width > 1100) {
      expect(historyBounds!.x).toBeGreaterThan(trendBounds!.x + trendBounds!.width)
      expect(Math.abs(historyBounds!.y - trendBounds!.y)).toBeLessThanOrEqual(1)
      expect(historyBounds!.width).toBeGreaterThan(trendBounds!.width)
    } else {
      expect(historyBounds!.y).toBeGreaterThanOrEqual(trendBounds!.y + trendBounds!.height)
      expect(historyBounds!.x).toBe(trendBounds!.x)
    }
    await expect(page.getByRole('heading', { name: 'Request size', exact: true })).toBeVisible()
    await expect(page.getByText('Showing requests 1–10 of 13.', { exact: false })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Usage by activity type' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Usage by node type' })).toBeVisible()
    await expect(page.locator('[data-chart-kind="stacked"] .usage-stacked-track')).toHaveCount(2)
    await expect(page.locator('[data-chart-kind="columns"] .usage-columns li')).toHaveCount(3)
    await expect(page.locator('[data-chart-kind="share"] .usage-share-ring')).toBeVisible()
    expect(
      [...tableRequests.at(-1)!.searchParams.keys()].every((key) =>
        ['page', 'size', 'search', 'sort'].includes(key),
      ),
    ).toBe(true)
    const beforeEvents = analyticsRequests
    await history.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(history.getByText('Page 2 / 2')).toBeVisible()
    await expect(page.getByText('Showing requests 11–13 of 13.', { exact: false })).toBeVisible()
    expect(analyticsRequests).toBe(beforeEvents)
    await history.getByRole('button', { name: 'Sort by Cost', exact: true }).click()
    await expect.poll(() => tableRequests.at(-1)?.searchParams.get('sort')).toBe('totalCost,asc')
    expect(analyticsRequests).toBe(beforeEvents)
    await history.getByRole('textbox', { name: 'Filter rows' }).fill('missing')
    await expect(history.getByText('0 records', { exact: true })).toBeVisible()
    expect(analyticsRequests).toBe(beforeEvents)
    await history.getByRole('textbox', { name: 'Filter rows' }).clear()
    await expect(history.getByText('13 records', { exact: true })).toBeVisible()
    await page.screenshot({
      path: `../outputs/ai-token-usage-detail-${viewport.name}.png`,
      fullPage: true,
    })
    crowded = true
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    const nodes = page.locator('[data-chart-kind="columns"]')
    await expect(nodes.locator('.usage-columns li')).toHaveCount(8)
    await nodes.getByRole('button', { name: 'Show all 12', exact: true }).click()
    await expect(nodes.locator('.usage-columns li')).toHaveCount(12)
    const shares = page.locator('[data-chart-kind="share"]')
    await expect(shares.getByText('Other (4)', { exact: true })).toBeVisible()
    await shares.getByText('View all 8 simulations', { exact: true }).click()
    await expect(shares.getByText('simulation-7', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Bars show input and output. Recorded totals can differ from their sum.'),
    ).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    )
    singlePeriod = true
    crowded = false
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await expect(page.getByText('All recorded usage, grouped weekly.')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Token usage by period' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Token usage over time' })).toHaveCount(0)
    const metrics = page.getByRole('region', { name: 'Participant usage summary' })
    await expect(metrics.getByText('1,800', { exact: true })).toBeVisible()
    await expect(metrics.getByText('1,350', { exact: true })).toBeVisible()
    await expect(metrics.getByText('450', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Usage by activity type' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Usage by node type' })).toBeVisible()
    await expect(history.getByText('13 records', { exact: true })).toBeVisible()
    const chartsBounds = await page.locator('.usage-participant-workspace__charts').boundingBox()
    const singleHistoryBounds = await history.boundingBox()
    if (viewport.width > 1100) {
      expect(singleHistoryBounds!.x).toBeGreaterThan(chartsBounds!.x + chartsBounds!.width)
      expect(Math.abs(singleHistoryBounds!.y - chartsBounds!.y)).toBeLessThanOrEqual(1)
    } else {
      expect(singleHistoryBounds!.y).toBeGreaterThanOrEqual(chartsBounds!.y + chartsBounds!.height)
    }
    await page.screenshot({
      path: `../outputs/ai-token-usage-detail-single-period-${viewport.name}.png`,
      fullPage: true,
    })
  })
}
