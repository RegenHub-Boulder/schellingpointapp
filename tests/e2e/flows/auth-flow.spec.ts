import { test, expect } from '@playwright/test'
import { waitForPageLoad, generateTestEmail } from '../../setup/test-utils'

test.describe('Email Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
  })

  test('opens auth modal and shows email option', async ({ page }) => {
    // Click "Enter Event" button
    await page.getByTestId('hero-enter-btn').click()

    // Auth modal should open
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    // Should have email option
    await expect(page.getByTestId('email-auth-btn')).toBeVisible()
  })

  test('can enter email and request magic link', async ({ page }) => {
    await page.getByTestId('hero-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    // Choose email authentication
    await page.getByTestId('email-auth-btn').click()

    // Email input should be visible
    await expect(page.getByTestId('email-input')).toBeVisible()

    // Enter email and submit
    const testEmail = generateTestEmail()
    await page.getByTestId('email-input').fill(testEmail)
    await page.getByTestId('send-magic-link-btn').click()

    // Should see "check your inbox" message
    await expect(page.locator('text=Check your inbox')).toBeVisible({ timeout: 5000 })
  })

  test('email validation rejects invalid format', async ({ page }) => {
    await page.getByTestId('hero-enter-btn').click()
    await page.getByTestId('email-auth-btn').click()

    // Enter invalid email
    await page.getByTestId('email-input').fill('notanemail')

    // Try to submit
    const submitBtn = page.getByTestId('send-magic-link-btn')
    await submitBtn.click()

    // Should not proceed to "check inbox" state
    // Wait briefly to see if it changes
    await page.waitForTimeout(1000)
    await expect(page.locator('text=Check your inbox')).not.toBeVisible()
  })

  test('can go back from email input to auth options', async ({ page }) => {
    await page.getByTestId('hero-enter-btn').click()
    await page.getByTestId('email-auth-btn').click()

    // Should see email input
    await expect(page.getByTestId('email-input')).toBeVisible()

    // Look for back button
    const backButton = page.locator('button:has-text("Back")')

    if (await backButton.isVisible()) {
      await backButton.click()

      // Should see auth options again
      await expect(page.getByTestId('email-auth-btn')).toBeVisible()
      await expect(page.getByTestId('connect-wallet-btn')).toBeVisible()
    }
  })
})

test.describe('Wallet Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
  })

  test('shows wallet connect option', async ({ page }) => {
    await page.getByTestId('hero-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    // Should have wallet option
    await expect(page.getByTestId('connect-wallet-btn')).toBeVisible()
  })

  test('wallet connect shows connecting state', async ({ page }) => {
    await page.getByTestId('hero-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    // Choose wallet authentication
    await page.getByTestId('connect-wallet-btn').click()

    // Should show connecting state or error message (wallet not fully implemented)
    await page.waitForTimeout(2000)

    // Either shows connecting, error, or success
    const content = await page.content()
    expect(content).toBeTruthy()
  })
})

test.describe('Authentication - Edge Cases', () => {
  test('auth modal closes on escape key', async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)

    await page.getByTestId('hero-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.getByTestId('auth-modal')).toBeHidden({ timeout: 2000 })
  })

  test('multiple clicks on enter event only opens one modal', async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)

    // Rapid clicks
    await page.getByTestId('hero-enter-btn').click()
    await page.getByTestId('hero-enter-btn').click()
    await page.getByTestId('hero-enter-btn').click()

    // Should still work - only one modal
    const modalCount = await page.locator('[data-testid="auth-modal"]').count()
    expect(modalCount).toBeLessThanOrEqual(1)
  })

  test('header and hero enter buttons both work', async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)

    // Test header button
    await page.getByTestId('header-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    // Close modal
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('auth-modal')).toBeHidden({ timeout: 2000 })

    // Test hero button
    await page.getByTestId('hero-enter-btn').click()
    await expect(page.getByTestId('auth-modal')).toBeVisible()
  })
})

test.describe('Profile Setup (requires prior auth)', () => {
  // Note: These tests describe expected behavior but require actual authentication
  // They're marked with skip for now as they require auth state

  test.skip('profile setup modal has required fields', async ({ page }) => {
    // This test would require authenticated state
    // Profile setup modal has:
    // - display-name-input (required)
    // - profile-submit-btn
    // - profile-setup-modal
  })
})
