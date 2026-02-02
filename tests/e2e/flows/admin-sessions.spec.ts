import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'
import { navigateAuthenticated } from '../../setup/auth-helpers'

/**
 * Admin Sessions Page Tests
 *
 * Note: /admin/* routes require admin authentication.
 * Alice is an admin user in the seed data.
 */

test.describe('Admin Sessions - Unauthenticated', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin/sessions')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Admin Sessions Page (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Alice is an admin user in seed data
    await navigateAuthenticated(page, '/admin/sessions', 'alice')
  })

  test('page loads with session management UI', async ({ page }) => {
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(/Session Management/i)
  })

  test('displays session list or loading state', async ({ page }) => {
    await page.waitForTimeout(2000)

    const table = page.locator('table')
    const loading = page.locator('.animate-spin')
    const noSessions = page.locator('text=/No sessions found/i')

    const hasContent = await table.isVisible() || await loading.isVisible() || await noSessions.isVisible()
    expect(hasContent).toBe(true)
  })

  test('has filter controls', async ({ page }) => {
    const allButton = page.locator('button:has-text("All")')
    await expect(allButton).toBeVisible()

    const pendingButton = page.locator('button:has-text("Pending")')
    await expect(pendingButton).toBeVisible()
  })

  test('has search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
  })
})

test.describe('Admin Sessions - Navigation (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/admin/sessions', 'alice')
  })

  test('admin sidebar is visible', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('admin tabs navigation works', async ({ page }) => {
    const venuesLink = page.locator('a:has-text("Venues")')
    await expect(venuesLink).toBeVisible()

    await venuesLink.click()
    await expect(page).toHaveURL(/\/admin\/venues/)
  })

  test('back to event link works', async ({ page }) => {
    const backLink = page.locator('a:has-text("Back to Event")')
    await expect(backLink).toBeVisible()

    await backLink.click()
    // Should navigate to event sessions (auth is maintained)
    await expect(page).toHaveURL(/\/event\/sessions/)
  })
})
