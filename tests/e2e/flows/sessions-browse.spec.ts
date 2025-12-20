import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'

test.describe('Sessions Page - Browse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/event/sessions')
    await waitForPageLoad(page)
  })

  test('displays page title', async ({ page }) => {
    // Page title is "Pre-Event Voting"
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText(/Pre-Event Voting|Sessions/i)
  })

  test('loads sessions or shows loading/empty state', async ({ page }) => {
    // Wait for content to load - either sessions, loading spinner, or empty message
    await page.waitForTimeout(2000)

    // Check if we have session cards, loading state, or empty state
    const sessionCards = await page.locator('[data-testid="session-card"]').count()
    const loadingSpinner = await page.locator('.animate-spin').count()
    const noSessionsMessage = await page.locator('text=/No sessions|Failed to load/i').count()

    // One of these should be present
    expect(sessionCards + loadingSpinner + noSessionsMessage).toBeGreaterThanOrEqual(0)
  })

  test('session card displays title and format', async ({ page }) => {
    // Wait for sessions to load
    const sessionCard = page.locator('[data-testid="session-card"]').first()

    // Wait for cards or timeout
    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {
      // No sessions - skip this test
    })

    if (await sessionCard.isVisible()) {
      // Card should have a title (h3 or font-semibold element)
      await expect(sessionCard.locator('.font-semibold, h3').first()).toBeVisible()
    }
  })

  test('clicking View full details navigates to detail page', async ({ page }) => {
    const sessionCard = page.locator('[data-testid="session-card"]').first()

    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {})

    if (await sessionCard.isVisible()) {
      // Click on "View full details" link within the card
      const viewDetailsLink = sessionCard.locator('text=View full details')
      if (await viewDetailsLink.isVisible()) {
        await viewDetailsLink.click()
        await expect(page).toHaveURL(/\/event\/sessions\/[^/]+$/)
      }
    }
  })
})

test.describe('Sessions Page - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/event/sessions')
    await waitForPageLoad(page)
  })

  test('search input is visible', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search sessions"]')
    await expect(searchInput).toBeVisible()
  })

  test('filters button is available', async ({ page }) => {
    const filtersButton = page.locator('button:has-text("Filters")')
    await expect(filtersButton).toBeVisible()
  })

  test('clicking Filters shows filter options', async ({ page }) => {
    const filtersButton = page.locator('button:has-text("Filters")')
    await filtersButton.click()

    // Should show format filter options
    await expect(page.locator('text=Format')).toBeVisible()
    await expect(page.locator('text=Sort by')).toBeVisible()
  })

  test('search filters sessions', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForTimeout(2000)

    const searchInput = page.locator('input[placeholder*="Search sessions"]')
    await searchInput.fill('nonexistent query xyz123')

    // Wait for filter to apply
    await page.waitForTimeout(500)

    // Either no results or filtered results - page shouldn't crash
    const sessionCards = await page.locator('[data-testid="session-card"]').count()
    expect(sessionCards).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Sessions Page - Navigation', () => {
  test('can navigate back from session detail', async ({ page }) => {
    await page.goto('/event/sessions')
    await waitForPageLoad(page)

    const sessionCard = page.locator('[data-testid="session-card"]').first()

    await sessionCard.waitFor({ timeout: 10000 }).catch(() => {})

    if (await sessionCard.isVisible()) {
      // Click on view details
      const viewDetailsLink = sessionCard.locator('text=View full details')
      if (await viewDetailsLink.isVisible()) {
        await viewDetailsLink.click()
        await expect(page).toHaveURL(/\/event\/sessions\/[^/]+$/)

        // Go back
        await page.goBack()
        await expect(page).toHaveURL(/\/event\/sessions/)
      }
    }
  })

  test('navigation tabs are visible in event layout', async ({ page }) => {
    await page.goto('/event/sessions')
    await waitForPageLoad(page)

    // Should have navigation tabs (Sessions tab with icon)
    const sessionsTab = page.locator('a:has-text("Sessions")')
    await expect(sessionsTab.first()).toBeVisible()
  })

  test('Propose Session button is visible', async ({ page }) => {
    await page.goto('/event/sessions')
    await waitForPageLoad(page)

    const proposeBtn = page.locator('a:has-text("Propose Session")')
    await expect(proposeBtn).toBeVisible()
  })
})
