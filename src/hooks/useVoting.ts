/**
 * Hook for casting votes on-chain.
 * Assumes user is already logged in with valid session.
 * No more authorize-on-the-fly - that's handled by register/login pages.
 */

import { ethers } from 'ethers'
import { useState, useCallback } from 'react'
import { SCHELLING_POINT_VOTES_ABI } from '@/lib/contracts/SchellingPointVotes'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532)
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://sepolia.base.org'

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

/**
 * Generate topic ID from session UUID
 * topicId = keccak256(toUtf8Bytes(sessionUuid))
 */
export function getTopicId(sessionUuid: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(sessionUuid))
}

export function useVoting() {
  const [isVoting, setIsVoting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

  function getAuthData(): { passkeyInfo: PasskeyInfo; sessionKey: SessionKey } | null {
    const passkeyData = localStorage.getItem('passkeyInfo')
    const sessionData = localStorage.getItem('sessionKey')
    if (!passkeyData || !sessionData) return null
    try {
      return {
        passkeyInfo: JSON.parse(passkeyData),
        sessionKey: JSON.parse(sessionData)
      }
    } catch {
      return null
    }
  }

  /**
   * Cast a single vote
   * @param topicId - bytes32 topic ID (use getTopicId to convert from UUID)
   * @param value - vote value (0=remove, 1=favorite, 1-100=percentage)
   */
  const castVote = useCallback(async (topicId: string, value: number): Promise<string> => {
    if (!hasValidSession()) {
      throw new Error('Session expired. Please login again.')
    }

    setIsVoting(true)
    try {
      const auth = getAuthData()
      if (!auth) {
        throw new Error('Missing authentication data. Please login.')
      }

      const { passkeyInfo, sessionKey } = auth

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
          ['string', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'address'],
          ['vote', identityHash, topicId, value, nonce, CHAIN_ID, CONTRACT_ADDRESS]
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
          value,
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
  }, [])

  /**
   * Cast multiple votes in a single transaction
   * @param votes - array of { topicId, value } pairs
   */
  const batchVote = useCallback(async (votes: Array<{ topicId: string; value: number }>): Promise<string> => {
    if (!hasValidSession()) {
      throw new Error('Session expired. Please login again.')
    }

    if (votes.length === 0) {
      throw new Error('No votes to submit')
    }

    setIsVoting(true)
    try {
      const auth = getAuthData()
      if (!auth) {
        throw new Error('Missing authentication data. Please login.')
      }

      const { passkeyInfo, sessionKey } = auth

      // Get nonce
      const nonceResponse = await fetch(
        `/api/nonce?pubKeyX=${encodeURIComponent(passkeyInfo.pubKeyX)}&pubKeyY=${encodeURIComponent(passkeyInfo.pubKeyY)}`
      )
      const nonceData = await nonceResponse.json()
      if (!nonceResponse.ok) {
        throw new Error(nonceData.error || 'Failed to get nonce')
      }

      const nonce = nonceData.nonce

      // Build message for batch vote
      const identityHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint256'],
          [passkeyInfo.pubKeyX, passkeyInfo.pubKeyY]
        )
      )

      const topicIds = votes.map(v => v.topicId)
      const values = votes.map(v => v.value)

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
          [
            'batchVote',
            identityHash,
            ethers.keccak256(ethers.solidityPacked(['bytes32[]'], [topicIds])),
            ethers.keccak256(ethers.solidityPacked(['uint256[]'], [values])),
            nonce,
            CHAIN_ID,
            CONTRACT_ADDRESS
          ]
        )
      )

      // Sign with session key
      const signingKey = new ethers.SigningKey(sessionKey.privateKey)
      const sig = signingKey.sign(messageHash)

      const signature = ethers.hexlify(
        ethers.concat([sig.r, sig.s, new Uint8Array([sig.v])])
      )

      // Send to API
      const voteResponse = await fetch('/api/vote/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubKeyX: passkeyInfo.pubKeyX,
          pubKeyY: passkeyInfo.pubKeyY,
          signer: sessionKey.address,
          topicIds,
          values,
          signature
        })
      })

      const voteData = await voteResponse.json()
      if (!voteResponse.ok) {
        throw new Error(voteData.error || 'Batch vote failed')
      }

      return voteData.txHash

    } finally {
      setIsVoting(false)
    }
  }, [])

  /**
   * Get current votes for multiple topics from chain
   * @param topicIds - array of bytes32 topic IDs
   */
  const getVotes = useCallback(async (topicIds: string[]): Promise<Record<string, number>> => {
    if (topicIds.length === 0) {
      return {}
    }

    setIsLoading(true)
    try {
      const auth = getAuthData()
      if (!auth) {
        // Not logged in - return empty votes
        return {}
      }

      const { passkeyInfo } = auth

      // Create provider and contract instance
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, SCHELLING_POINT_VOTES_ABI, provider)

      // Call getVotes on contract
      const pubKey = [passkeyInfo.pubKeyX, passkeyInfo.pubKeyY]
      const values = await contract.getVotes(pubKey, topicIds)

      // Build result map
      const result: Record<string, number> = {}
      for (let i = 0; i < topicIds.length; i++) {
        result[topicIds[i]] = Number(values[i])
      }

      return result

    } catch (error) {
      console.error('Failed to get votes:', error)
      return {}
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get vote for a single topic
   */
  const getVote = useCallback(async (topicId: string): Promise<number> => {
    const votes = await getVotes([topicId])
    return votes[topicId] || 0
  }, [getVotes])

  return {
    hasPasskey,
    hasValidSession,
    castVote,
    batchVote,
    getVotes,
    getVote,
    getTopicId,
    isVoting,
    isLoading
  }
}
