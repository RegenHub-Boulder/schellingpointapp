import { Page, BrowserContext } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'

/**
 * Seed user data from supabase/seed.sql
 * These users have passkeys registered in the database
 */
export const SEED_USERS = {
  alice: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'alice@example.com',
    displayName: 'Alice',
    pubKeyX: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    pubKeyY: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    credentialId: 'seed-credential-alice',
    isAdmin: true, // Admin for ethboulder-2026
  },
  bob: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'bob@example.com',
    displayName: 'Bob',
    pubKeyX: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    pubKeyY: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    credentialId: 'seed-credential-bob',
    isAdmin: false,
  },
  carol: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'carol@example.com',
    displayName: 'Carol',
    pubKeyX: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    pubKeyY: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    credentialId: 'seed-credential-carol',
    isAdmin: false,
  },
  dave: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'dave@example.com',
    displayName: 'Dave',
    pubKeyX: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
    pubKeyY: '0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
    credentialId: 'seed-credential-dave',
    isAdmin: false,
  },
  eve: {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'eve@example.com',
    displayName: 'Eve',
    pubKeyX: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
    pubKeyY: '0x0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e',
    credentialId: 'seed-credential-eve',
    isAdmin: false,
  },
}

export type SeedUserKey = keyof typeof SEED_USERS

// Legacy export for backwards compatibility
export const TEST_USERS = {
  admin: { email: SEED_USERS.alice.email, password: 'n/a', name: SEED_USERS.alice.displayName },
  user: { email: SEED_USERS.bob.email, password: 'n/a', name: SEED_USERS.bob.displayName },
  user2: { email: SEED_USERS.carol.email, password: 'n/a', name: SEED_USERS.carol.displayName },
}

/**
 * JWT signing configuration - must match src/lib/jwt.ts
 */
const JWT_ISSUER = 'schelling-point'
const JWT_AUDIENCE = 'schelling-point-app'

/**
 * Get JWT secret for test environment
 * MUST match src/lib/jwt.ts default exactly
 */
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'development-secret-change-in-production'
  return new TextEncoder().encode(secret)
}

/**
 * Generate a valid JWT for a seed user
 * This JWT will be accepted by /api/auth/me
 */
