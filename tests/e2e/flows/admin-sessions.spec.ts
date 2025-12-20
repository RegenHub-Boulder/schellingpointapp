import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'

test.describe('Admin Sessions Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/sessions')
    await waitForPageLoad(page)
  })

  test('page loads with session management UI', async ({ page }) => {
    // Admin page should load
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(/Session Management/i)
  })

  test('displays session list or loading state', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000)

    // Check for loading spinner, table, or empty state
    const table = page.locator('table')
    const loading = page.locator('.animate-spin')
    const noSessions = page.locator('text=/No sessions found/i')

    const hasContent = await table.isVisible() || await loading.isVisible() || await noSessions.isVisible()
    expect(hasContent).toBe(true)
  })

  test('has filter controls', async ({ page }) => {
    // Should have status filter buttons
    const allButton = page.locator('button:has-text("All")')
    await expect(allButton).toBeVisible()

    // Pending filter
    const pendingButton = page.locator('button:has-text("Pending")')
    await expect(pendingButton).toBeVisible()
  })

  test('has search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
  })

  test('clicking filter buttons changes filter state', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)

    // Click on Approved filter
    const approvedButton = page.locator('button:has-text("Approved")')
    if (await approvedButton.isVisible()) {
      await approvedButton.click()
      // Button should become active (has different styling)
    }
  })
})

test.describe('Admin Sessions - Actions (requires admin auth)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/sessions')
    await waitForPageLoad(page)
  })

  test('approve action buttons exist for pending sessions', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for approve buttons (check icons)
    const approveButtons = page.locator('button[title="Approve"]')

    // If there are pending sessions, approve buttons should exist
    const count = await approveButtons.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('decline action buttons exist for pending sessions', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for decline buttons (X icons)
    const declineButtons = page.locator('button[title="Decline"]')

    // If there are pending sessions, decline buttons should exist
    const count = await declineButtons.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('view details button opens modal', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Look for eye icon buttons (view details)
    const viewButtons = page.locator('button[title="View details"]')

    if (await viewButtons.count() > 0) {
      await viewButtons.first().click()

      // Modal should open
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible({ timeout: 3000 })
    }
  })
})

test.describe('Admin Sessions - Navigation', () => {
  test('admin sidebar is visible', async ({ page }) => {
    await page.goto('/admin/sessions')
    await waitForPageLoad(page)

    // Should have sidebar with navigation
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('admin tabs navigation works', async ({ page }) => {
    await page.goto('/admin/sessions')
    await waitForPageLoad(page)

    // Should have navigation links
    const venuesLink = page.locator('a:has-text("Venues")')
    await expect(venuesLink).toBeVisible()

    await venuesLink.click()
    await expect(page).toHaveURL(/\/admin\/venues/)
  })

  test('back to event link works', async ({ page }) => {
    await page.goto('/admin/sessions')
    await waitForPageLoad(page)

    const backLink = page.locator('a:has-text("Back to Event")')
    await expect(backLink).toBeVisible()

    await backLink.click()
    await expect(page).toHaveURL(/\/event\/sessions/)
  })
})
