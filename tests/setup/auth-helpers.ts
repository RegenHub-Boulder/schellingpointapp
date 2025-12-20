import { Page, BrowserContext } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Test user credentials (should match seeded data in test database)
export const TEST_USERS = {
  admin: {
    email: 'admin@test.example.com',
    password: 'testpassword123',
    name: 'Test Admin',
  },
  user: {
    email: 'user@test.example.com',
    password: 'testpassword123',
    name: 'Test User',
  },
  user2: {
    email: 'user2@test.example.com',
    password: 'testpassword123',
    name: 'Test User 2',
  },
}

/**
 * Get Supabase client for test operations
 */
export function getTestSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Sign in a test user via Supabase and return session
 */
export async function signInTestUser(email: string, password: string) {
  const supabase = getTestSupabaseClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`)
  }

  return data
}

/**
 * Create a new test user in Supabase
 */
export async function createTestUser(email: string, password: string, metadata?: Record<string, unknown>) {
  const supabase = getTestSupabaseClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }

  return data
}

/**
 * Sign out from Supabase
 */
export async function signOutTestUser() {
  const supabase = getTestSupabaseClient()
  await supabase.auth.signOut()
}

/**
 * Set up authenticated browser context with cookies from Supabase session
 */
export async function setupAuthenticatedContext(
  context: BrowserContext,
  session: { access_token: string; refresh_token: string }
) {
  // Store tokens in localStorage via page evaluation
  const page = await context.newPage()

  await page.goto('/')
  await page.evaluate(({ accessToken, refreshToken }) => {
    const supabaseUrl = (window as any).__NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
    const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

    localStorage.setItem(storageKey, JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
    }))
  }, { accessToken: session.access_token, refreshToken: session.refresh_token })

  await page.close()
}

/**
 * Simulate the magic link auth flow in the browser
 * This uses the demo/simulate button in the auth modal
 */
export async function simulateMagicLinkAuth(page: Page, email: string) {
  // Enter email
  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('send-magic-link-btn').click()

  // Wait for "check your inbox" and click simulate button
  await page.waitForSelector('[data-testid="simulate-magic-link-btn"]')
  await page.getByTestId('simulate-magic-link-btn').click()

  // Wait for auth success
  await page.waitForSelector('[data-testid="auth-success"]')
}

/**
 * Complete the profile setup flow
 */
export async function completeProfileSetup(page: Page, displayName: string) {
  await page.waitForSelector('[data-testid="profile-setup-modal"]')
  await page.getByTestId('display-name-input').fill(displayName)
  await page.getByTestId('profile-submit-btn').click()
}

/**
 * Complete the onboarding tutorial flow
 */
export async function completeOnboarding(page: Page) {
  await page.waitForSelector('[data-testid="onboarding-modal"]')

  // Click through all slides
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('onboarding-next-btn').click()
    await page.waitForTimeout(300) // Wait for animation
  }
}

/**
 * Full auth flow: open modal, email auth, profile, onboarding
 */
export async function completeFullAuthFlow(page: Page, email: string, displayName: string) {
  // Click enter event
  await page.getByTestId('hero-enter-btn').click()

  // Choose email auth
  await page.getByTestId('email-auth-btn').click()

  // Simulate magic link
  await simulateMagicLinkAuth(page, email)

  // Complete profile
  await completeProfileSetup(page, displayName)

  // Complete onboarding
  await completeOnboarding(page)
}

/**
 * Check if user is authenticated by looking for user indicators
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Look for sign out button or user menu as indicator
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 })
    return true
  } catch {
    return false
  }
}
