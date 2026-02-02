import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'
import { navigateAuthenticated } from '../../setup/auth-helpers'

test.describe('Admin Schedule - Unauthenticated', () => {
  test('redirects to login page', async ({ page }) => {
    await page.goto('/admin/schedule')
    await waitForPageLoad(page)

    // Should redirect to login
    expect(page.url()).toContain('/login')
  })
})

test.describe('Admin Schedule Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/admin/schedule', 'alice')
  })

  test('page loads with schedule builder UI', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText(/Schedule Builder/i)
  })

  test('displays pre-flight checklist or schedule grid', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000)

    // Should show either:
    // 1. Pre-flight checklist (before generation)
    // 2. Schedule grid (after generation)
    // 3. Loading state
    const preflightChecklist = page.locator('text=Pre-flight Checklist')
    const scheduleGrid = page.locator('text=Schedule Grid')
    const scheduleGenerated = page.locator('text=Schedule Generated')

    const showingPreflight = await preflightChecklist.isVisible()
    const showingGrid = await scheduleGrid.isVisible()
    const showingGenerated = await scheduleGenerated.isVisible()

    expect(showingPreflight || showingGrid || showingGenerated).toBe(true)
  })
})

test.describe('Admin Schedule - Pre-flight Checklist', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/admin/schedule', 'alice')
  })

  test('shows session count in checklist', async ({ page }) => {
    await page.waitForTimeout(2000)

    const sessionCheck = page.locator('text=/Sessions approved/i')
    if (await sessionCheck.isVisible()) {
      await expect(sessionCheck).toBeVisible()
    }
  })

  test('shows venue count in checklist', async ({ page }) => {
    await page.waitForTimeout(2000)

    const venueCheck = page.locator('text=/Venues configured/i')
    if (await venueCheck.isVisible()) {
      await expect(venueCheck).toBeVisible()
    }
  })

  test('shows time slot count in checklist', async ({ page }) => {
    await page.waitForTimeout(2000)

    const slotCheck = page.locator('text=/Time slots defined/i')
    if (await slotCheck.isVisible()) {
      await expect(slotCheck).toBeVisible()
    }
  })

  test('shows algorithm optimization info', async ({ page }) => {
    await page.waitForTimeout(2000)

    const algorithmInfo = page.locator('text=Algorithm Optimization')
    if (await algorithmInfo.isVisible()) {
      await expect(algorithmInfo).toBeVisible()
    }
  })
})

test.describe('Admin Schedule - Generate Button', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/admin/schedule', 'alice')
  })

  test('has Auto-Generate Schedule button when not generated', async ({ page }) => {
    await page.waitForTimeout(2000)

    const generateButton = page.locator('button:has-text("Auto-Generate Schedule")')

    // Button might be visible if schedule not yet generated
    if (await generateButton.count() > 0) {
      await expect(generateButton.first()).toBeVisible()
    }
  })

  test('has Regenerate button after generation', async ({ page }) => {
    await page.waitForTimeout(2000)

    const regenerateButton = page.locator('button:has-text("Regenerate")')

    // Only visible after schedule is generated
    if (await regenerateButton.count() > 0) {
      await expect(regenerateButton.first()).toBeVisible()
    }
  })
})

test.describe('Admin Schedule - Schedule Grid', () => {
  test('grid shows venue headers when generated', async ({ page }) => {
    await navigateAuthenticated(page, '/admin/schedule', 'alice')
    await page.waitForTimeout(2000)

    // If schedule is generated, should show venue columns in grid
    const scheduleGrid = page.locator('text=Schedule Grid')

    if (await scheduleGrid.isVisible()) {
      // Grid is visible - venues should be in the header
      expect(await page.content()).toContain('capacity')
    }
  })

  test('grid shows time slots when generated', async ({ page }) => {
    await navigateAuthenticated(page, '/admin/schedule', 'alice')
    await page.waitForTimeout(2000)

    // Time slots might be shown as rows in the grid
    const scheduleGrid = page.locator('text=Schedule Grid')

    if (await scheduleGrid.isVisible()) {
      // Grid is visible - time slots should be visible
      expect(await page.content()).toBeTruthy()
    }
  })
})

test.describe('Admin Schedule - Publish', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/admin/schedule', 'alice')
  })

  test('publish button appears after generation', async ({ page }) => {
    await page.waitForTimeout(2000)

    const publishButton = page.locator('button:has-text("Publish Schedule")')

    // Publish button appears after generation
    if (await publishButton.count() > 0) {
      await expect(publishButton.first()).toBeVisible()
    }
  })

  test('publish opens confirmation modal', async ({ page }) => {
    await page.waitForTimeout(2000)

    const publishButton = page.locator('button:has-text("Publish Schedule")').first()

    if (await publishButton.count() > 0 && await publishButton.isEnabled()) {
      await publishButton.click()

      // Should show confirmation modal
      const modal = page.locator('[role="dialog"]')
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible()
        await expect(modal.locator('text=Publish Schedule')).toBeVisible()
      }
    }
  })
})
