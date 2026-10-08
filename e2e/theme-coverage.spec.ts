import { expect, test, type Page } from '@playwright/test'

async function chooseTheme(page: Page, name: string) {
  await page.getByRole('button', { name: 'Customize theme' }).click()
  await page.getByRole('radio', { name: `${name} theme` }).check()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Customize theme' })).not.toBeVisible()
}

const input = {
  id: 'input',
  label: 'Input',
  description: '',
  acceptedDataTypes: ['any'],
  maxConnections: 1,
}
const output = {
  id: 'started',
  label: 'Started',
  description: '',
  dataSchema: {},
  dataType: 'any',
  maxConnections: 1,
  edgeStyle: { color: '#64748b', lineStyle: 'solid', animated: false },
}
const definitions = ['start', 'end'].map((nodeType) => ({
  nodeType,
  category: nodeType === 'start' ? 'trigger' : 'terminal',
  label: nodeType === 'start' ? 'Start' : 'End',
  icon: 'Play',
  color: '#64748b',
  description: '',
  paletteGroups: ['flow'],
  paletteParameters: {},
  inputPorts: nodeType === 'start' ? [] : [input],
  outputPorts: nodeType === 'start' ? [output] : [],
  parameters: {},
  validationRules: {},
}))
const graph = {
  nodes: definitions.map((definition, index) => ({
    nodeId: `node-${index}`,
    nodeName: definition.label,
    nodeType: definition.nodeType,
    category: definition.category,
    parameters: {},
    positionX: index * 400,
    positionY: 50,
    rotation: 0,
    inputPorts: definition.inputPorts,
    outputPorts: definition.outputPorts,
  })),
  edges: [
    {
      edgeId: 'edge-1',
      sourceNodeId: 'node-0',
      sourcePortId: 'started',
      targetNodeId: 'node-1',
      targetPortId: 'input',
      isValid: true,
    },
  ],
  visualGroups: [],
}
const simulation = {
  simulationId: 'theme-simulation',
  groupSimulationId: 'theme-group',
  groupSimulationName: 'Theme workflow',
  versionName: 1,
  simulationName: 'Theme version',
  simulationDesc: null,
  channelName: 'chat',
  duration: 60,
  isLocked: false,
}
const execution = {
  executionId: 'theme-execution',
  participantId: '94839',
  participantFullName: 'Theme participant',
  sessionId: 'theme-session',
  simulationId: simulation.simulationId,
  groupSimulationName: simulation.groupSimulationName,
  simulationName: simulation.simulationName,
  status: 'waiting',
  currentNodeId: 'node-1',
  startedAt: '2026-10-07T00:00:00Z',
  completedAt: null,
}

async function mockWorkflow(page: Page) {
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path.endsWith('/node-catalog'))
      data = {
        categories: [
          { id: 'trigger', label: 'Trigger' },
          { id: 'terminal', label: 'Terminal' },
        ],
        paletteGroups: [{ id: 'flow', label: 'Flow' }],
        nodes: definitions,
      }
    else if (path.endsWith('/graph')) data = graph
    else if (path.endsWith('/history/executions'))
      data = { content: [execution], number: 0, size: 10, totalElements: 1, totalPages: 1 }
    else if (path.endsWith('/node-executions'))
      data = [
        {
          nodeExecutionId: 'node-run-0',
          nodeId: 'node-0',
          status: 'completed',
          selectedPort: 'started',
          selectedEdgeId: 'edge-1',
          sequenceNumber: 1,
          outputData: {},
        },
        {
          nodeExecutionId: 'node-run-1',
          nodeId: 'node-1',
          status: 'waiting',
          selectedPort: null,
          selectedEdgeId: null,
          sequenceNumber: 2,
          outputData: {},
        },
      ]
    else if (path.endsWith('/group-simulations'))
      data = [
        {
          groupSimulationId: simulation.groupSimulationId,
          groupSimulationName: simulation.groupSimulationName,
          simulations: [simulation],
        },
      ]
    else if (path.endsWith('/theme-simulation')) data = simulation
    else if (path.endsWith('/group-simulations/theme-group'))
      data = {
        groupSimulationId: simulation.groupSimulationId,
        groupSimulationName: simulation.groupSimulationName,
        simulations: [simulation],
      }
    else if (path.endsWith('/theme-group/simulations')) data = [simulation]
    else if (path.endsWith('/master-data/actors'))
      data = {
        content: [
          {
            actorId: 'theme-actor',
            actorName: 'Theme actor',
            actorEmail: 'theme@example.test',
            actorPosition: 'Manager',
            isParticipant: false,
            personaDesc: null,
          },
        ],
        number: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        last: true,
      }
    return route.fulfill({ json: { status: 'success', data } })
  })
}

