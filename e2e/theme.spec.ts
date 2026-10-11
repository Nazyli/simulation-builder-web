import { expect, test } from '@playwright/test'
import { DEFAULT_THEME, THEME_PRESETS, normalizeTheme } from '../src/shared/theme/theme'

test('two base colors apply their palette live, survive reload, and reset', async ({ page }) => {
  await page.goto('/settings')
  const trigger = page.getByRole('button', { name: 'Customize theme' })
  await trigger.click()
  const panel = page.getByRole('dialog', { name: 'Customize theme' })
  await expect(panel).toBeVisible()
  const presets = panel.getByRole('radio')
  await expect(presets).toHaveCount(21)
  await expect(presets.first()).toHaveAccessibleName('Default theme')
  await expect(presets.first()).toBeChecked()
  await expect(panel.getByRole('textbox', { name: /hex$/ })).toHaveCount(2)
  await expect(panel.locator('input[type="color"]')).toHaveCount(2)
  await expect(panel.getByLabel('Secondary hex')).toHaveCount(0)
  await expect(panel.getByLabel('Background hex')).toHaveCount(0)
  await panel.getByRole('radio', { name: 'Forest Night theme' }).check()
  await expect(panel).toHaveCSS('background-color', 'rgb(16, 61, 50)')
  await expect(page.locator('html')).toHaveCSS(
    '--color-canvas',
    THEME_PRESETS.find((p) => p.name === 'Forest Night')!.colors.background,
  )
  await panel.getByRole('radio', { name: 'Material Palenight theme' }).check()
  await expect(panel).toHaveCSS('background-color', 'rgb(52, 50, 74)')
  const palenight = THEME_PRESETS.find((p) => p.name === 'Material Palenight')!.colors
  await expect(page.locator('html')).toHaveCSS('--color-canvas', palenight.background)
  await expect(panel.getByRole('textbox', { name: 'Primary hex' })).toHaveValue('#C792EA')
  await expect(page.locator('html')).toHaveCSS('--secondary', palenight.secondary)
  await page.reload()
  await trigger.click()
  await expect(panel.getByRole('radio', { name: 'Material Palenight theme' })).toBeChecked()
  await expect(panel).toHaveCSS('background-color', 'rgb(52, 50, 74)')
  await expect(page.locator('html')).toHaveCSS('--color-canvas', palenight.background)
  await panel.getByRole('radio', { name: 'Ocean theme' }).check()
  await expect(page.locator('html')).toHaveCSS('--color-canvas', THEME_PRESETS[1].colors.background)
  await expect(panel.getByRole('textbox', { name: 'Primary hex' })).toHaveValue('#2563EB')

  for (const [name, value] of [
    ['Primary', '#FFFF00'],
    ['Surface', '#FFF8E7'],
  ]) {
    await panel.getByRole('textbox', { name: `${name} hex` }).fill(value)
    await expect(panel.getByLabel(`${name} color`, { exact: true })).toHaveValue(
      value.toLowerCase(),
    )
  }
  await expect(panel.getByText('Custom', { exact: true })).toBeVisible()
  const custom = normalizeTheme({ primary: '#FFFF00', surface: '#FFF8E7' })!
  await expect(page.locator('html')).toHaveCSS('--color-canvas', custom.background)
  await expect(page.locator('html')).toHaveCSS('--secondary', custom.secondary)
  await expect(panel.getByRole('definition')).toHaveText([custom.secondary, custom.background])
  await expect(panel).toHaveCSS('background-color', 'rgb(255, 248, 231)')
  await expect(panel).toHaveCSS('color', 'rgb(23, 32, 51)')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.reload()
  await expect(page.locator('html')).toHaveCSS('--color-canvas', custom.background)
  await page.getByRole('button', { name: 'Customize theme' }).click()
  await expect(panel.getByRole('textbox', { name: 'Primary hex' })).toHaveValue('#FFFF00')
  await panel.getByRole('button', { name: 'Reset to default' }).click()
  await expect(panel.getByRole('radio', { name: 'Default theme' })).toBeChecked()
  await expect(page.locator('html')).toHaveCSS('--color-canvas', DEFAULT_THEME.background)
  await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 375, height: 812 },
]) {
  test(`theme panel is usable with keyboard and scrolls on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Customize theme' }).click()
    const panel = page.getByRole('dialog', { name: 'Customize theme' })
    await expect(panel).toBeVisible()
    await panel.getByRole('radio', { name: 'Default theme' }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(panel.getByRole('radio', { name: 'Ocean theme' })).toBeChecked()
    await panel.getByRole('button', { name: 'Reset to default' }).click()
    await expect(panel.getByRole('radio', { name: 'Default theme' })).toBeChecked()
    const box = await panel.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(viewport.width)
    expect(box!.height).toBeLessThanOrEqual(viewport.height)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await panel.getByRole('radio', { name: 'Default theme' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `../outputs/theme-${viewport.name}.png` })
    await page.keyboard.press('Escape')
    await expect(panel).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Customize theme' })).toBeFocused()
  })
}

test('invalid stored data and hex input cannot break the page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('simulation-builder.theme.v1', '{bad json'))
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Customize theme' }).click()
  const panel = page.getByRole('dialog', { name: 'Customize theme' })
  const input = panel.getByRole('textbox', { name: 'Primary hex' })
  await expect(input).toHaveValue('#9929EA')
  await input.fill('#oops')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(panel.getByRole('status').filter({ hasText: 'six-digit' })).toBeVisible()
  await input.press('Tab')
  await expect(input).toHaveValue('#9929EA')
})

test('a dark surface derives a dark canvas and keeps the page heading readable', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Customize theme' }).click()
  const panel = page.getByRole('dialog', { name: 'Customize theme' })
  await panel.getByRole('textbox', { name: 'Surface hex' }).fill('#111827')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  )
})

test('shared brand text contrasts and document paper stays white under custom themes', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Customize theme' }).click()
  const panel = page.getByRole('dialog', { name: 'Customize theme' })
  await panel.getByRole('textbox', { name: 'Primary hex' }).fill('#FFFF00')
  await panel.getByRole('textbox', { name: 'Surface hex' }).fill('#111827')
  await page.keyboard.press('Escape')
  await page.evaluate(() => {
    const paper = document.createElement('article')
    paper.className = 'document-paper'
    paper.dataset.testid = 'theme-paper'
    paper.innerHTML = '<span style="color:#000000">Authored document text</span>'
    const brand = document.createElement('span')
    brand.className = 'text-brand'
    brand.dataset.testid = 'theme-brand-text'
    brand.textContent = 'Brand text'
    document.body.append(paper, brand)
  })
  await expect(page.getByTestId('theme-paper')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.getByText('Authored document text')).toHaveCSS('color', 'rgb(0, 0, 0)')
  await expect(page.getByTestId('theme-brand-text')).toHaveCSS('color', 'rgb(255, 255, 0)')
  await page.getByRole('button', { name: 'Customize theme' }).click()
  await panel.getByRole('textbox', { name: 'Surface hex' }).fill('#FFFFFF')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('theme-brand-text')).not.toHaveCSS('color', 'rgb(255, 255, 0)')
})
