/**
 * Shared auth flow hook for register and login pages.
 * Handles: authorize ephemeral signer → login (get JWT)
 *
 * "Logged in" = valid JWT + authorized ephemeral signer
 */

import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { base64UrlToArrayBuffer, arrayBufferToHex, arrayBufferToBase64Url } from '@/lib/webauthn'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532)

interface PasskeyInfo {
  credentialId: string
  userId: string
  pubKeyX: string
  pubKeyY: string
}

interface SessionKey {
  privateKey: string
  address: string
  expiry: number
}

export type AuthFlowStatus = 'idle' | 'recovering' | 'authorizing' | 'logging-in' | 'success' | 'error'

export function useAuthFlow() {
  const [status, setStatus] = useState<AuthFlowStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  /**
   * Recover passkey info using discoverable credentials (for login when localStorage is empty)
   */
  const recoverPasskeyInfo = useCallback(async (): Promise<PasskeyInfo> => {
    // Use discoverable credentials - let user select their passkey
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        userVerification: 'required',
        timeout: 60000
        // No allowCredentials - this makes it discoverable
      }
    }) as PublicKeyCredential

    if (!assertion) {
      throw new Error('Authentication cancelled')
    }

    // Get credential ID
    const credentialId = arrayBufferToBase64Url(assertion.rawId)

    // Look up user by credential ID
    const lookupResponse = await fetch('/api/auth/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId })
    })

    if (!lookupResponse.ok) {
      const data = await lookupResponse.json()
      throw new Error(data.error || 'User not found. Please register first.')
    }

    const userData = await lookupResponse.json()

    const passkeyInfo: PasskeyInfo = {
      credentialId: userData.credentialId,
      userId: userData.userId,
      pubKeyX: userData.pubKeyX,
      pubKeyY: userData.pubKeyY
    }

    // Store in localStorage
    localStorage.setItem('passkeyInfo', JSON.stringify(passkeyInfo))

    return passkeyInfo
  }, [])

  /**
   * Authorize ephemeral signer on-chain (requires Face ID)
   */
  const authorizeSession = useCallback(async (passkeyInfo: PasskeyInfo): Promise<SessionKey> => {
    // Generate ephemeral wallet
    const ephemeralWallet = ethers.Wallet.createRandom()
    const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days

    // Build challenge: keccak256(abi.encode(signer, expiry, chainid, contract))
    const expectedChallenge = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'uint256', 'address'],
        [ephemeralWallet.address, expiry, CHAIN_ID, CONTRACT_ADDRESS]
      )
    )

    // Convert to ArrayBuffer for WebAuthn
    const challengeBytes = ethers.getBytes(expectedChallenge)
    const challenge = challengeBytes.buffer.slice(
      challengeBytes.byteOffset,
      challengeBytes.byteOffset + challengeBytes.byteLength
    )

    // Request WebAuthn signature
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge as ArrayBuffer,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: base64UrlToArrayBuffer(passkeyInfo.credentialId),
          type: 'public-key'
        }],
        userVerification: 'required',
        timeout: 60000
      }
    }) as PublicKeyCredential

    if (!assertion) {
      throw new Error('Authentication cancelled')
    }

    const response = assertion.response as AuthenticatorAssertionResponse

    // Get authenticatorData as hex
    const authenticatorData = arrayBufferToHex(response.authenticatorData)

    // Get clientDataJSON as string
    const clientDataJSON = new TextDecoder().decode(response.clientDataJSON)

    // Parse DER signature to get r, s
    const sigBytes = new Uint8Array(response.signature)
    let offset = 2
    if (sigBytes[1] & 0x80) offset++

    const rLen = sigBytes[offset + 1]
    const rStart = offset + 2
    let r = sigBytes.slice(rStart, rStart + rLen)

    offset = rStart + rLen
    const sLen = sigBytes[offset + 1]
    const sStart = offset + 2
    let s = sigBytes.slice(sStart, sStart + sLen)

    // Remove leading zeros if present
    if (r[0] === 0 && r.length > 32) r = r.slice(1)
    if (s[0] === 0 && s.length > 32) s = s.slice(1)

    // Pad to 32 bytes
    const rPadded = new Uint8Array(32)
    const sPadded = new Uint8Array(32)
    rPadded.set(r, 32 - r.length)
    sPadded.set(s, 32 - s.length)

    const rHex = '0x' + Array.from(rPadded).map(b => b.toString(16).padStart(2, '0')).join('')
    const sHex = '0x' + Array.from(sPadded).map(b => b.toString(16).padStart(2, '0')).join('')

    // Send to API
    const authResponse = await fetch('/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pubKeyX: passkeyInfo.pubKeyX,
        pubKeyY: passkeyInfo.pubKeyY,
        signer: ephemeralWallet.address,
        expiry,
        authenticatorData,
        clientDataJSON,
        r: rHex,
        s: sHex
      })
    })

    const data = await authResponse.json()
    if (!authResponse.ok) {
      throw new Error(data.error || 'Authorization failed')
    }

    const sessionKey: SessionKey = {
      privateKey: ephemeralWallet.privateKey,
      address: ephemeralWallet.address,
      expiry
    }

    // Store session key
    localStorage.setItem('sessionKey', JSON.stringify(sessionKey))

    return sessionKey
  }, [])

  /**
   * Login with ephemeral signer to get JWT
   */
  const login = useCallback(async (passkeyInfo: PasskeyInfo, sessionKey: SessionKey): Promise<void> => {
    // Get challenge from server
    const challengeResponse = await fetch('/api/login/challenge')
    if (!challengeResponse.ok) {
      throw new Error('Failed to get login challenge')
    }
    const { challengeId, challenge } = await challengeResponse.json()

    // Sign challenge with ephemeral signer
    const messageHash = ethers.keccak256(
      ethers.toUtf8Bytes(`login:${challenge}`)
    )
    const signingKey = new ethers.SigningKey(sessionKey.privateKey)
    const sig = signingKey.sign(messageHash)
    const signature = ethers.Signature.from(sig).serialized

    // Send to login endpoint
    const loginResponse = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pubKeyX: passkeyInfo.pubKeyX,
        pubKeyY: passkeyInfo.pubKeyY,
        signer: sessionKey.address,
        challengeId,
        signature
      })
    })

    if (!loginResponse.ok) {
      const error = await loginResponse.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await loginResponse.json()

    // Store token
    localStorage.setItem('authToken', data.token)
  }, [])

  /**
   * Complete auth flow: authorize (if needed) → login
   * Call this after passkey is created/recovered.
   * Skips authorization if a valid sessionKey already exists in localStorage.
   */
  const completeAuthFlow = useCallback(async (passkeyInfo: PasskeyInfo): Promise<void> => {
    setError(null)

    try {
      // Check for existing valid session key
      let sessionKey: SessionKey | null = null
      const storedSession = localStorage.getItem('sessionKey')
      if (storedSession) {
        try {
          const parsed: SessionKey = JSON.parse(storedSession)
          const currentTime = Math.floor(Date.now() / 1000)
          if (parsed.expiry > currentTime) {
            sessionKey = parsed
          }
        } catch {
          // Invalid stored data, will re-authorize
        }
      }

      if (!sessionKey) {
        // No valid session key — authorize a new ephemeral signer (Face ID)
        setStatus('authorizing')
        sessionKey = await authorizeSession(passkeyInfo)
      }

      // Login to get JWT
      setStatus('logging-in')
      await login(passkeyInfo, sessionKey)

      setStatus('success')
    } catch (err) {
      setStatus('error')
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
      throw err
    }
  }, [authorizeSession, login])

  /**
   * Full login flow for returning users (with optional passkey recovery)
   */
  const loginFlow = useCallback(async (): Promise<void> => {
    setError(null)

    try {
      // Check for existing passkey info
      let passkeyInfo: PasskeyInfo
      const stored = localStorage.getItem('passkeyInfo')

      if (stored) {
        passkeyInfo = JSON.parse(stored)
      } else {
        // Recover via discoverable credentials (Step 1)
        setStatus('recovering')
        passkeyInfo = await recoverPasskeyInfo()
      }

      // Authorize + login (Step 2)
      await completeAuthFlow(passkeyInfo)
    } catch (err) {
      setStatus('error')
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    }
  }, [recoverPasskeyInfo, completeAuthFlow])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  return {
    status,
    error,
    recoverPasskeyInfo,
    authorizeSession,
    login,
    completeAuthFlow,
    loginFlow,
    reset,
    isLoading: status === 'recovering' || status === 'authorizing' || status === 'logging-in'
  }
}
