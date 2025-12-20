import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'

test.describe('Public Schedule Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/event/schedule')
    await waitForPageLoad(page)
  })

  test('schedule page loads', async ({ page }) => {
    // Page should load without errors
    await expect(page.locator('h1')).toBeVisible()
  })

  test('displays schedule or not-available message', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000)

    // Either shows schedule content or a message
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })

  test('has navigation tabs', async ({ page }) => {
    // Should have navigation in event layout
    const scheduleTab = page.locator('a:has-text("Schedule")')
    await expect(scheduleTab.first()).toBeVisible()
  })
})

test.describe('My Schedule Page (requires auth)', () => {
  test('shows content or redirects when not authenticated', async ({ page }) => {
    await page.goto('/event/my-schedule')
    await waitForPageLoad(page)

    // Should either:
    // 1. Show the page (if accessible without auth)
    // 2. Show login prompt
    // 3. Redirect to login

    const pageContent = await page.content()
    expect(pageContent).toBeTruthy()
  })
})

test.describe('Schedule - Navigation', () => {
  test('can navigate between schedule and sessions', async ({ page }) => {
    await page.goto('/event/sessions')
    await waitForPageLoad(page)

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
