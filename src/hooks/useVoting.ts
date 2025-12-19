import { ethers } from 'ethers'
import { useState } from 'react'
import { base64UrlToArrayBuffer, arrayBufferToHex } from '@/lib/webauthn'

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

export function useVoting() {
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [isVoting, setIsVoting] = useState(false)

  function hasValidSession(): boolean {
    const sessionData = localStorage.getItem('sessionKey')
    if (!sessionData) return false
    try {
      const session: SessionKey = JSON.parse(sessionData)
      return session.expiry > Math.floor(Date.now() / 1000)
    } catch {
      return false
    }
  }

  function hasPasskey(): boolean {
    return !!localStorage.getItem('passkeyInfo')
  }

  async function authorizeSession(): Promise<void> {
    setIsAuthorizing(true)
    try {
      const passkeyData = localStorage.getItem('passkeyInfo')
      if (!passkeyData) {
        throw new Error('No passkey found. Please register first.')
      }

      const passkeyInfo: PasskeyInfo = JSON.parse(passkeyData)

      // Generate ephemeral wallet
      const ephemeralWallet = ethers.Wallet.createRandom()
      const expiry = Math.floor(Date.now() / 1000) + 24 * 60 * 60

      // Build challenge: keccak256(abi.encode(signer, expiry, chainid, contract))
      // This is what the contract expects in clientDataJSON
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

      // Store session key
      localStorage.setItem('sessionKey', JSON.stringify({
        privateKey: ephemeralWallet.privateKey,
        address: ephemeralWallet.address,
        expiry
      }))

    } finally {
      setIsAuthorizing(false)
    }
  }

  async function castVote(topicId: number, amount: number): Promise<string> {
    if (!hasValidSession()) {
      await authorizeSession()
    }

    setIsVoting(true)
    try {
      const passkeyData = localStorage.getItem('passkeyInfo')
      const sessionData = localStorage.getItem('sessionKey')

      if (!passkeyData || !sessionData) {
        throw new Error('Missing authentication data')
      }

      const passkeyInfo: PasskeyInfo = JSON.parse(passkeyData)
      const sessionKey: SessionKey = JSON.parse(sessionData)

      // Get nonce
      const nonceResponse = await fetch(
        `/api/nonce?pubKeyX=${encodeURIComponent(passkeyInfo.pubKeyX)}&pubKeyY=${encodeURIComponent(passkeyInfo.pubKeyY)}`
      )
      const nonceData = await nonceResponse.json()
      if (!nonceResponse.ok) {
        throw new Error(nonceData.error || 'Failed to get nonce')
      }

      const nonce = nonceData.nonce

      // Build message
      const identityHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint256'],
          [passkeyInfo.pubKeyX, passkeyInfo.pubKeyY]
        )
      )

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'address'],
          ['vote', identityHash, topicId, amount, nonce, CHAIN_ID, CONTRACT_ADDRESS]
        )
      )

      // Sign with session key (raw sign, NOT signMessage which adds EIP-191 prefix)
      const signingKey = new ethers.SigningKey(sessionKey.privateKey)
      const sig = signingKey.sign(messageHash)

      // Format as 65-byte signature: r (32) || s (32) || v (1)
      // Use hexlify for proper JSON serialization
      const signature = ethers.hexlify(
        ethers.concat([sig.r, sig.s, new Uint8Array([sig.v])])
      )

      // Send to API
      const voteResponse = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubKeyX: passkeyInfo.pubKeyX,
          pubKeyY: passkeyInfo.pubKeyY,
          signer: sessionKey.address,
          topicId,
          amount,
          signature
        })
      })

      const voteData = await voteResponse.json()
      if (!voteResponse.ok) {
        throw new Error(voteData.error || 'Vote failed')
      }

      return voteData.txHash

    } finally {
      setIsVoting(false)
    }
  }

  return {
    hasPasskey,
    hasValidSession,
    authorizeSession,
    castVote,
    isAuthorizing,
    isVoting
  }
}
