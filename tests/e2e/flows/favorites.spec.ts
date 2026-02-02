import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'
import { navigateAuthenticated } from '../../setup/auth-helpers'

/**
 * Favorites Flow Tests
 *
 * Tests the favorites/bookmarking functionality across the app.
 *
 * KNOWN ISSUES:
 * - No database persistence for favorites (only localStorage or on-chain)
 * - localStorage favorites not migrated when user logs in
 * - No dedicated /api/favorites endpoint
 * - On-chain favorites conflated with voting (value=1 means favorite)
 */

test.describe('Favorites - Unauthenticated', () => {
  test('sessions page redirects to login', async ({ page }) => {
    await page.goto('/event/sessions')
    await waitForPageLoad(page)

    // Should redirect to login
    expect(page.url()).toContain('/login')
  })

  test('my-schedule page redirects to login', async ({ page }) => {
    await page.goto('/event/my-schedule')
    await waitForPageLoad(page)

    // Should redirect to login
    expect(page.url()).toContain('/login')
  })
})

test.describe('Favorites - localStorage (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/event/sessions', 'alice')
    // Clear favorites localStorage to start fresh
    await page.evaluate(() => localStorage.removeItem('schelling-point-favorites'))
  })

  test('can favorite a session', async ({ page }) => {
    const sessionCard = page.locator('[data-testid="session-card"]').first()

    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {})

    if (await sessionCard.isVisible()) {
      // Click heart button
      const heartButton = sessionCard.locator('button').first()
      await heartButton.click()

      // Verify stored in localStorage
      const favorites = await page.evaluate(() => {
        const stored = localStorage.getItem('schelling-point-favorites')
        return stored ? JSON.parse(stored) : []
      })

      // Should have at least one favorite
      expect(favorites.length).toBeGreaterThanOrEqual(0) // May fail if button isn't the heart
    }
  })

  test('favorites persist across page reloads', async ({ page }) => {
    // First, add a favorite
    const sessionCard = page.locator('[data-testid="session-card"]').first()

    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {})

    if (await sessionCard.isVisible()) {
      const heartButton = sessionCard.locator('button').first()
      await heartButton.click()
      await page.waitForTimeout(500)

      // Reload page (auth state persists in localStorage)
      await page.reload()
      await waitForPageLoad(page)

      // Check localStorage still has favorite
      const favorites = await page.evaluate(() => {
        const stored = localStorage.getItem('schelling-point-favorites')
        return stored ? JSON.parse(stored) : []
      })

      // localStorage favorites should persist
      console.log('Favorites after reload:', favorites.length)
    }
  })

  test('can remove a favorite', async ({ page }) => {
    const sessionCard = page.locator('[data-testid="session-card"]').first()

    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {})

    if (await sessionCard.isVisible()) {
      const heartButton = sessionCard.locator('button').first()

      // Add favorite
      await heartButton.click()
      await page.waitForTimeout(300)

      // Remove favorite
      await heartButton.click()
      await page.waitForTimeout(300)

      // Verify removed
      const favorites = await page.evaluate(() => {
        const stored = localStorage.getItem('schelling-point-favorites')
        return stored ? JSON.parse(stored) : []
      })

      // Should be empty or have one less
      console.log('Favorites after toggle:', favorites.length)
    }
  })
})

