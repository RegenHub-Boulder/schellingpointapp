import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('complete user flow: landing → auth → profile → onboarding → sessions', async ({ page }) => {
    // 1. Navigate to landing page
    await page.goto('/')

    // Verify landing page elements
    await expect(page.locator('h1')).toContainText('Web3 Innovation Summit')
    await expect(page.getByTestId('hero-enter-btn')).toBeVisible()

    // 2. Click "Enter Event" button
    await page.getByTestId('hero-enter-btn').click()

    // 3. Auth modal should open
    await expect(page.getByTestId('auth-modal')).toBeVisible()
    await expect(page.getByText('Choose how you\'d like to sign in')).toBeVisible()

    // 4. Choose email authentication
    await page.getByTestId('email-auth-btn').click()

    // 5. Enter email and submit
    await page.getByTestId('email-input').fill('test@example.com')
    await page.getByTestId('send-magic-link-btn').click()

    // 6. Should see "check your inbox" message
    await expect(page.getByText('Check your inbox')).toBeVisible()

    // 7. Click the demo magic link button
    await page.getByTestId('simulate-magic-link-btn').click()

    // 8. Should see success message
    await expect(page.getByTestId('auth-success')).toBeVisible()

    // 9. Profile setup modal should appear
    await expect(page.getByTestId('profile-setup-modal')).toBeVisible({ timeout: 3000 })

    // 10. Fill in profile details
    await page.getByTestId('display-name-input').fill('Test User')

    // 11. Submit profile
    await page.getByTestId('profile-submit-btn').click()

    // 12. Onboarding modal should appear
    await expect(page.getByTestId('onboarding-modal')).toBeVisible({ timeout: 3000 })

    // 13. Go through all onboarding slides (use modal-scoped selectors to avoid ambiguity)
    const onboardingModal = page.getByTestId('onboarding-modal')
    await expect(onboardingModal.getByRole('heading', { name: 'How This Unconference Works' })).toBeVisible()
    await page.getByTestId('onboarding-next-btn').click()

    await expect(onboardingModal.getByRole('heading', { name: 'Quadratic Voting' })).toBeVisible()
    await page.getByTestId('onboarding-next-btn').click()

    await expect(onboardingModal.getByRole('heading', { name: 'Two Voting Phases' })).toBeVisible()
    await page.getByTestId('onboarding-next-btn').click()

    await expect(onboardingModal.getByRole('heading', { name: 'Ready to Explore' })).toBeVisible()

    // 14. Complete onboarding - should navigate to sessions
    await page.getByTestId('onboarding-next-btn').click()

    // 15. Should be on the sessions page
    await expect(page).toHaveURL('/event/sessions', { timeout: 5000 })
  })

  test('wallet authentication flow', async ({ page }) => {
    await page.goto('/')

    // Click "Enter Event"
    await page.getByTestId('hero-enter-btn').click()

    // Auth modal should open
    await expect(page.getByTestId('auth-modal')).toBeVisible()

    // Choose wallet authentication
    await page.getByTestId('connect-wallet-btn').click()

    // Should see "Connecting to your wallet..." message briefly, then success
    await expect(page.getByTestId('auth-success')).toBeVisible({ timeout: 5000 })

    // Profile setup should appear
    await expect(page.getByTestId('profile-setup-modal')).toBeVisible({ timeout: 3000 })
  })

  test('header enter button also works', async ({ page }) => {
    await page.goto('/')

    // Click header "Enter Event" button
    await page.getByTestId('header-enter-btn').click()

    // Auth modal should open
    await expect(page.getByTestId('auth-modal')).toBeVisible()
  })

  test('view sessions button navigates directly', async ({ page }) => {
    await page.goto('/')

    // Click "View Sessions" button (no auth required for viewing)
    await page.getByTestId('view-sessions-btn').click()

    // Should navigate to sessions page
    await expect(page).toHaveURL('/event/sessions')
  })
})

test.describe('Landing Page', () => {
  test('displays event information', async ({ page }) => {
    await page.goto('/')

    // Check main content
    await expect(page.locator('h1')).toContainText('Web3 Innovation Summit')
    await expect(page.getByText('March 15-16, 2024')).toBeVisible()
    await expect(page.getByText('San Francisco, CA')).toBeVisible()

    // Check "How It Works" section
    await expect(page.getByText('How It Works')).toBeVisible()
    await expect(page.getByText('Pre-Event Voting')).toBeVisible()
    await expect(page.getByText('Attendance Voting')).toBeVisible()
  })

  test('FAQ accordion works', async ({ page }) => {
    await page.goto('/')

    // Click first FAQ question
    await page.getByTestId('faq-0').click()

    // Answer should be visible
    await expect(page.getByText('Quadratic voting is a mechanism')).toBeVisible()

    // Click again to close
    await page.getByTestId('faq-0').click()

    // Answer should be hidden (with a short delay for animation)
    await expect(page.getByText('Quadratic voting is a mechanism')).toBeHidden({ timeout: 1000 })
  })
})

test.describe('Sessions Page', () => {
  test('displays sessions list', async ({ page }) => {
    await page.goto('/event/sessions')

    // Page should load - the h1 is "Pre-Event Voting"
    await expect(page.locator('h1')).toContainText('Pre-Event Voting')

    // Should show session cards
    await expect(page.getByText('Building DAOs That Actually Work')).toBeVisible()
  })
})
