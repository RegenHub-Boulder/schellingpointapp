import { ethers } from 'ethers'
import { useState } from 'react'
import { formatWebAuthnSignature, arrayBufferToBase64Url, base64UrlToArrayBuffer } from '@/lib/webauthn'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!

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

export function useVoting() {
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [isVoting, setIsVoting] = useState(false)

  // Check if we have a valid session in localStorage
  function hasValidSession(): boolean {
    const sessionData = localStorage.getItem('sessionKey')
    if (!sessionData) return false

    try {
      const session: SessionKey = JSON.parse(sessionData)
      const currentTime = Math.floor(Date.now() / 1000)
      return session.expiry > currentTime
    } catch {
      return false
    }
  }

  // Authorize ephemeral signer (requires Face ID)
  async function authorizeSession(): Promise<void> {
    setIsAuthorizing(true)
    try {
      // 1. Get passkey from localStorage
      const passkeyData = localStorage.getItem('passkeyInfo')
      if (!passkeyData) {
        throw new Error('No passkey found. Please register first.')
      }

      const passkeyInfo: PasskeyInfo = JSON.parse(passkeyData)

      // 2. Generate ephemeral wallet (valid for 7 days)
      const ephemeralWallet = ethers.Wallet.createRandom()
      const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days from now

      // 3. Build message for passkey to sign
      // The contract expects a message of: keccak256(abi.encodePacked(signer, expiry))
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'uint256'],
          [ephemeralWallet.address, expiry]
        )
      )

      // Convert to buffer for WebAuthn
      const challengeBytes = ethers.getBytes(messageHash)
      const challenge = challengeBytes.buffer.slice(
        challengeBytes.byteOffset,
        challengeBytes.byteOffset + challengeBytes.byteLength
      )

      // 4. Trigger WebAuthn authentication (Face ID)
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

      // Extract signature from WebAuthn response
      const response = assertion.response as AuthenticatorAssertionResponse
      const signatureHex = formatWebAuthnSignature(response.signature)

      // Parse signature into r and s (each 32 bytes)
      const r = '0x' + signatureHex.slice(2, 66) // First 32 bytes
      const s = '0x' + signatureHex.slice(66, 130) // Second 32 bytes

      // 5. POST to /api/authorize
      const authResponse = await fetch('/api/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pubKeyX: passkeyInfo.pubKeyX,
          pubKeyY: passkeyInfo.pubKeyY,
          signer: ephemeralWallet.address,
          expiry,
          signature: [r, s]
        })
      })

      const data = await authResponse.json()

      if (!authResponse.ok) {
        throw new Error(data.error || 'Authorization failed')
      }

      // 6. Store session key in localStorage
      const sessionKey: SessionKey = {
        privateKey: ephemeralWallet.privateKey,
        address: ephemeralWallet.address,
        expiry
      }

      localStorage.setItem('sessionKey', JSON.stringify(sessionKey))
      localStorage.setItem('passkeyInfo', JSON.stringify(passkeyInfo))

    } finally {
      setIsAuthorizing(false)
    }
  }

  // Cast vote (uses session key, no Face ID)
  async function castVote(topicId: number, amount: number): Promise<string> {
    if (!hasValidSession()) {
      throw new Error('No valid session - call authorizeSession first')
    }

    setIsVoting(true)
    try {
      // 1. Get passkey and session from localStorage
      const passkeyData = localStorage.getItem('passkeyInfo')
      const sessionData = localStorage.getItem('sessionKey')

      if (!passkeyData || !sessionData) {
        throw new Error('Missing authentication data')
      }

      const passkeyInfo: PasskeyInfo = JSON.parse(passkeyData)
      const sessionKey: SessionKey = JSON.parse(sessionData)

      // 2. Get nonce from /api/nonce
      const nonceResponse = await fetch(
        `/api/nonce?pubKeyX=${encodeURIComponent(passkeyInfo.pubKeyX)}&pubKeyY=${encodeURIComponent(passkeyInfo.pubKeyY)}`
      )

      const nonceData = await nonceResponse.json()

      if (!nonceResponse.ok) {
        throw new Error(nonceData.error || 'Failed to get nonce')
      }

      const nonce = nonceData.nonce

      // 3. Build and sign message with session key
      // The contract expects: keccak256(abi.encodePacked(topicId, amount, nonce))
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['uint256', 'int256', 'uint256'],
          [topicId, amount, nonce]
        )
      )

      // Sign with ephemeral wallet
      const wallet = new ethers.Wallet(sessionKey.privateKey)
      const signature = await wallet.signMessage(ethers.getBytes(messageHash))

      // Parse ECDSA signature into r, s, v
      const sig = ethers.Signature.from(signature)

      // 4. POST to /api/vote
      const voteResponse = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pubKeyX: passkeyInfo.pubKeyX,
          pubKeyY: passkeyInfo.pubKeyY,
          signer: sessionKey.address,
          topicId,
          amount,
          signature: [sig.r, sig.s]
        })
      })

      const voteData = await voteResponse.json()

      if (!voteResponse.ok) {
        throw new Error(voteData.error || 'Vote failed')
      }

      // 5. Return txHash
      return voteData.txHash

    } finally {
      setIsVoting(false)
    }
  }

  return {
    hasValidSession,
    authorizeSession,
    castVote,
    isAuthorizing,
    isVoting
  }
}
