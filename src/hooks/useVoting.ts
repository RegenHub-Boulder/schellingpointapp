/**
 * Hook for casting votes on-chain.
 * Assumes user is already logged in with valid session.
 * No more authorize-on-the-fly - that's handled by register/login pages.
 */

import { ethers } from 'ethers'
import { useState } from 'react'

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
  const [isVoting, setIsVoting] = useState(false)

  function hasPasskey(): boolean {
    return !!localStorage.getItem('passkeyInfo')
  }

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

  async function castVote(topicId: number, amount: number): Promise<string> {
    // No more on-the-fly auth - user should already be logged in
    if (!hasValidSession()) {
      throw new Error('Session expired. Please login again.')
    }

    setIsVoting(true)
    try {
      const passkeyData = localStorage.getItem('passkeyInfo')
      const sessionData = localStorage.getItem('sessionKey')

      if (!passkeyData || !sessionData) {
        throw new Error('Missing authentication data. Please login.')
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
    castVote,
    isVoting
  }
}