test('documentation navigation and article links follow live presets', async ({ page }) => {
  await page.goto('/documentation/00-index')
  const link = page.locator('.documentation-article a').first()
  await expect(link).toBeVisible()
  const original = await link.evaluate((element) => getComputedStyle(element).color)
  await chooseTheme(page, 'Teal')
  await expect(link).not.toHaveCSS('color', original)
  const active = page
    .getByRole('navigation', { name: 'Documentation sections' })
    .filter({ visible: true })
    .locator('a[aria-current="page"]')
  await expect(active).toHaveCSS('background-color', 'rgb(231, 244, 243)')
  await page.screenshot({ path: '../outputs/theme-documentation-teal.png' })
  await chooseTheme(page, 'Ocean')
  await expect(active).not.toHaveCSS('background-color', 'rgb(231, 244, 243)')
  await page.getByRole('button', { name: 'Customize theme' }).click()
  await page.getByRole('textbox', { name: 'Surface hex' }).fill('#111827')
  await page.keyboard.press('Escape')
  await expect(page.locator('.documentation-article th').first()).not.toHaveCSS(
    'background-color',
    'rgb(248, 250, 252)',
  )
})

test('history path, markers, labels, and minimap selection follow the preset live', async ({
  page,
}) => {
  await mockWorkflow(page)
  await page.goto('/history/theme-execution?tab=flow')
  const path = page.locator('.history-edge-participant').first()
  await expect(path).toBeAttached()
  await chooseTheme(page, 'Teal')
  await expect(path).toHaveCSS('stroke', 'rgb(13, 148, 136)')
  await expect(page.locator('.history-legend-line--path')).toHaveCSS(
    'border-top-color',
    'rgb(13, 148, 136)',
  )
  await expect(page.locator('.history-path-traveling-dot circle')).toHaveCSS(
    'fill',
    'rgb(13, 148, 136)',
  )
  await expect(page.locator('.history-node-current--active')).toHaveCSS(
    'outline-color',
    'rgb(13, 148, 136)',
  )
  await page.screenshot({ path: '../outputs/theme-history-teal.png' })
  await chooseTheme(page, 'Ocean')
  await expect(path).toHaveCSS('stroke', 'rgb(37, 99, 235)')
})

test('Studio palette accent follows the theme and table Flow/Edit actions stay neutral', async ({
  page,
}) => {
  await mockWorkflow(page)
  await page.goto('/studio')
  const openBuilder = page.getByRole('button', { name: 'Open builder' }).first()
  await expect(openBuilder).toBeVisible()
  const originalBuilder = await openBuilder.evaluate((element) => getComputedStyle(element).color)
  await chooseTheme(page, 'Teal')
  await expect(openBuilder).not.toHaveCSS('color', originalBuilder)
  await page.screenshot({ path: '../outputs/theme-studio-list-teal.png' })
  await page.goto('/studio/theme-group?simulation=theme-simulation')
  const paletteIcon = page.locator('.studio-left-sidebar h2 svg').first()
  await expect(paletteIcon).toBeVisible()
  const original = await paletteIcon.evaluate((element) => getComputedStyle(element).color)
  await chooseTheme(page, 'Ocean')
  await expect(paletteIcon).not.toHaveCSS('color', original)
  await chooseTheme(page, 'Teal')
  await page.screenshot({ path: '../outputs/theme-studio-teal.png' })
  await page.goto('/history')
  const flow = page.getByRole('button', { name: 'Flow', exact: true }).first()
  await expect(flow).toBeVisible()
  const flowColor = await flow.evaluate((element) => getComputedStyle(element).color)
  await chooseTheme(page, 'Rose')
  await expect(flow).toHaveCSS('color', flowColor)
  await page.goto('/master-data/actors')
  const edit = page.getByRole('button', { name: 'Edit Theme actor' })
  await expect(edit).toBeVisible()
  const editColor = await edit.evaluate((element) => getComputedStyle(element).color)
  await chooseTheme(page, 'Teal')
  await expect(edit).toHaveCSS('color', editColor)
  await expect(edit).toHaveCSS('color', flowColor)
})
