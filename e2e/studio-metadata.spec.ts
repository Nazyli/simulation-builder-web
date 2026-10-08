import { expect, test, type Page } from '@playwright/test'

async function mockStudio(page: Page, options = { hasMaster: false, locked: false }) {
  const state = {
    group: {
      groupSimulationId: 'SIM-001',
      groupSimulationName: 'Coaching',
      groupSimulationDesc: 'Group description',
    },
    simulation: {
      simulationId: 'SIM-001-VER-0001',
      groupSimulationId: 'SIM-001',
      versionName: 1,
      simulationName: 'Main flow',
      simulationDesc: 'Master description',
      channelName: 'chat',
      duration: 60,
      isLocked: options.locked,
      executionCount: options.locked ? 1 : 0,
    },
    hasGroup: options.hasMaster,
    hasMaster: options.hasMaster,
    failCreate: false,
    failUpdate: false,
    masterPosts: 0,
    groupFetchDelay: 0,
  }
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    const method = route.request().method()
    let data: unknown = []
    let status = 200
    if (path === '/admin/studio/group-simulations') {
      if (method === 'POST') {
        state.group = { ...state.group, ...route.request().postDataJSON() }
        state.hasGroup = true
        data = state.group
        status = 201
      } else {
        if (state.groupFetchDelay)
          await new Promise((resolve) => setTimeout(resolve, state.groupFetchDelay))
        data = state.hasGroup
          ? [{ ...state.group, simulations: state.hasMaster ? [state.simulation] : [] }]
          : []
      }
    } else if (path === '/admin/studio/group-simulations/SIM-001') {
      data = { ...state.group, simulations: state.hasMaster ? [state.simulation] : [] }
    } else if (path === '/admin/studio/group-simulations/SIM-001/simulations') {
      if (method === 'POST') {
        state.masterPosts++
        if (state.failCreate) status = 422
        else {
          state.simulation = { ...state.simulation, ...route.request().postDataJSON() }
          state.hasMaster = true
          data = state.simulation
          status = 201
        }
      } else data = state.hasMaster ? [state.simulation] : []
    } else if (path === '/admin/studio/simulations/SIM-001-VER-0001') {
      if (method === 'PUT') {
        if (state.failUpdate) status = 422
        else state.simulation = { ...state.simulation, ...route.request().postDataJSON() }
      }
      data = { ...state.simulation, groupSimulationName: state.group.groupSimulationName }
    } else if (path.endsWith('/graph')) data = { nodes: [], edges: [], visualGroups: [] }
    else if (path.endsWith('/node-catalog')) data = { categories: [], paletteGroups: [], nodes: [] }
    else if (path.includes('/history/executions')) data = { content: [], totalElements: 0 }
    await route.fulfill({
      status,
      json: {
        status: status === 422 ? 'error' : 'success',
        info: { code: status, message: status === 422 ? 'Please try again.' : 'OK' },
        data: status === 422 ? null : data,
      },
    })
  })
  return state
}

test('group creation opens Studio before the master is created, then metadata can be edited', async ({
  page,
}) => {
  const state = await mockStudio(page)
  await page.goto('/studio')
  await page.getByRole('button', { name: 'New simulation' }).click()
  const groupForm = page.getByRole('dialog', { name: 'Create simulation group' })
  await expect(groupForm.getByRole('textbox')).toHaveCount(2)
  await expect(groupForm.getByLabel('Channel Name')).toHaveCount(0)
  await groupForm.getByLabel('Group simulation name').fill('Coaching')
  await groupForm.getByLabel('Description').fill('Group description')
  state.groupFetchDelay = 1000
  await groupForm.getByRole('button', { name: 'Create simulation', exact: true }).click()
  await expect(page).toHaveURL(/\/studio\/groups\/SIM-001$/)
  await expect(page.getByText('Simulation group not found.')).toHaveCount(0)
  const masterForm = page.getByRole('dialog', { name: 'Create master simulation' })
  await expect(masterForm).toBeVisible()
  expect(state.masterPosts).toBe(0)
  await masterForm.getByLabel('Name', { exact: true }).fill('Main flow')
  await masterForm.getByLabel('Description').fill('Master description')
  await masterForm.getByLabel('Channel Name').fill('Coaching room')
  await masterForm.getByLabel('Duration (minutes)').fill('90')
  state.failCreate = true
  await masterForm.getByRole('button', { name: 'Create master simulation', exact: true }).click()
  await expect(masterForm.getByRole('alert')).toContainText('Please try again.')
  await expect(masterForm.getByLabel('Name', { exact: true })).toHaveValue('Main flow')
  state.failCreate = false
  await masterForm.getByRole('button', { name: 'Create master simulation', exact: true }).click()
  await expect(page).toHaveURL(/\/studio\/SIM-001-VER-0001$/)
  await expect(masterForm).not.toBeVisible()
  await page.getByRole('button', { name: 'Edit master simulation', exact: true }).click()
  const editForm = page.getByRole('dialog', { name: 'Edit master simulation' })
  await expect(editForm.getByLabel('Description')).toHaveValue('Master description')
  await expect(editForm.getByLabel('Duration (minutes)')).toHaveValue('90')
  await editForm.getByLabel('Name', { exact: true }).fill('Updated flow')
  await editForm.getByLabel('Description').fill('Updated master')
  await editForm.getByLabel('Channel Name').fill('New room')
  await editForm.getByLabel('Duration (minutes)').fill('30')
  state.failUpdate = true
  await editForm.getByRole('button', { name: 'Save changes' }).click()
  await expect(editForm.getByRole('alert')).toContainText('Please try again.')
  state.failUpdate = false
  await editForm.getByRole('button', { name: 'Save changes' }).click()
  await expect(editForm).not.toBeVisible()
  await expect(page.locator('.studio-top-header').getByRole('combobox')).toContainText(
    'Updated flow',
  )
  expect(state.group.groupSimulationName).toBe('Coaching')
  expect(state.simulation).toMatchObject({
    simulationName: 'Updated flow',
    simulationDesc: 'Updated master',
    channelName: 'New room',
    duration: 30,
  })
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Edit master simulation', exact: true }).click()
  await expect(editForm.getByLabel('Name', { exact: true })).toHaveValue('Updated flow')
})

test('empty group can cancel, reopen, and reload the master form on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await mockStudio(page)
  state.hasGroup = true
  await page.goto('/studio')
  await page.getByRole('button', { name: 'Open builder' }).click()
  const form = page.getByRole('dialog', { name: 'Create master simulation' })
  await expect(form).toBeVisible()
  await form.getByRole('button', { name: 'Cancel' }).click()
  await expect(form).not.toBeVisible()
  expect(state.masterPosts).toBe(0)
  await page.getByRole('button', { name: 'Create master simulation', exact: true }).click()
  await expect(form).toBeVisible()
  const box = await form.boundingBox()
  expect(box!.width).toBeLessThanOrEqual(390)
  expect(box!.height).toBeLessThanOrEqual(844)
  await page.screenshot({ path: '../outputs/studio-master-mobile.png' })
  await page.reload()
  await expect(form).toBeVisible()
})

test('used master keeps metadata editing locked', async ({ page }) => {
  await mockStudio(page, { hasMaster: true, locked: true })
  await page.goto('/studio/SIM-001-VER-0001')
  await expect(
    page.getByRole('button', { name: 'Edit master simulation', exact: true }),
  ).toBeDisabled()
})
