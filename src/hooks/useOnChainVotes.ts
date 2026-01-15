/**
 * Hook for fetching and caching on-chain votes using React Query.
 * Provides caching, automatic refetching, and cache invalidation on vote mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { SCHELLING_POINT_VOTES_ABI } from '@/lib/contracts/SchellingPointVotes'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://sepolia.base.org'
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

/**
 * Convert session UUID to topic ID (bytes32 hash)
 */
export function getTopicId(sessionUuid: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(sessionUuid))
}

/**
 * Get passkey info from localStorage
 */
function getPasskeyInfo(): PasskeyInfo | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem('passkeyInfo')
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/**
 * Get session key from localStorage
 */
function getSessionKey(): SessionKey | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem('sessionKey')
  if (!data) return null
  try {
    const session: SessionKey = JSON.parse(data)
    // Check if session is still valid
    if (session.expiry <= Math.floor(Date.now() / 1000)) {
      return null
    }
    return session
  } catch {
    return null
  }
}

/**
 * Fetch votes from chain for given topic IDs
 */
async function fetchVotesFromChain(
  topicIds: string[],
  pubKeyX: string,
  pubKeyY: string
): Promise<Record<string, number>> {
  if (topicIds.length === 0) {
    return {}
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, SCHELLING_POINT_VOTES_ABI, provider)

  const pubKey = [pubKeyX, pubKeyY]
  const values = await contract.getVotes(pubKey, topicIds)

  const result: Record<string, number> = {}
  for (let i = 0; i < topicIds.length; i++) {
    result[topicIds[i]] = Number(values[i])
  }

  return result
}

/**
 * Query key factory for votes
 */
export const voteKeys = {
  all: ['votes'] as const,
  user: (pubKeyX: string, pubKeyY: string) => [...voteKeys.all, 'user', pubKeyX, pubKeyY] as const,
  sessions: (pubKeyX: string, pubKeyY: string, sessionIds: string[]) =>
    [...voteKeys.user(pubKeyX, pubKeyY), 'sessions', sessionIds.sort().join(',')] as const,
}

interface UseOnChainVotesOptions {
  /** Session UUIDs to fetch votes for */
  sessionIds: string[]
  /** Enable/disable the query (useful for conditional fetching) */
  enabled?: boolean
}

interface UseOnChainVotesResult {
  /** Votes by session UUID (not topic ID) */
  votes: Record<string, number>
  /** Votes by topic ID (bytes32 hash) */
  votesByTopicId: Record<string, number>
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Refetch function */
  refetch: () => void
  /** Whether the user is logged in with a passkey */
  isLoggedIn: boolean
}

/**
 * Hook for fetching on-chain votes with React Query caching.
 *
 * @example
 * ```tsx
 * const { votes, isLoading } = useOnChainVotes({
 *   sessionIds: ['uuid-1', 'uuid-2', 'uuid-3']
 * })
 *
 * // Access vote for a specific session
 * const voteCount = votes['uuid-1'] || 0
 * ```
 */
export function useOnChainVotes({ sessionIds, enabled = true }: UseOnChainVotesOptions): UseOnChainVotesResult {
  const passkeyInfo = getPasskeyInfo()
  const isLoggedIn = !!passkeyInfo

  // Convert session UUIDs to topic IDs
  const topicIdMap = sessionIds.reduce((acc, sessionId) => {
    acc[sessionId] = getTopicId(sessionId)
    return acc
  }, {} as Record<string, string>)

  const topicIds = Object.values(topicIdMap)

  const query = useQuery({
    queryKey: passkeyInfo
      ? voteKeys.sessions(passkeyInfo.pubKeyX, passkeyInfo.pubKeyY, sessionIds)
      : ['votes', 'anonymous'],
    queryFn: async () => {
      if (!passkeyInfo) {
        return {} as Record<string, number>
      }
      return fetchVotesFromChain(topicIds, passkeyInfo.pubKeyX, passkeyInfo.pubKeyY)
    },
    enabled: enabled && sessionIds.length > 0,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  })

  // Map topic IDs back to session UUIDs
  const votes: Record<string, number> = {}
  if (query.data) {
    for (const [sessionId, topicId] of Object.entries(topicIdMap)) {
      votes[sessionId] = query.data[topicId] || 0
    }
  }

  return {
    votes,
    votesByTopicId: query.data || {},
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    isLoggedIn,
  }
}

interface CastVoteParams {
  /** Session UUID */
  sessionId: string
  /** Vote value (0=remove, 1-100=vote amount) */
  value: number
}

interface UseVoteMutationResult {
  /** Cast a single vote */
  castVote: (params: CastVoteParams) => Promise<string>
  /** Cast multiple votes */
  castBatchVotes: (votes: CastVoteParams[]) => Promise<string>
  /** Mutation is in progress */
  isPending: boolean
  /** Last error */
  error: Error | null
  /** Reset mutation state */
  reset: () => void
}

/**
 * Hook for casting votes with automatic cache invalidation.
 *
 * @example
 * ```tsx
 * const { castVote, isPending } = useVoteMutation()
 *
 * const handleVote = async () => {
 *   try {
 *     const txHash = await castVote({ sessionId: 'uuid-1', value: 5 })
 *     console.log('Vote cast:', txHash)
 *   } catch (error) {
 *     console.error('Vote failed:', error)
 *   }
 * }
 * ```
 */