export async function generateTestJWT(userKey: SeedUserKey): Promise<string> {
  const user = SEED_USERS[userKey]
  const signerExpiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days

  const token = await new SignJWT({
    sub: user.id,
    pubKeyX: user.pubKeyX,
    pubKeyY: user.pubKeyY,
    displayName: user.displayName,
    email: user.email,
    signerAddress: '0x' + '1234567890abcdef'.repeat(2) + '12345678', // Mock signer address (40 hex chars)
    signerExpiry,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('24h')
    .sign(getJWTSecret())

  return token
}

/**
 * Set up fully authenticated state for a seed user
 * This sets localStorage values that will pass both client-side and server-side auth checks
 */
export async function authenticateAsSeedUser(page: Page, userKey: SeedUserKey): Promise<void> {
  const user = SEED_USERS[userKey]
  const token = await generateTestJWT(userKey)
  const signerExpiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60

  await page.evaluate(
    ({ passkeyInfo, sessionKey, authToken }) => {
      localStorage.setItem('passkeyInfo', JSON.stringify(passkeyInfo))
      localStorage.setItem('sessionKey', JSON.stringify(sessionKey))
      localStorage.setItem('authToken', authToken)
    },
    {
      passkeyInfo: {
        credentialId: user.credentialId,
        userId: user.id,
        pubKeyX: user.pubKeyX,
        pubKeyY: user.pubKeyY,
      },
      sessionKey: {
        privateKey: '0x' + '3'.repeat(64), // Mock private key
        address: '0x' + '1234567890abcdef'.repeat(2) + '12345678',
        expiry: signerExpiry,
      },
      authToken: token,
    }
  )
}

/**
 * Navigate to a page as an authenticated seed user
 * Handles the auth setup and navigation in one call
 */
export async function navigateAuthenticated(
  page: Page,
  url: string,
  userKey: SeedUserKey = 'alice'
): Promise<void> {
  // First navigate to root to set up localStorage
  await page.goto('/')
  await authenticateAsSeedUser(page, userKey)

  // Verify localStorage was set correctly
  const hasAuth = await page.evaluate(() => {
    return !!localStorage.getItem('authToken') && !!localStorage.getItem('sessionKey')
  })
  if (!hasAuth) {
    throw new Error('Failed to set authentication state in localStorage')
  }

  // Validate token with API before navigating to protected route
  // This ensures the server will accept our token
  // Retry a few times in case server is still starting up
  let authResult: { ok: boolean; status?: number; error?: string } = { ok: false }
  for (let attempt = 0; attempt < 3; attempt++) {
    authResult = await page.evaluate(async () => {
      const token = localStorage.getItem('authToken')
      if (!token) return { ok: false, error: 'No token' }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        return { ok: res.ok, status: res.status }
      } catch (e) {
        return { ok: false, error: String(e) }
      }
    })

    if (authResult.ok) break
    // If 404, server may still be starting - wait and retry
    if (authResult.status === 404 && attempt < 2) {
      await page.waitForTimeout(2000)
      continue
    }
    break
  }

  if (!authResult.ok) {
    throw new Error(`Token validation failed: ${JSON.stringify(authResult)}`)
  }

  // Now navigate to the target URL
  await page.goto(url)

  // Wait for page to fully load and auth context to process
  await page.waitForLoadState('networkidle')
}

/**
 * Get Supabase client for test operations (uses service role for admin access)
 */
export function getTestSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseKey) {
    throw new Error('Supabase key not configured')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Sign in a test user via Supabase Auth (legacy - for Supabase Auth based flows)
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
 * Create a new test user in Supabase (legacy)
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
 * Sign out from Supabase (legacy)
 */
export async function signOutTestUser() {
  const supabase = getTestSupabaseClient()
  await supabase.auth.signOut()
}

/**
 * Set up authenticated browser context with cookies from Supabase session (legacy)
 */
export async function setupAuthenticatedContext(
  context: BrowserContext,
  session: { access_token: string; refresh_token: string }
) {
  const page = await context.newPage()

  await page.goto('/')
  await page.evaluate(
    ({ accessToken, refreshToken }) => {
      const supabaseUrl = (window as unknown as { __NEXT_PUBLIC_SUPABASE_URL?: string }).__NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
      const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'bearer',
        })
      )
    },
    { accessToken: session.access_token, refreshToken: session.refresh_token }
  )

  await page.close()
}

/**
 * Simulate the magic link auth flow in the browser (legacy - demo mode)
 */
export async function simulateMagicLinkAuth(page: Page, email: string) {
  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('send-magic-link-btn').click()

  await page.waitForSelector('[data-testid="simulate-magic-link-btn"]')
  await page.getByTestId('simulate-magic-link-btn').click()

  await page.waitForSelector('[data-testid="auth-success"]')
}

/**
 * Complete the profile setup flow (legacy)
 */
export async function completeProfileSetup(page: Page, displayName: string) {
  await page.waitForSelector('[data-testid="profile-setup-modal"]')
  await page.getByTestId('display-name-input').fill(displayName)
  await page.getByTestId('profile-submit-btn').click()
}

/**
 * Complete the onboarding tutorial flow (legacy)
 */
export async function completeOnboarding(page: Page) {
  await page.waitForSelector('[data-testid="onboarding-modal"]')

  for (let i = 0; i < 4; i++) {
    await page.getByTestId('onboarding-next-btn').click()
    await page.waitForTimeout(300)
  }
}

/**
 * Full auth flow: open modal, email auth, profile, onboarding (legacy)
 */
export async function completeFullAuthFlow(page: Page, email: string, displayName: string) {
  await page.getByTestId('hero-enter-btn').click()
  await page.getByTestId('email-auth-btn').click()
  await simulateMagicLinkAuth(page, email)
  await completeProfileSetup(page, displayName)
  await completeOnboarding(page)
}

/**
 * Check if user is authenticated by looking for user indicators
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 })
    return true
  } catch {
    return false
  }
}

/**
 * Clear all authentication state from localStorage
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('passkeyInfo')
    localStorage.removeItem('sessionKey')
    localStorage.removeItem('authToken')
  })
}
