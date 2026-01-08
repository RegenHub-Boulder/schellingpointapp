import { Page, expect, APIRequestContext } from '@playwright/test'

// Event slug used for testing
export const TEST_EVENT_SLUG = process.env.TEST_EVENT_SLUG || 'ethboulder-2026'

// Base URL for API requests
export const API_BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3333'

/**
 * Wait for the page to be fully loaded (no network activity)
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
}

/**
 * Wait for API response and return JSON data
 */
export async function waitForApiResponse<T>(
  page: Page,
  urlPattern: string | RegExp,
  action: () => Promise<void>
): Promise<T> {
  const [response] = await Promise.all([
    page.waitForResponse((res) => {
      if (typeof urlPattern === 'string') {
        return res.url().includes(urlPattern)
      }
      return urlPattern.test(res.url())
    }),
    action(),
  ])
  return response.json() as Promise<T>
}

/**
 * Check if an element is visible within a timeout
 */
export async function isVisible(page: Page, selector: string, timeout = 5000): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout })
    return true
  } catch {
    return false
  }
}

/**
 * Get all console errors from the page
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  return errors
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true })
}

/**
 * Format date for display comparison
 */
export function formatDateForComparison(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `test-${timestamp}-${random}@example.com`
}

/**
 * Generate a unique test name
 */
export function generateTestName(): string {
  const adjectives = ['Happy', 'Swift', 'Clever', 'Brave', 'Calm']
  const nouns = ['Tester', 'Developer', 'Builder', 'Creator', 'Hacker']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 1000)
  return `${adj} ${noun} ${num}`
}

/**
 * Assert that a toast/notification appears with specific text
 */
export async function expectToast(page: Page, text: string, timeout = 5000) {
  await expect(page.getByText(text)).toBeVisible({ timeout })
}

/**
 * Click and wait for navigation
 */
export async function clickAndWaitForNavigation(page: Page, selector: string) {
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector),
  ])
}

/**
 * Fill a form field with proper clearing
 */
export async function fillField(page: Page, selector: string, value: string) {
  const field = page.locator(selector)
  await field.click()
  await field.fill('')
  await field.fill(value)
}

/**
 * Select an option from a dropdown
 */
export async function selectOption(page: Page, selector: string, value: string) {
  await page.locator(selector).click()
  await page.getByRole('option', { name: value }).click()
}