export function useVoteMutation(): UseVoteMutationResult {
  const queryClient = useQueryClient()

  const singleVoteMutation = useMutation({
    mutationFn: async ({ sessionId, value }: CastVoteParams): Promise<string> => {
      const passkeyInfo = getPasskeyInfo()
      const sessionKey = getSessionKey()

      if (!passkeyInfo) {
        throw new Error('No passkey found. Please login.')
      }

      if (!sessionKey) {
        throw new Error('Session expired. Please login again.')
      }

      const topicId = getTopicId(sessionId)

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

      // Sign with session key
      const signingKey = new ethers.SigningKey(sessionKey.privateKey)
      const sig = signingKey.sign(messageHash)

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
    },
    onMutate: async ({ sessionId, value }: CastVoteParams) => {
      const passkeyInfo = getPasskeyInfo()
      if (!passkeyInfo) return {}

      const topicId = getTopicId(sessionId)

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: voteKeys.user(passkeyInfo.pubKeyX, passkeyInfo.pubKeyY) })

      // Snapshot previous value - get all cached queries for this user
      const previousVotes: Record<string, Record<string, number>> = {}
      const queries = queryClient.getQueriesData<Record<string, number>>({
        queryKey: voteKeys.user(passkeyInfo.pubKeyX, passkeyInfo.pubKeyY)
      })

      for (const [key, data] of queries) {
        if (data) {
          previousVotes[JSON.stringify(key)] = data
        }
      }

      // Optimistically update all matching caches
      queryClient.setQueriesData<Record<string, number>>(
        { queryKey: voteKeys.user(passkeyInfo.pubKeyX, passkeyInfo.pubKeyY) },
        (old) => {
          if (!old) return old
          return {
            ...old,
            [topicId]: value
          }
        }
      )

      // Return context with previous value for rollback
      return { previousVotes, passkeyInfo }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousVotes && context?.passkeyInfo) {
        for (const [keyStr, data] of Object.entries(context.previousVotes)) {
          const key = JSON.parse(keyStr)
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSuccess: () => {
      // Don't invalidate - trust optimistic update
      // Data will refresh after stale time (1 minute) or on page reload
    },
  })

  const batchVoteMutation = useMutation({
    mutationFn: async (votes: CastVoteParams[]): Promise<string> => {
      const passkeyInfo = getPasskeyInfo()
      const sessionKey = getSessionKey()

      if (!passkeyInfo) {
        throw new Error('No passkey found. Please login.')
      }

      if (!sessionKey) {
        throw new Error('Session expired. Please login again.')
      }

      if (votes.length === 0) {
        throw new Error('No votes to submit')
      }

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

      const topicIds = votes.map(v => getTopicId(v.sessionId))
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
    },
    onMutate: async (votes: CastVoteParams[]) => {
      const passkeyInfo = getPasskeyInfo()
      if (!passkeyInfo || votes.length === 0) return {}

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: voteKeys.user(passkeyInfo.pubKeyX, passkeyInfo.pubKeyY) })

      // Snapshot previous value - get all cached queries for this user
      const previousVotes: Record<string, Record<string, number>> = {}
      const queries = queryClient.getQueriesData<Record<string, number>>({
        queryKey: voteKeys.user(passkeyInfo.pubKeyX, passkeyInfo.pubKeyY)
      })

      for (const [key, data] of queries) {
        if (data) {
          previousVotes[JSON.stringify(key)] = data
        }
      }

      // Build updates map from votes
      const updates: Record<string, number> = {}
      for (const vote of votes) {
        const topicId = getTopicId(vote.sessionId)
        updates[topicId] = vote.value
      }

      // Optimistically update all matching caches
      queryClient.setQueriesData<Record<string, number>>(
        { queryKey: voteKeys.user(passkeyInfo.pubKeyX, passkeyInfo.pubKeyY) },
        (old) => {
          if (!old) return old
          return {
            ...old,
            ...updates
          }
        }
      )

      // Return context with previous value for rollback
      return { previousVotes, passkeyInfo }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousVotes && context?.passkeyInfo) {
        for (const [keyStr, data] of Object.entries(context.previousVotes)) {
          const key = JSON.parse(keyStr)
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSuccess: () => {
      // Don't invalidate - trust optimistic update
      // Data will refresh after stale time (1 minute) or on page reload
    },
  })

  return {
    castVote: singleVoteMutation.mutateAsync,
    castBatchVotes: batchVoteMutation.mutateAsync,
    isPending: singleVoteMutation.isPending || batchVoteMutation.isPending,
    error: (singleVoteMutation.error || batchVoteMutation.error) as Error | null,
    reset: () => {
      singleVoteMutation.reset()
      batchVoteMutation.reset()
    },
  }
}

/**
 * Hook to prefetch votes for upcoming navigation or anticipated user actions.
 *
 * @example
 * ```tsx
 * const prefetchVotes = usePrefetchVotes()
 *
 * // Prefetch votes when hovering over a session list
 * onMouseEnter={() => prefetchVotes(['uuid-1', 'uuid-2'])}
 * ```
 */
export function usePrefetchVotes() {
  const queryClient = useQueryClient()

  return async (sessionIds: string[]) => {
    const passkeyInfo = getPasskeyInfo()
    if (!passkeyInfo || sessionIds.length === 0) return

    const topicIds = sessionIds.map(getTopicId)

    await queryClient.prefetchQuery({
      queryKey: voteKeys.sessions(passkeyInfo.pubKeyX, passkeyInfo.pubKeyY, sessionIds),
      queryFn: () => fetchVotesFromChain(topicIds, passkeyInfo.pubKeyX, passkeyInfo.pubKeyY),
      staleTime: 60 * 1000, // 1 minute
    })
  }
}

/**
 * Hook to manually invalidate vote cache.
 * Useful after external state changes (e.g., user logs out and back in).
 */
export function useInvalidateVotes() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: voteKeys.all })
  }
}
