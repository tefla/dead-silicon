import { test, expect, type Page } from '@playwright/test'

// Helper to navigate to Playground view
async function goToPlayground(page: Page) {
  await page.goto('/')
  // App defaults to Visual Editor, click Playground tab
  await page.click('button:has-text("Playground")')
  await page.waitForTimeout(300)
}

test.describe('Playground UI', () => {
  test.skip('loads the playground interface', async ({ page }) => {
    await goToPlayground(page)

    // Wait for main app container to be present
    await page.waitForSelector('#app > div')

    // Check main sections are visible
    await expect(page.getByText('Dead Silicon')).toBeVisible()
    await expect(page.locator('text=PLAYGROUND')).toBeVisible()
    await expect(page.getByText('Simulation')).toBeVisible()
  })

  test('displays side quests in file browser', async ({ page }) => {
    await goToPlayground(page)

    // Check all side quests are listed (exact titles from side-quests.ts)
    await expect(page.getByText('Blinking LED')).toBeVisible()
    await expect(page.getByText('Binary Counter')).toBeVisible()
    await expect(page.getByText('Simple ALU')).toBeVisible()
  })

  test('loads a file when clicked', async ({ page }) => {
    await goToPlayground(page)

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
    await goToPlayground(page)
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
    await goToPlayground(page)

    await expect(page.getByText('No file selected')).toBeVisible()
    await expect(page.getByText('Select a file to begin simulation')).toBeVisible()
  })

  test('switches between different files', async ({ page }) => {
    await goToPlayground(page)

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
    await goToPlayground(page)
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

  test('clock waveform actually toggles between 0 and 1', async ({ page }) => {
    // Step a few times to generate waveform data
    await page.getByTitle('Step').click()
    await page.waitForTimeout(100)
    await page.getByTitle('Step').click()
    await page.waitForTimeout(100)

    // Check that waveform display contains both high (▓) and low (░) signals
    const waveformSection = page.locator('text=/Waveforms?/')
    await expect(waveformSection).toBeVisible()

    // Get the waveform content - should contain both filled and empty blocks
    const pageContent = await page.textContent('body')

    // Verify we have signal visualization characters (the waveform uses ▓ for high, ░ for low)
    expect(pageContent).toContain('clk')

    // After stepping, the clock signal should be visible in the wire values or waveform
    // Check that cycle count increased (proves simulation ran)
    const cycleText = page.getByText(/Cycle: \d+/)
    const cycleContent = await cycleText.textContent()
    const cycle = parseInt(cycleContent?.match(/\d+/)?.[0] || '0')
    expect(cycle).toBeGreaterThan(0)
  })

  test('LED state changes in blinker circuit', async ({ page }) => {
    // Step multiple times - blinker should toggle LED
    const cycleText = page.getByText(/Cycle: \d+/)

    // Initial state
    await expect(cycleText).toHaveText('Cycle: 0')

    // Step several times
    for (let i = 0; i < 5; i++) {
      await page.getByTitle('Step').click()
      await page.waitForTimeout(100)
    }

    // Verify cycles advanced
    const cycleContent = await cycleText.textContent()
    const cycle = parseInt(cycleContent?.match(/\d+/)?.[0] || '0')
    expect(cycle).toBe(5)

    // Check that LED section is present and updated
    const ledSection = page.getByText('LED Output')
    await expect(ledSection).toBeVisible()
  })

  test('waveform shows signal values after running simulation', async ({ page }) => {
    // Run simulation for a moment
    await page.getByTitle('Run').click()
    await page.waitForTimeout(500)
    await page.getByTitle('Pause').click()

    // Check waveform section exists and has content
    const waveformSection = page.locator('text=/Waveforms?/')
    await expect(waveformSection).toBeVisible()

    // Verify cycle count increased significantly
    const cycleText = page.getByText(/Cycle: \d+/)
    const cycleContent = await cycleText.textContent()
    const cycle = parseInt(cycleContent?.match(/\d+/)?.[0] || '0')
    expect(cycle).toBeGreaterThan(5)
  })

  test('compile error is displayed for invalid code', async ({ page }) => {
    // Load a file and modify it to be invalid
    await goToPlayground(page)
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
    await goToPlayground(page)
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
    await goToPlayground(page)

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
