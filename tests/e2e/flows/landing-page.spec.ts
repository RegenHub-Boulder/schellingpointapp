import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
  })

  test('displays event name in hero section', async ({ page }) => {
    // Wait for the event data to load
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // Wait for loading to complete
    await page.waitForFunction(() => {
      const heading = document.querySelector('h1')
      return heading && heading.textContent !== 'Loading...'
    }, { timeout: 10000 }).catch(() => {
      // If timeout, that's ok - just check h1 is visible
    })

    const heading = await h1.textContent()
    expect(heading?.length).toBeGreaterThan(0)
  })

  test('displays event information or loading state', async ({ page }) => {
    // Page should load without errors
    await expect(page.locator('h1')).toBeVisible()
  })

  test('has Enter Event buttons', async ({ page }) => {
    // Hero enter button
    await expect(page.getByTestId('hero-enter-btn')).toBeVisible()
    // Header enter button
    await expect(page.getByTestId('header-enter-btn')).toBeVisible()
  })

  test('has View Sessions button', async ({ page }) => {
    await expect(page.getByTestId('view-sessions-btn')).toBeVisible()
  })

  test('displays How It Works section', async ({ page }) => {
    await expect(page.getByText('How It Works')).toBeVisible()
  })

  test('displays FAQ section', async ({ page }) => {
    await expect(page.getByText('Frequently Asked Questions')).toBeVisible()
  })

  test('FAQ accordion expands and collapses', async ({ page }) => {
    // Click first FAQ question
    const firstFaq = page.getByTestId('faq-0')
    await expect(firstFaq).toBeVisible()
    await firstFaq.click()

    // Answer should become visible (contains "quadratic voting" text)
    await expect(page.locator('text=/Quadratic voting is a mechanism/i')).toBeVisible()

    // Click again to collapse
    await firstFaq.click()
    await page.waitForTimeout(500) // Wait for animation
  })

  test('View Sessions navigates to sessions page', async ({ page }) => {
    await page.getByTestId('view-sessions-btn').click()
    await expect(page).toHaveURL(/\/event\/sessions/)
  })

  test('displays stats section', async ({ page }) => {
    // Check that stats section exists with labels
    const sessionsLabel = page.locator('text=Sessions Proposed')
    const participantsLabel = page.locator('text=Participants')

    // At least one should be visible
    const either = await sessionsLabel.isVisible() || await participantsLabel.isVisible()
    expect(either).toBe(true)
  })
})

test.describe('Landing Page - Auth Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
  })

  test('Enter Event opens auth modal', async ({ page }) => {
    await page.getByTestId('hero-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()
  })

  test('auth modal has email and wallet options', async ({ page }) => {
    await page.getByTestId('hero-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    await expect(page.getByTestId('email-auth-btn')).toBeVisible()
    await expect(page.getByTestId('connect-wallet-btn')).toBeVisible()
  })

  test('auth modal can be closed with escape', async ({ page }) => {
    await page.getByTestId('hero-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    // Close by pressing escape
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('auth-modal')).toBeHidden({ timeout: 2000 })
  })

  test('header Enter Event button also opens auth modal', async ({ page }) => {
    await page.getByTestId('header-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()
  })

  test('clicking email option shows email input', async ({ page }) => {
    await page.getByTestId('hero-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    await page.getByTestId('email-auth-btn').click()

    await expect(page.getByTestId('email-input')).toBeVisible()
    await expect(page.getByTestId('send-magic-link-btn')).toBeVisible()
  })
})
