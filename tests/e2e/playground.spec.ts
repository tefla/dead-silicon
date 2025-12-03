import { test, expect } from '@playwright/test'

test.describe('Playground UI', () => {
  test.skip('loads the playground interface', async ({ page }) => {
    await page.goto('/')

    // Wait for main app container to be present
    await page.waitForSelector('#app > div')

    // Check main sections are visible
    await expect(page.getByText('Dead Silicon')).toBeVisible()
    await expect(page.locator('text=PLAYGROUND')).toBeVisible()
    await expect(page.getByText('Simulation')).toBeVisible()
  })

  test('displays side quests in file browser', async ({ page }) => {
    await page.goto('/')

    // Check all side quests are listed (exact titles from side-quests.ts)
    await expect(page.getByText('Blinking LED')).toBeVisible()
    await expect(page.getByText('Binary Counter')).toBeVisible()
    await expect(page.getByText('Simple ALU')).toBeVisible()
  })

  test('loads a file when clicked', async ({ page }) => {
    await page.goto('/')

    // Click on blinker file
    await page.getByText('blinker.wire').first().click()

    // Wait for Monaco editor to load
    await page.waitForTimeout(1500)

    // Check Monaco editor is visible
    const editor = page.locator('.monaco-editor')
    await expect(editor).toBeVisible()

    // Check editor has content (view-lines)
    const viewLines = page.locator('.view-lines')
    await expect(viewLines).toBeVisible()
  })

  test('displays simulation controls', async ({ page }) => {
    await page.goto('/')
    await page.getByText('blinker.wire').click()
    await page.waitForTimeout(500)

    // Check all control buttons are present
    await expect(page.getByTitle('Run')).toBeVisible()
    await expect(page.getByTitle('Pause')).toBeVisible()
    await expect(page.getByTitle('Step')).toBeVisible()
    await expect(page.getByTitle('Reset')).toBeVisible()

    // Check speed slider
    await expect(page.locator('input[type="range"]')).toBeVisible()
  })

  test('shows no file selected message initially', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('No file selected')).toBeVisible()
    await expect(page.getByText('Select a file to begin simulation')).toBeVisible()
  })

  test('switches between different files', async ({ page }) => {
    await page.goto('/')

    // Load blinker
    await page.getByText('blinker.wire').first().click()
    await page.waitForTimeout(1000)

    // Check Monaco editor loaded
    const editor1 = page.locator('.monaco-editor')
    await expect(editor1).toBeVisible()

    // Load counter
    await page.getByText('counter.wire').first().click()
    await page.waitForTimeout(1000)

    // Check editor still visible (now with different content)
    const editor2 = page.locator('.monaco-editor')
    await expect(editor2).toBeVisible()
  })
})

