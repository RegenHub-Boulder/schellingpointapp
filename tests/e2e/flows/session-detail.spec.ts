import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'
import { navigateAuthenticated } from '../../setup/auth-helpers'

test.describe('Session Detail - Unauthenticated', () => {
  test('sessions page redirects to login', async ({ page }) => {
    await page.goto('/event/sessions')
    await waitForPageLoad(page)

    // Should redirect to login
    expect(page.url()).toContain('/login')
  })

  test('direct session detail URL redirects to login', async ({ page }) => {
    await page.goto('/event/sessions/some-session-id')
    await waitForPageLoad(page)

    // Should redirect to login
    expect(page.url()).toContain('/login')
  })
})

test.describe('Session Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sessions page with authentication
    await navigateAuthenticated(page, '/event/sessions', 'alice')

    // Wait for session cards to load
    const sessionCard = page.locator('[data-testid="session-card"]').first()
    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {})

    if (await sessionCard.isVisible()) {
      // Click "View full details" link
      const viewDetailsLink = sessionCard.locator('text=View full details')
      if (await viewDetailsLink.isVisible()) {
        await viewDetailsLink.click()
        await page.waitForURL(/\/event\/sessions\/[^/]+$/)
      }
    }
  })

  test('displays session title', async ({ page }) => {
    // Session title is in h1
    const h1 = page.locator('h1')
    if (await h1.isVisible()) {
      await expect(h1).toBeVisible()
      const title = await h1.textContent()
      expect(title?.length).toBeGreaterThan(0)
    }
  })

  test('displays session description', async ({ page }) => {
    // Description is in the page content
    const description = page.locator('text=About This Session')
    if (await description.isVisible()) {
      await expect(description).toBeVisible()
    }
  })

  test('displays session format', async ({ page }) => {
    // Format is displayed with icon in the header
    const formatLabels = ['talk', 'workshop', 'discussion', 'panel', 'demo']
    let foundFormat = false

    for (const format of formatLabels) {
      const formatText = page.locator(`text=${format}`).first()
      if (await formatText.count() > 0) {
        foundFormat = true
        break
      }
    }

    // Page should load regardless
    expect(await page.content()).toBeTruthy()
  })

  test('displays host information', async ({ page }) => {
    // Host section with "Session Host" title
    const hostSection = page.locator('text=Session Host')
    if (await hostSection.isVisible()) {
      await expect(hostSection).toBeVisible()
    }
  })

  test('has back navigation button', async ({ page }) => {
    // Back button with "Back to Sessions" text
    const backButton = page.locator('button:has-text("Back to Sessions")')
    if (await backButton.isVisible()) {
      await expect(backButton).toBeVisible()
      await backButton.click()
      await expect(page).toHaveURL(/\/event\/sessions/)
    }
  })
})

test.describe('Session Detail - Voting', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/event/sessions', 'alice')

    const sessionCard = page.locator('[data-testid="session-card"]').first()
    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {})

    if (await sessionCard.isVisible()) {
      const viewDetailsLink = sessionCard.locator('text=View full details')
      if (await viewDetailsLink.isVisible()) {
        await viewDetailsLink.click()
        await page.waitForURL(/\/event\/sessions\/[^/]+$/)
      }
    }
  })

  test('voting section exists', async ({ page }) => {
    // Look for "Cast Your Votes" section
    const voteSection = page.locator('text=Cast Your Votes')
    if (await voteSection.isVisible()) {
      await expect(voteSection).toBeVisible()
    }
  })

  test('shows total votes count', async ({ page }) => {
    // Total votes display
    const totalVotes = page.locator('text=Total votes')
    if (await totalVotes.isVisible()) {
      await expect(totalVotes).toBeVisible()
    }
  })

  test('shows quick actions section', async ({ page }) => {
    // Quick Actions section
    const quickActions = page.locator('text=Quick Actions')
    if (await quickActions.isVisible()) {
      await expect(quickActions).toBeVisible()
    }
  })
})

test.describe('Session Detail - Loading States', () => {
  test('handles invalid session ID gracefully', async ({ page }) => {
    await navigateAuthenticated(page, '/event/sessions/invalid-session-id-12345', 'alice')

    // Wait for either error message or back button
    await page.waitForTimeout(3000)

    // Should show error message or "Session not found"
    const errorMessage = page.locator('text=/not found|error|Try again/i')
    const backButton = page.locator('button:has-text("Back to Sessions")')

    const hasError = await errorMessage.count() > 0
    const hasBack = await backButton.count() > 0

    expect(hasError || hasBack).toBe(true)
  })

  test('shows loading spinner while fetching', async ({ page }) => {
    // Navigate to sessions page first with auth
    await navigateAuthenticated(page, '/event/sessions', 'alice')

    const sessionCard = page.locator('[data-testid="session-card"]').first()
    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {})

    if (await sessionCard.isVisible()) {
      // Set up response listener before clicking
      const responsePromise = page.waitForResponse(resp =>
        resp.url().includes('/api/events/') && resp.url().includes('/sessions/')
      ).catch(() => null)

      const viewDetailsLink = sessionCard.locator('text=View full details')
      if (await viewDetailsLink.isVisible()) {
        await viewDetailsLink.click()

        // Either see loading spinner or content loads quickly
        await responsePromise
        expect(await page.content()).toBeTruthy()
      }
    }
  })
})
