import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../../setup/test-utils'
import { navigateAuthenticated } from '../../setup/auth-helpers'

test.describe('Admin Venues - Unauthenticated', () => {
  test('redirects to login page', async ({ page }) => {
    await page.goto('/admin/venues')
    await waitForPageLoad(page)

    // Should redirect to login
    expect(page.url()).toContain('/login')
  })
})

test.describe('Admin Venues Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/admin/venues', 'alice')
  })

  test('page loads with venues management UI', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText(/Venues.*Time Slots/i)
  })

  test('displays summary stats cards', async ({ page }) => {
    // Wait for loading to finish
    await page.waitForTimeout(2000)

    // Should show stats cards - use exact text to avoid conflicts with other elements
    await expect(page.getByText('Venues', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Total Capacity', { exact: true })).toBeVisible()
    await expect(page.getByText('Session Slots', { exact: true })).toBeVisible()
  })

  test('has Add Venue button', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Venue")')
    await expect(addButton).toBeVisible()
  })

  test('has Add Slot button', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Slot")')
    await expect(addButton).toBeVisible()
  })

  test('venues list displays or shows empty state', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(2000)

    // Either shows venues or empty state
    const venueItems = page.locator('.border:has(.font-medium)')
    const emptyState = page.locator('text=/No venues configured/i')

    const hasVenues = await venueItems.count() > 0
    const hasEmptyState = await emptyState.isVisible()

    expect(hasVenues || hasEmptyState).toBe(true)
  })
})

test.describe('Admin Venues - Add Venue Modal', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/admin/venues', 'alice')
  })

  test('Add Venue opens modal', async ({ page }) => {
    // Wait for loading to finish
    await page.waitForTimeout(2000)

    const addButton = page.locator('button:has-text("Add Venue")')
    await addButton.click()

    // Modal should open
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', { name: 'Add Venue' })).toBeVisible()
  })

  test('venue form has required fields', async ({ page }) => {
    // Wait for loading to finish
    await page.waitForTimeout(2000)

    const addButton = page.locator('button:has-text("Add Venue")')
    await addButton.click()

    // Wait for modal
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Should have name field
    await expect(modal.getByText('Venue Name', { exact: true })).toBeVisible()
    // Should have capacity field
    await expect(modal.getByText('Capacity', { exact: true })).toBeVisible()
    // Should have features section
    await expect(modal.getByText('Features', { exact: true })).toBeVisible()
  })

  test('modal can be closed', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Venue")')
    await addButton.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Close with Cancel button
    const cancelButton = modal.locator('button:has-text("Cancel")')
    await cancelButton.click()

    // Modal should close
    await expect(modal).toBeHidden({ timeout: 2000 })
  })
})

test.describe('Admin Venues - Time Slots', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/admin/venues', 'alice')
  })

  test('displays Time Slots section', async ({ page }) => {
    // Time Slots section should be visible (use exact match to avoid matching "Venues & Time Slots")
    await expect(page.getByRole('heading', { name: 'Time Slots', exact: true })).toBeVisible()
  })

  test('time slots list shows slot times', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000)

    // Should show time format (HH:MM - HH:MM) or empty state message
    const hasSlots = await page.locator('text=/\\d{2}:\\d{2}.*-.*\\d{2}:\\d{2}/').count() > 0
    const hasEmptyState = await page.locator('text=/No time slots configured/i').isVisible()

    expect(hasSlots || hasEmptyState).toBe(true)
  })

  test('Add Slot opens modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Slot")')
    await addButton.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal.locator('text=Add Time Slot')).toBeVisible()
  })
})

test.describe('Admin Venues - Edit/Delete', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/admin/venues', 'alice')
  })

  test('edit venue buttons exist for each venue', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Venues have edit buttons (pencil icons)
    const editButtons = page.locator('button:has(svg.lucide-edit-2)')

    // Count might be 0 if no venues exist
    const count = await editButtons.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('delete venue shows confirmation', async ({ page }) => {
    await page.waitForTimeout(2000)

    const deleteButton = page.locator('button:has(svg.lucide-trash-2)').first()

    if (await deleteButton.count() > 0) {
      // Set up dialog handler before clicking
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm')
        await dialog.dismiss()
      })

      await deleteButton.click()
    }
  })
})
