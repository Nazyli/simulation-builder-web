import assert from 'node:assert/strict'
import test from 'node:test'

const { formatCurrencyAmounts, formatTokenCount } =
  await import('../src/features/ai_token_usage/usage-logic.ts')

test('formats full and compact token counts readably', () => {
  assert.equal(formatTokenCount(1240), '1,240')
  assert.equal(formatTokenCount(12_400, true), '12.4K')
  assert.equal(formatTokenCount(1_200_000, true), '1.2M')
})

test('formats costs with the currency code and keeps currencies separate', () => {
  assert.deepEqual(
    formatCurrencyAmounts([
      { currency: 'USD', amount: 12.5 },
      { currency: 'EUR', amount: 3.5 },
    ]),
    ['$12.50', '€3.50'],
  )
  assert.deepEqual(formatCurrencyAmounts([{ currency: 'USD', amount: 0.0015 }]), ['$0.0015'])
})

test('category adapters preserve unspecified nodes and order all filtered aggregates by tokens', async () => {
  const { adaptDimensions } = await import('../src/features/ai_token_usage/usage-api-adapters.ts')
  const fields = {
    requestCount: 1,
  }
  const rows = adaptDimensions(
    [
      { ...fields, nodeType: null, totalTokens: 10 },
      { ...fields, nodeType: 'invite_to_call', totalTokens: 30 },
    ],
    'nodeType',
    40,
  )
  assert.deepEqual(
    rows.map((row) => [row.label, row.contributionPercent]),
    [
      ['invite to call', 75],
      ['Unspecified', 25],
    ],
  )
  assert.notEqual(rows[0].id, rows[1].id)
})

test('overview usage URL filters round trip without losing scope', async () => {
  const { readUsageFilters, writeUsageFilters } =
    await import('../src/features/ai_token_usage/usage-filter-params.ts')
  const values = {
    from: '2026-01-01',
    to: '2026-04-01',
    participantId: '94839',
    activityType: 'invite_to_call',
    model: 'a/b',
  }
  assert.deepEqual(readUsageFilters(writeUsageFilters(values)), values)
})

test('simulation proportions group small categories without losing tokens', async () => {
  const { simulationShares } = await import('../src/features/ai_token_usage/usage-chart-logic.ts')
  const rows = Array.from({ length: 8 }, (_, index) => ({
    id: `sim-${index}`,
    label: `Simulation ${index}`,
    totalTokens: index + 1,
  }))
  const segments = simulationShares(rows)
  assert.equal(segments.length, 5)
  assert.equal(segments[0].tokens, 8)
  assert.equal(segments.at(-1).label, 'Other (4)')
  assert.equal(
    segments.reduce((sum, row) => sum + row.tokens, 0),
    36,
  )
  assert.ok(Math.abs(segments.reduce((sum, row) => sum + row.percent, 0) - 100) < 0.000001)
})

test('zero-token and single-simulation shares never invent percentages', async () => {
  const { simulationShares } = await import('../src/features/ai_token_usage/usage-chart-logic.ts')
  assert.equal(simulationShares([{ id: 'one', label: 'One', totalTokens: 123 }])[0].percent, 100)
  const zero = simulationShares([{ id: 'zero', label: 'Zero', totalTokens: 0 }])[0]
  assert.equal(zero.percent, 0)
  assert.equal(zero.offset, 0)
  assert.deepEqual(simulationShares([]), [])
})

test('compact model data retains provider/service row identity and detail token/cost values', async () => {
  const { adaptDimensions } = await import('../src/features/ai_token_usage/usage-api-adapters.ts')
  const base = { model: 'shared-model', serviceType: 'LLM', requestCount: 1, totalTokens: 100 }
  const models = adaptDimensions(
    [
      { ...base, provider: 'OpenAI' },
      { ...base, provider: 'Anthropic' },
      { ...base, provider: 'OpenAI', serviceType: 'TTS' },
    ],
    'model',
    300,
  )
  assert.equal(new Set(models.map((row) => row.id)).size, 3)
  const [detail] = adaptDimensions(
    [
      {
        ...base,
        provider: 'OpenAI',
        inputTokens: 60,
        outputTokens: 40,
        costs: [{ currency: 'USD', amount: 0.001 }],
      },
    ],
    'model',
    100,
  )
  assert.equal(detail.inputTokens, 60)
  assert.equal(detail.outputTokens, 40)
  assert.deepEqual(detail.costByCurrency, [{ currency: 'USD', amount: 0.001 }])
})
