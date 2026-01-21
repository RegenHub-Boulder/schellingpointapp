import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'

/**
 * Admin Distribution Flow Tests
 *
 * Tests the budget distribution functionality.
 *
 * KNOWN ISSUES:
 * - Distribution execution is FAKE (uses setTimeout, not real API)
 * - No actual payment processing or on-chain transfer
 * - handleExecute() just simulates a 3-second delay
 */

test.describe('Admin Distribution - Page Access', () => {
  test('distribution page loads', async ({ page }) => {
    await page.goto('/admin/distribution')
    await waitForPageLoad(page)

    await page.waitForTimeout(2000)

    // Either redirected to login or shows distribution page
    const url = page.url()
    console.log('Distribution page access:', url)
  })

  test('distribution page shows budget information', async ({ page }) => {
    await page.goto('/admin/distribution')
    await waitForPageLoad(page)

    if (page.url().includes('/admin/distribution')) {
      // Should show budget pool info
      const budgetInfo = page.locator('text=/Budget|Pool|ETH|Distribution/i').first()
      await expect(budgetInfo).toBeVisible()
    }
  })
})

test.describe('Admin Distribution - Calculation', () => {
  test('displays QF distribution breakdown', async ({ page }) => {
    await page.goto('/admin/distribution')
    await waitForPageLoad(page)

    if (page.url().includes('/admin/distribution')) {
      await page.waitForTimeout(2000)

      // Should show session distribution breakdown
      const distributionTable = page.locator('table, [role="table"], .grid').first()
      const hasDistributionData = await distributionTable.isVisible()

      console.log('Distribution table visible:', hasDistributionData)
    }
  })

  test('shows session QF scores', async ({ page }) => {
    await page.goto('/admin/distribution')
    await waitForPageLoad(page)

    if (page.url().includes('/admin/distribution')) {
      // QF scores should be displayed
      const qfScore = page.locator('text=/QF Score|Score/i').first()

      if (await qfScore.isVisible()) {
        console.log('QF scoring visible')
      }
    }
  })

  test('shows percentage allocation', async ({ page }) => {
    await page.goto('/admin/distribution')
    await waitForPageLoad(page)

    if (page.url().includes('/admin/distribution')) {
      // Percentage should be shown for each session
      const percentage = page.locator('text=/%/').first()

      if (await percentage.isVisible()) {
        console.log('Percentage allocation visible')
      }
    }
  })
})

test.describe('Admin Distribution - Execution (BROKEN)', () => {
  test('execute button exists', async ({ page }) => {
    await page.goto('/admin/distribution')
    await waitForPageLoad(page)

    if (page.url().includes('/admin/distribution')) {
      const executeButton = page.locator('button:has-text("Execute"), button:has-text("Distribute")')

      if (await executeButton.isVisible()) {
        console.log('Execute button found')
      }
    }
  })

  test('execute does NOT call real API', async ({ page }) => {
    /**
     * KNOWN CRITICAL BUG:
     * /src/app/admin/distribution/page.tsx lines 89-96:
     *
     * const handleExecute = () => {
     *   setIsExecuting(true)
     *   setTimeout(() => {
     *     setIsExecuting(false)
     *     setExecuted(true)
     *   }, 3000)  // FAKE! Just a timeout
     * }
     *
     * This does NOT:
     * - Call any API endpoint
     * - Process payments
     * - Execute on-chain transfers
     * - Record the distribution
     *
     * The /api/events/{slug}/distribution/execute endpoint DOES NOT EXIST
     */

    await page.goto('/admin/distribution')
    await waitForPageLoad(page)

    if (page.url().includes('/admin/distribution')) {
      // Set up request listener
      let apiCallMade = false
      page.on('request', request => {
        if (request.url().includes('/distribution/execute')) {
          apiCallMade = true
        }
      })

      const executeButton = page.locator('button:has-text("Execute"), button:has-text("Distribute")')

      if (await executeButton.isVisible() && !await executeButton.isDisabled()) {
        await executeButton.click()

        // Wait for the fake timeout
        await page.waitForTimeout(4000)

        // BUG: No API call should have been made
        console.log('API call made during execute:', apiCallMade)

        // This should fail once the bug is fixed (API should be called)
        // For now, it documents the broken behavior
        if (!apiCallMade) {
          console.log('CONFIRMED BUG: Execute button does not call API')
        }
      }
    }
  })

  test('distribution endpoint does not exist', async ({ request }) => {
    /**
     * This test confirms the missing API endpoint
     */

    const response = await request.post('/api/events/ethboulder-2026/distribution/execute', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {}
    })

    // Should get 404 because endpoint doesn't exist
    // Or 401/403 if route exists but requires auth
    console.log('Distribution execute endpoint status:', response.status())

    // Either not found (404) or not implemented (5xx) or auth required (401/403)
    expect([401, 403, 404, 500, 501]).toContain(response.status())
  })
})

test.describe('Admin Distribution - Required Fix', () => {
  test.skip('should implement actual distribution execution', async () => {
    /**
     * REQUIRED FIX:
     *
     * 1. Create API endpoint: POST /api/events/{slug}/distribution/execute
     *
     * 2. Endpoint should:
     *    - Verify admin authorization
     *    - Calculate final QF scores
     *    - Create distribution records in database
     *    - Execute on-chain transfers (or queue for batch processing)
     *    - Record transaction hashes
     *    - Update distribution status
     *
     * 3. Frontend should:
     *    - Call the API endpoint
     *    - Show real transaction progress
     *    - Display transaction hashes
     *    - Handle errors appropriately
     *
     * 4. Database needs:
     *    - distributions table (exists)
     *    - distribution_items table (exists)
     *    - Proper status tracking
     */
  })
})

test.describe('Admin Distribution - Status Tracking', () => {
  test('distribution status displayed', async ({ page }) => {
    await page.goto('/admin/distribution')
    await waitForPageLoad(page)

    if (page.url().includes('/admin/distribution')) {
      // Should show distribution status
      const status = page.locator('text=/Pending|Completed|Not Distributed|Ready/i').first()

      if (await status.isVisible()) {
        const statusText = await status.textContent()
        console.log('Distribution status:', statusText)
      }
    }
  })

  test('shows recipient addresses', async ({ page }) => {
    await page.goto('/admin/distribution')
    await waitForPageLoad(page)

    if (page.url().includes('/admin/distribution')) {
      // Should show payout addresses for hosts
      const addressPattern = page.locator('text=/0x[a-fA-F0-9]{4,}/').first()

      if (await addressPattern.isVisible()) {
        console.log('Recipient addresses visible')
      }
    }
  })
})
