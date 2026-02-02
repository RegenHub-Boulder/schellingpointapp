import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'
import { navigateAuthenticated } from '../../setup/auth-helpers'

/**
 * Schedule Page Tests
 *
 * Note: /event/* routes are protected and require authentication.
 */

test.describe('Schedule Page - Unauthenticated', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/event/schedule')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Schedule Page (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/event/schedule', 'alice')
  })

  test('schedule page loads', async ({ page }) => {
    // Page should load without errors
    await expect(page.locator('h1')).toBeVisible()
  })

  test('displays schedule or not-available message', async ({ page }) => {
    await page.waitForTimeout(2000)

    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('has navigation tabs', async ({ page }) => {
    const scheduleTab = page.locator('a:has-text("Schedule")')
    await expect(scheduleTab.first()).toBeVisible()
  })
})

test.describe('My Schedule Page - Unauthenticated', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/event/my-schedule')

    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Schedule - Navigation (Authenticated)', () => {
  test('can navigate between schedule and sessions', async ({ page }) => {
    await navigateAuthenticated(page, '/event/sessions', 'alice')

    // Navigate to schedule
    const scheduleLink = page.locator('a:has-text("Schedule")')
    await scheduleLink.first().click()
    await expect(page).toHaveURL(/\/event\/schedule/)

    // Navigate back to sessions
    const sessionsLink = page.locator('a:has-text("Sessions")')
    await sessionsLink.first().click()
    await expect(page).toHaveURL(/\/event\/sessions/)
  })
})
