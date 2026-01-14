import { BrowserContext, Page, CDPSession } from '@playwright/test'

/**
 * WebAuthn Virtual Authenticator Helpers for Playwright
 *
 * These helpers enable testing passkey flows using Chrome DevTools Protocol (CDP).
 * CDP allows creating virtual authenticators that respond to WebAuthn API calls.
 *
 * Important: Virtual authenticators only work in Chromium-based browsers.
 * For Firefox and Safari, you need to mock the authenticated state instead.
 *
 * References:
 * - https://www.corbado.com/blog/passkeys-e2e-playwright-testing-webauthn-virtual-authenticator
 * - https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
 */

export interface VirtualAuthenticatorOptions {
  /** Protocol: 'u2f' or 'ctap2' (use ctap2 for passkeys) */
  protocol?: 'u2f' | 'ctap2'
  /** Transport: 'usb', 'ble', 'nfc', or 'internal' */
  transport?: 'usb' | 'ble' | 'nfc' | 'internal'
  /** Whether the authenticator supports resident keys (passkeys) */
  hasResidentKey?: boolean
  /** Whether the authenticator supports user verification (biometrics) */
  hasUserVerification?: boolean
  /** Whether user verification always succeeds */
  isUserVerified?: boolean
  /** Whether to automatically simulate user presence */
  automaticPresenceSimulation?: boolean
}

export interface VirtualCredential {
  credentialId: string
  isResidentCredential: boolean
  rpId: string
  privateKey: string
  signCount: number
  userHandle?: string
}

/**
 * Creates a CDP session and sets up a virtual authenticator
 */
export async function setupVirtualAuthenticator(
  context: BrowserContext,
  page: Page,
  options: VirtualAuthenticatorOptions = {}
): Promise<{ cdpSession: CDPSession; authenticatorId: string }> {
  const cdpSession = await context.newCDPSession(page)

  // Enable WebAuthn
  await cdpSession.send('WebAuthn.enable')

  // Create virtual authenticator with sensible defaults for passkey testing
  const result = await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: options.protocol ?? 'ctap2',
      transport: options.transport ?? 'internal', // Platform authenticator
      hasResidentKey: options.hasResidentKey ?? true,
      hasUserVerification: options.hasUserVerification ?? true,
      isUserVerified: options.isUserVerified ?? true, // Auto-pass biometric
      automaticPresenceSimulation: options.automaticPresenceSimulation ?? true,
    },
  })

  return {
    cdpSession,
    authenticatorId: result.authenticatorId,
  }
}

/**
 * Cleans up the virtual authenticator
 */
export async function cleanupVirtualAuthenticator(
  cdpSession: CDPSession,
  authenticatorId?: string
): Promise<void> {
  try {
    if (authenticatorId) {
      await cdpSession.send('WebAuthn.removeVirtualAuthenticator', {
        authenticatorId,
      })
    }
    await cdpSession.send('WebAuthn.disable')
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Adds a credential to the virtual authenticator
 * Useful for setting up login tests with pre-existing credentials
 */
export async function addCredential(
  cdpSession: CDPSession,
  authenticatorId: string,
  credential: VirtualCredential
): Promise<void> {
  await cdpSession.send('WebAuthn.addCredential', {
    authenticatorId,
    credential: {
      credentialId: credential.credentialId,
      isResidentCredential: credential.isResidentCredential,
      rpId: credential.rpId,
      privateKey: credential.privateKey,
      signCount: credential.signCount,
      userHandle: credential.userHandle,
    },
  })
}

/**
 * Gets all credentials from the virtual authenticator
 */
export async function getCredentials(
  cdpSession: CDPSession,
  authenticatorId: string
): Promise<VirtualCredential[]> {
  const result = await cdpSession.send('WebAuthn.getCredentials', {
    authenticatorId,
  })
  return result.credentials as VirtualCredential[]
}

/**
 * Removes a credential from the virtual authenticator
 */
export async function removeCredential(
  cdpSession: CDPSession,
  authenticatorId: string,
  credentialId: string
): Promise<void> {
  await cdpSession.send('WebAuthn.removeCredential', {
    authenticatorId,
    credentialId,
  })
}

/**
 * Clears all credentials from the virtual authenticator
 */
export async function clearCredentials(
  cdpSession: CDPSession,
  authenticatorId: string
): Promise<void> {
  await cdpSession.send('WebAuthn.clearCredentials', {
    authenticatorId,
  })
}

/**
 * Sets whether user verification should pass or fail
 * Useful for testing error flows
 */
export async function setUserVerified(
  cdpSession: CDPSession,
  authenticatorId: string,
  isUserVerified: boolean
): Promise<void> {
  await cdpSession.send('WebAuthn.setUserVerified', {
    authenticatorId,
    isUserVerified,
  })
}

/**
 * Simulates a user declining authentication (for error testing)
 */
export async function setAuthenticationShouldFail(
  cdpSession: CDPSession,
  authenticatorId: string
): Promise<void> {
  await setUserVerified(cdpSession, authenticatorId, false)
}

/**
 * Creates a base64url-encoded test credential ID
 */
export function createTestCredentialId(seed: number = 1): string {
  const bytes = new Uint8Array(32).fill(seed)
  return btoa(String.fromCharCode.apply(null, Array.from(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Creates a base64url-encoded test private key
 * Note: This won't work for actual cryptographic operations
 */
export function createTestPrivateKey(seed: number = 2): string {
  const bytes = new Uint8Array(32).fill(seed)
  return btoa(String.fromCharCode.apply(null, Array.from(bytes)))
}

/**
 * Helper to check if browser supports WebAuthn CDP
 * Use this to skip tests on unsupported browsers
 */
export function isWebAuthnCDPSupported(browserName: string): boolean {
  // CDP WebAuthn only works in Chromium-based browsers
  return browserName === 'chromium' || browserName === 'chrome'
}

/**
 * Mock authenticated state in localStorage for non-Chromium browsers
 * This bypasses actual WebAuthn but allows testing protected routes
 */
export async function mockAuthenticatedState(
  page: Page,
  options: {
    userId: string
    pubKeyX: string
    pubKeyY: string
    credentialId?: string
    sessionExpiry?: number
    jwt?: string
  }
): Promise<void> {
  await page.evaluate(
    ({ userId, pubKeyX, pubKeyY, credentialId, sessionExpiry, jwt }) => {
      // Mock passkey info
      localStorage.setItem(
        'passkeyInfo',
        JSON.stringify({
          credentialId: credentialId || 'mock-credential-id',
          userId,
          pubKeyX,
          pubKeyY,
        })
      )

      // Mock session key (ephemeral signer)
      if (sessionExpiry) {
        localStorage.setItem(
          'sessionKey',
          JSON.stringify({
            privateKey: '0x' + '0'.repeat(64), // Mock private key
            address: '0x' + '1'.repeat(40), // Mock address
            expiry: sessionExpiry,
          })
        )
      }

      // Mock JWT
      if (jwt) {
        localStorage.setItem('jwt', jwt)
      }
    },
    options
  )
}

/**
 * Clear all auth state from localStorage
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('passkeyInfo')
    localStorage.removeItem('sessionKey')
    localStorage.removeItem('jwt')
  })
}
