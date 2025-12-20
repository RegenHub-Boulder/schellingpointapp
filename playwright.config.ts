import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Load environment variables from .env.local
 */
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') })

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter configuration */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github' as const]] : []),
  ],

  /* Global timeout for each test */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'on-first-retry',

    /* Default navigation timeout */
    navigationTimeout: 15000,

    /* Default action timeout */
    actionTimeout: 10000,
  },

  /* Configure projects for different test types */
  projects: [
    // API tests run without browser
    {
      name: 'api',
      testDir: './tests/e2e/api',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // E2E flow tests in Chrome
    {
      name: 'e2e-chrome',
      testDir: './tests/e2e/flows',
      use: { ...devices['Desktop Chrome'] },
    },

    // Legacy tests (auth-flow.spec.ts in root)
    {
      name: 'legacy',
      testMatch: /auth-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Mobile viewport tests
    {
      name: 'mobile',
      testDir: './tests/e2e/flows',
      use: { ...devices['iPhone 13'] },
    },
  ],

  /* Output directory for test artifacts */
  outputDir: 'test-results',

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