test.describe('Simulation Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByText('blinker.wire').first().click()
    await page.waitForTimeout(1500)
  })

  test('step button advances simulation by one cycle', async ({ page }) => {
    // Check initial cycle count
    const cycleText = page.getByText(/Cycle: \d+/)
    await expect(cycleText).toHaveText('Cycle: 0')

    // Click step button
    await page.getByTitle('Step').click()
    await page.waitForTimeout(100)

    // Check cycle incremented
    await expect(cycleText).toHaveText('Cycle: 1')

    // Step again
    await page.getByTitle('Step').click()
    await page.waitForTimeout(100)
    await expect(cycleText).toHaveText('Cycle: 2')
  })

  test('run button starts simulation', async ({ page }) => {
    const cycleText = page.getByText(/Cycle: \d+/)

    // Initial cycle should be 0
    await expect(cycleText).toHaveText('Cycle: 0')

    // Click run button
    await page.getByTitle('Run').click()

    // Wait a bit and check cycle count increased
    await page.waitForTimeout(500)
    const cycleContent = await cycleText.textContent()
    const cycle = parseInt(cycleContent?.match(/\d+/)?.[0] || '0')
    expect(cycle).toBeGreaterThan(0)
  })

  test('pause button stops simulation', async ({ page }) => {
    const cycleText = page.getByText(/Cycle: \d+/)

    // Start simulation
    await page.getByTitle('Run').click()
    await page.waitForTimeout(500)

    // Pause simulation
    await page.getByTitle('Pause').click()

    // Get current cycle
    const cycleContent1 = await cycleText.textContent()
    const cycle1 = parseInt(cycleContent1?.match(/\d+/)?.[0] || '0')

    // Wait a bit and verify cycle doesn't change
    await page.waitForTimeout(500)
    const cycleContent2 = await cycleText.textContent()
    const cycle2 = parseInt(cycleContent2?.match(/\d+/)?.[0] || '0')

    expect(cycle2).toBe(cycle1)
  })

  test('reset button resets simulation to cycle 0', async ({ page }) => {
    const cycleText = page.getByText(/Cycle: \d+/)

    // Step a few times
    await page.getByTitle('Step').click()
    await page.waitForTimeout(100)
    await page.getByTitle('Step').click()
    await page.waitForTimeout(100)
    await page.getByTitle('Step').click()
    await page.waitForTimeout(100)

    // Verify cycle is not 0
    const cycleContent = await cycleText.textContent()
    const cycle = parseInt(cycleContent?.match(/\d+/)?.[0] || '0')
    expect(cycle).toBeGreaterThan(0)

    // Reset
    await page.getByTitle('Reset').click()
    await page.waitForTimeout(100)

    // Check cycle is back to 0
    await expect(cycleText).toHaveText('Cycle: 0')
  })

  test('speed slider adjusts simulation speed', async ({ page }) => {
    const speedSlider = page.locator('input[type="range"]')
    const speedDisplay = page.getByText(/\d+x/)

    // Check initial speed
    await expect(speedDisplay).toHaveText('1x')

    // Adjust speed to 50
    await speedSlider.fill('50')
    await page.waitForTimeout(100)
    await expect(speedDisplay).toHaveText('50x')

    // Adjust speed to 100
    await speedSlider.fill('100')
    await page.waitForTimeout(100)
    await expect(speedDisplay).toHaveText('100x')
  })

  test('displays waveform data after stepping', async ({ page }) => {
    // Step once to generate waveform data
    await page.getByTitle('Step').click()
    await page.waitForTimeout(200)

    // Check for waveform text
    const waveformSection = page.locator('text=/Waveforms/')
    await expect(waveformSection).toBeVisible()
  })

  test('displays LED output', async ({ page }) => {
    // Step once
    await page.getByTitle('Step').click()
    await page.waitForTimeout(200)

    // Check for LED output section
    const ledSection = page.getByText('LED Output')
    await expect(ledSection).toBeVisible()

    // Check LED indicator exists (circular div)
    const ledIndicator = page.locator('div').filter({ hasText: 'LED Output' }).locator('div.rounded-full').first()
    await expect(ledIndicator).toBeVisible()
  })

  test('compile error is displayed for invalid code', async ({ page }) => {
    // Load a file and modify it to be invalid
    await page.goto('/')
    await page.getByText('blinker.wire').click()
    await page.waitForTimeout(1500)

    // Click in Monaco editor
    const editor = page.locator('.monaco-editor').first()
    await editor.click()

    // Clear and type invalid code
    await page.keyboard.press('Control+A')
    await page.keyboard.type('invalid syntax!!!')

    // Wait for editor to update
    await page.waitForTimeout(1000)

    // Try to step - this will trigger compilation
    await page.getByTitle('Step').click()

    // Wait a moment for error to appear
    await page.waitForTimeout(500)

    // Check that an error is displayed (red background with error border)
    const errorDiv = page.locator('.bg-red-900\\/20')
    await expect(errorDiv).toBeVisible()
  })
})

test.describe('Monaco Editor', () => {
  test('monaco editor loads with syntax highlighting', async ({ page }) => {
    await page.goto('/')
    await page.getByText('blinker.wire').click()
    await page.waitForTimeout(1500)

    // Check Monaco editor is present
    const editor = page.locator('.monaco-editor')
    await expect(editor).toBeVisible()

    // Check for syntax highlighting elements (Monaco adds specific classes)
    const lines = page.locator('.view-lines')
    await expect(lines).toBeVisible()
  })

  test('editor shows correct file extension badge', async ({ page }) => {
    await page.goto('/')

    // Load Wire file
    await page.getByText('blinker.wire').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=wire').first()).toBeVisible()

    // Load another Wire file
    await page.getByText('counter.wire').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=wire').first()).toBeVisible()
  })
})
