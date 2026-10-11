import assert from 'node:assert/strict'
import test from 'node:test'

const theme = await import('../src/shared/theme/theme.ts')
const defaults = theme.DEFAULT_THEME

test('Default is first and preserves the original primary and surface', () => {
  assert.deepEqual(theme.THEME_PRESETS?.[0]?.colors, defaults)
  assert.equal(defaults.primary, '#9929EA')
  assert.equal(defaults.surface, '#FFFFFF')
  assert.equal(theme.THEME_PRESETS?.[0]?.name, 'Default')
  assert.equal(theme.THEME_PRESETS?.length, 21)
})

test('theme foregrounds remain readable for every preset and extreme custom colors', () => {
  assert.equal(typeof theme.deriveThemeTokens, 'function')
  for (const colors of [
    ...theme.THEME_PRESETS.map((preset) => preset.colors),
    {
      ...defaults,
      primary: '#FFFF00',
      secondary: '#000000',
      background: '#FFFFFF',
      surface: '#111827',
    },
  ].map((colors) => theme.normalizeTheme(colors))) {
    const tokens = theme.deriveThemeTokens(colors)
    for (const [background, foreground] of [
      [colors.primary, tokens['--primary-foreground']],
      [colors.secondary, tokens['--secondary-foreground']],
      [colors.surface, tokens['--color-text']],
      [colors.background, tokens['--color-canvas-foreground']],
    ]) {
      assert.ok(theme.contrastRatio(background, foreground) >= 4.5, `${background} / ${foreground}`)
    }
  }
})

test('saved themes round trip and normalize hex without accepting malformed colors', () => {
  assert.equal(typeof theme.readTheme, 'function')
  let stored = null
  const storage = {
    getItem: () => stored,
    setItem: (_, value) => {
      stored = value
    },
  }
  const colors = { ...defaults, primary: '#2563eb' }
  assert.equal(theme.saveTheme(storage, colors), true)
  assert.deepEqual(theme.readTheme(storage), theme.normalizeTheme(colors))
  assert.deepEqual(JSON.parse(stored), {
    version: 2,
    colors: { primary: '#2563EB', surface: '#FFFFFF' },
  })
  for (const invalid of [
    '{',
    'null',
    '{}',
    JSON.stringify({ version: 1, colors: { ...defaults, surface: 'red' } }),
    JSON.stringify({ version: 3, colors: defaults }),
  ]) {
    stored = invalid
    assert.deepEqual(theme.readTheme(storage), defaults)
  }
})

test('blocked storage falls back without blocking theme updates', () => {
  assert.equal(typeof theme.saveTheme, 'function')
  const storage = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  }
  assert.deepEqual(theme.readTheme(storage), defaults)
  assert.equal(theme.saveTheme(storage, defaults), false)
})

test('custom surface neutral text maintains readable contrast', () => {
  for (const surface of ['#FFF8E7', '#123456', '#777777']) {
    const tokens = theme.deriveThemeTokens({ ...defaults, surface })
    for (const level of [400, 500, 600, 700, 800, 900, 950]) {
      assert.ok(
        theme.contrastRatio(surface, tokens[`--color-slate-${level}`]) >= 4.5,
        `${surface} / slate-${level}`,
      )
    }
  }
})

test('text-only primary accents stay readable without changing the chosen fill', () => {
  for (const surface of ['#FFFFFF', '#111827']) {
    const tokens = theme.deriveThemeTokens({ ...defaults, primary: '#FFFF00', surface })
    assert.equal(tokens['--primary'], '#FFFF00')
    assert.equal(typeof tokens['--primary-text'], 'string')
    assert.ok(theme.contrastRatio(surface, tokens['--primary-text']) >= 4.5)
  }
})

test('applying then resetting a palette restores canvas and surface independently', () => {
  assert.equal(typeof theme.applyTheme, 'function')
  const properties = new Map()
  const style = { setProperty: (key, value) => properties.set(key, value) }
  theme.applyTheme(style, theme.THEME_PRESETS[1].colors)
  assert.equal(properties.get('--primary'), '#2563EB')
  theme.applyTheme(style, defaults)
  assert.equal(properties.get('--primary'), '#9929EA')
  assert.equal(properties.get('--color-canvas'), defaults.background)
  assert.equal(properties.get('--color-surface'), '#FFFFFF')
  assert.equal(properties.get('--accent'), '#F5E7FF')
})

test('chart and activity palettes follow live theme colors with readable contrast', () => {
  const teal = theme.THEME_PRESETS.find((preset) => preset.name === 'Teal').colors
  const original = theme.deriveThemeTokens(defaults)
  for (const colors of [teal, { ...teal, surface: '#111827' }].map((colors) =>
    theme.normalizeTheme(colors),
  )) {
    const tokens = theme.deriveThemeTokens(colors)
    for (const key of ['input', 'output', 'total', 'category-four', 'category-five']) {
      const color = tokens[`--color-chart-${key}`]
      assert.equal(typeof color, 'string', key)
      assert.ok(theme.contrastRatio(color, colors.surface) >= 3, key)
    }
    for (let level = 1; level <= 4; level++) {
      const fill = tokens[`--color-activity-${level}`]
      const text = tokens[`--color-activity-${level}-foreground`]
      assert.equal(typeof fill, 'string')
      assert.ok(theme.contrastRatio(fill, text) >= 4.5)
    }
    assert.ok(theme.contrastRatio(tokens['--color-graph-accent'], colors.background) >= 3)
    assert.notEqual(tokens['--color-chart-input'], original['--color-chart-input'])
    assert.notEqual(tokens['--color-chart-output'], original['--color-chart-output'])
  }
})

test('only primary and surface determine a palette, including legacy saved themes', () => {
  const base = { primary: '#2563eb', surface: '#ffffff' }
  const resolved = theme.normalizeTheme(base)
  assert.ok(resolved)
  assert.equal(resolved.primary, '#2563EB')
  assert.equal(resolved.surface, '#FFFFFF')
  assert.notEqual(resolved.secondary, resolved.primary)
  assert.notEqual(resolved.background, resolved.surface)
  const legacy = { ...base, secondary: '#FF0000', background: '#00FF00' }
  assert.deepEqual(theme.normalizeTheme(legacy), resolved)
  assert.deepEqual(
    theme.readTheme({ getItem: () => JSON.stringify({ version: 1, colors: legacy }) }),
    resolved,
  )
  for (const colors of [{ primary: 'red', surface: '#FFFFFF' }, { primary: '#2563EB' }]) {
    assert.equal(theme.normalizeTheme(colors), null)
  }
})

test('changing either base color regenerates the supporting colors and dark canvas', () => {
  const light = theme.normalizeTheme({ primary: '#9929EA', surface: '#FFFFFF' })
  const teal = theme.normalizeTheme({ primary: '#0D9488', surface: '#FFFFFF' })
  const dark = theme.normalizeTheme({ primary: '#9929EA', surface: '#34324A' })
  for (const palette of [teal, dark]) {
    assert.notEqual(palette.secondary, light.secondary)
    assert.notEqual(palette.background, light.background)
  }
  assert.ok(
    theme.contrastRatio(dark.background, '#FFFFFF') > theme.contrastRatio(dark.surface, '#FFFFFF'),
  )
  for (const preset of theme.THEME_PRESETS) {
    assert.deepEqual(theme.normalizeTheme(preset.colors), preset.colors)
  }
})
