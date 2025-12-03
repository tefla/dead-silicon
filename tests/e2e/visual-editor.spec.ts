import { test, expect } from '@playwright/test'

test.describe('Visual Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('displays visual editor by default', async ({ page }) => {
    // Check that Visual Editor tab is active
    await expect(page.locator('button:has-text("Visual Editor")')).toHaveClass(/bg-vscode-accent/)

    // Check component palette is visible
    await expect(page.locator('text=I/O')).toBeVisible()
    await expect(page.locator('text=PRIMITIVES')).toBeVisible()
    await expect(page.locator('text=LOGIC GATES')).toBeVisible()

    // Check demo circuit nodes are visible
    await expect(page.locator('text=INPUT').first()).toBeVisible()
    await expect(page.locator('text=OUTPUT').first()).toBeVisible()
  })

  test('can toggle input value by clicking', async ({ page }) => {
    // Find the input toggle button (shows 0 initially)
    const inputButton = page.locator('.react-flow__node-input button:has-text("0")')
    await expect(inputButton).toBeVisible()

    // Click to toggle
    await inputButton.click()
    await page.waitForTimeout(200)

    // Should now show 1
    const toggledButton = page.locator('.react-flow__node-input button:has-text("1")')
    await expect(toggledButton).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: '/tmp/visual-editor-toggled.png' })
  })

  test('can drag component from palette to canvas', async ({ page }) => {
    // Get the AND gate from palette (use exact match to avoid NAND)
    const andGate = page.getByText('AND', { exact: true })
    await expect(andGate).toBeVisible()

    // Get the canvas
    const canvas = page.locator('.react-flow')

    // Drag AND gate to canvas
    await andGate.dragTo(canvas, {
      targetPosition: { x: 400, y: 300 }
    })

    await page.waitForTimeout(500)

    // Take screenshot to verify
    await page.screenshot({ path: '/tmp/visual-editor-after-drag.png' })
  })

  test('step button advances simulation', async ({ page }) => {
    // Check initial cycle count
    await expect(page.locator('text=Cycle: 0')).toBeVisible()

    // Click step
    await page.click('button:has-text("Step")')
    await page.waitForTimeout(200)

    // Cycle should advance
    await expect(page.locator('text=Cycle: 1')).toBeVisible()
  })

  test('reset button resets simulation', async ({ page }) => {
    // Step a few times
    await page.click('button:has-text("Step")')
    await page.click('button:has-text("Step")')
    await expect(page.locator('text=Cycle: 2')).toBeVisible()

    // Reset
    await page.click('button:has-text("Reset")')
    await page.waitForTimeout(200)

    // Should be back to 0
    await expect(page.locator('text=Cycle: 0')).toBeVisible()
  })
})
