/**
 * Test setup exports
 *
 * Note: clearAuthState and mockAuthenticatedState have multiple definitions.
 * - Use auth-helpers versions for JWT-based authentication testing
 * - Use webauthn-helpers versions for WebAuthn/passkey testing
 */

// Test utilities (excluding functions that conflict with other modules)
export {
  TEST_EVENT_SLUG,
  API_BASE_URL,
  waitForPageLoad,
  waitForApiResponse,
  isVisible,
  collectConsoleErrors,
  takeScreenshot,
  formatDateForComparison,
  generateTestEmail,
  generateTestName,
  expectToast,
  clickAndWaitForNavigation,
  fillField,
  selectOption,
  // mockAuthenticatedState - use from auth-helpers or webauthn-helpers
  // clearAuthState - use from auth-helpers
} from './test-utils'

// API helpers
export * from './api-helpers'

// Auth helpers - primary authentication helpers with JWT support
export {
  SEED_USERS,
  TEST_USERS,
  generateTestJWT,
  authenticateAsSeedUser,
  navigateAuthenticated,
  getTestSupabaseClient,
  signInTestUser,
  createTestUser,
  signOutTestUser,
  setupAuthenticatedContext,
  simulateMagicLinkAuth,
  completeProfileSetup,
  completeOnboarding,
  completeFullAuthFlow,
  isAuthenticated,
  clearAuthState,  // Canonical clearAuthState
} from './auth-helpers'
export type { SeedUserKey } from './auth-helpers'

// WebAuthn helpers for passkey testing (CDP-based)
export {
  setupVirtualAuthenticator,
  cleanupVirtualAuthenticator,
  addCredential,
  getCredentials,
  removeCredential,
  clearCredentials,
  setUserVerified,
  setAuthenticationShouldFail,
  createTestCredentialId,
  createTestPrivateKey,
  isWebAuthnCDPSupported,
  // mockAuthenticatedState as webauthnMockAuthState - different signature
  // clearAuthState - use from auth-helpers
} from './webauthn-helpers'
export type { VirtualAuthenticatorOptions, VirtualCredential } from './webauthn-helpers'

// Re-export test data
export * from '../fixtures/test-data'