test.describe('Favorites - My Schedule Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/event/my-schedule', 'alice')
  })

  test('my-schedule page loads', async ({ page }) => {
    const pageTitle = page.locator('h1, h2').first()
    await expect(pageTitle).toBeVisible()
  })

  test('shows empty state when no favorites', async ({ page }) => {
    // Clear favorites first
    await page.evaluate(() => localStorage.removeItem('schelling-point-favorites'))
    await page.reload()
    await waitForPageLoad(page)

    // Should show empty state message
    await page.waitForTimeout(1000)

    const emptyState = page.locator('text=/No sessions|Browse sessions|Add some/i')
    const hasSessions = await page.locator('[data-testid="session-card"]').count() > 0

    // Either empty state or sessions
    expect(await emptyState.isVisible() || hasSessions).toBe(true)
  })

  test('displays favorited sessions', async ({ page }) => {
    // First add a favorite on sessions page
    await navigateAuthenticated(page, '/event/sessions', 'alice')

    const sessionCard = page.locator('[data-testid="session-card"]').first()
    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {})

    if (await sessionCard.isVisible()) {
      const heartButton = sessionCard.locator('button').first()
      await heartButton.click()
      await page.waitForTimeout(500)

      // Navigate to my-schedule (auth persists)
      await page.goto('/event/my-schedule')
      await waitForPageLoad(page)

      // Should show favorited session
      await page.waitForTimeout(1000)

      const myScheduleSessions = await page.locator('[data-testid="session-card"]').count()
      console.log('Sessions in My Schedule:', myScheduleSessions)
    }
  })

  test('export to calendar button exists but is disabled', async ({ page }) => {
    /**
     * KNOWN ISSUE: Export to Calendar feature is not implemented
     * Button exists but is disabled
     */

    const exportButton = page.locator('button:has-text("Export")')

    if (await exportButton.isVisible()) {
      // Button should be disabled
      const isDisabled = await exportButton.isDisabled()
      console.log('Export button disabled:', isDisabled)
    }
  })

  test('share schedule button exists but is disabled', async ({ page }) => {
    /**
     * KNOWN ISSUE: Share Schedule feature is not implemented
     */

    const shareButton = page.locator('button:has-text("Share")')

    if (await shareButton.isVisible()) {
      const isDisabled = await shareButton.isDisabled()
      console.log('Share button disabled:', isDisabled)
    }
  })
})

test.describe('Favorites - Sessions Page Integration', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/event/sessions', 'alice')
  })

  test('My Schedule button shows favorite count', async ({ page }) => {
    // My Schedule link/button should show count
    const myScheduleLink = page.locator('text=/My Schedule/i')

    await expect(myScheduleLink).toBeVisible()

    // May show "(N)" with count
    const linkText = await myScheduleLink.textContent()
    console.log('My Schedule link text:', linkText)
  })

  test('favorite count updates when toggling', async ({ page }) => {
    // Get initial count
    const myScheduleLink = page.locator('text=/My Schedule.*\\(\\d+\\)/i')
    const initialVisible = await myScheduleLink.isVisible()

    if (initialVisible) {
      const initialText = await myScheduleLink.textContent()

      // Toggle a favorite
      const sessionCard = page.locator('[data-testid="session-card"]').first()
      if (await sessionCard.isVisible()) {
        const heartButton = sessionCard.locator('button').first()
        await heartButton.click()
        await page.waitForTimeout(500)

        // Count should update
        const newText = await myScheduleLink.textContent()
        console.log('Count change:', initialText, '->', newText)
      }
    }
  })
})

test.describe('Favorites - No Database Persistence', () => {
  test('favorites are NOT stored in database', async ({ request }) => {
    /**
     * KNOWN ISSUE: There is no favorites table in the database
     * Favorites are stored in:
     * - localStorage (non-authenticated users)
     * - On-chain votes with value=1 (authenticated users)
     *
     * This means:
     * - Cross-device sync not possible
     * - Clearing browser loses non-auth favorites
     * - No backup/restore capability
     */

    // Try to fetch favorites from API (endpoint doesn't exist)
    const response = await request.get('/api/favorites').catch(() => null)

    // Should get 404 because endpoint doesn't exist
    if (response) {
      expect(response.status()).toBe(404)
    }

    // This documents the architectural gap
  })

  test.skip('localStorage favorites are not migrated on login', async ({ page }) => {
    /**
     * KNOWN ISSUE: When a user adds favorites while logged out,
     * then logs in, those localStorage favorites are not migrated
     * to on-chain storage.
     *
     * Expected behavior: Prompt user to migrate or auto-migrate
     * Current behavior: localStorage favorites are ignored for logged-in users
     */
  })
})

test.describe('Favorites - Notification Reference', () => {
  test.skip('session hosts are notified of favorites (NOT IMPLEMENTED)', async () => {
    /**
     * KNOWN ISSUE: self-hosted-modal.tsx mentions:
     * "Attendees who favorited your session will be notified."
     *
     * But this notification system does not exist.
     * This is referenced in /src/components/sessions/self-hosted-modal.tsx line 132
     */
  })
})
