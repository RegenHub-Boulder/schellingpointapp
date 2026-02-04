'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { EVENT_ID } from '@/lib/contracts/SchellingPointQV'

/**
 * useVotes - single hook for quadratic voting allocations
 *
 * Features:
 * - Fetches allocations from GET /api/votes
 * - Optimistic updates via React Query cache
 * - 2s debounce timer before flushing to backend
 * - flush() on beforeunload + Next.js route change
 * - Returns both credits and vote counts (votes = sqrt(credits))
 */

const DEBOUNCE_MS = 2000
const TOTAL_BUDGET = 100

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface UseVotesOptions {
  sessionIds: string[] // session UUIDs
}

interface UseVotesReturn {
  /** Credits allocated per session (by session UUID) */
  allocations: Record<string, number>
  /** Vote display values per session (sqrt of credits, for UI) */
  votes: Record<string, number>
  /** Total credits spent */
  creditsSpent: number
  /** Credits remaining (budget - spent) */
  creditsRemaining: number
  /** Set vote count for a session — credits = votes squared */
  setVotes: (sessionId: string, voteCount: number) => void
  /** Immediately flush pending changes to backend */
  flush: () => Promise<void>
  /** Data is loading from backend */
  isLoading: boolean
  /** Changes are being synced to chain */
  isSyncing: boolean
  /** Last error */
  error: Error | null
}

/** Server response shape from GET /api/votes */
interface VotesApiResponse {
  allocations: Record<string, number> // topicId -> credits
  remainingBudget: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a session UUID to a bytes32 topic ID.
 */
export function getTopicId(sessionUuid: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(sessionUuid))
}

/**
 * Credits to vote count: floor(sqrt(credits))
 */
function creditsToVotes(credits: number): number {
  return Math.floor(Math.sqrt(credits))
}

/**
 * Vote count to credits: votes^2
 */
function votesToCredits(voteCount: number): number {
  return voteCount * voteCount
}

/**
 * Read passkey info from localStorage.
 */
function getPasskeyInfo(): PasskeyInfo | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem('passkeyInfo')
  if (!data) return null
  try {
    return JSON.parse(data) as PasskeyInfo
  } catch {
    return null
  }
}

/**
 * Read session key from localStorage, returning null if missing or expired.
 */
function getSessionKey(): SessionKey | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem('sessionKey')
  if (!data) return null
  try {
    const session: SessionKey = JSON.parse(data)
    if (session.expiry <= Math.floor(Date.now() / 1000)) {
      return null
    }
    return session
  } catch {
    return null
  }
}

/**
 * Build the bidirectional mapping between session UUIDs and topic IDs.
 */
function buildTopicMaps(sessionIds: string[]) {
  const sessionToTopic: Record<string, string> = {}
  const topicToSession: Record<string, string> = {}
  for (const sid of sessionIds) {
    const tid = getTopicId(sid)
    sessionToTopic[sid] = tid
    topicToSession[tid] = sid
  }
  return { sessionToTopic, topicToSession }
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

const voteQueryKeys = {
  all: ['votes'] as const,
  event: (sessionIds: string[]) =>
    ['votes', EVENT_ID, ...sessionIds.sort()] as const,
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVotes({ sessionIds }: UseVotesOptions): UseVotesReturn {
  const queryClient = useQueryClient()

  // ---- Stable references for topic mapping ----
  const { sessionToTopic, topicToSession } = useMemo(
    () => buildTopicMaps(sessionIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionIds.sort().join(',')],
  )

  const topicIds = useMemo(
    () => sessionIds.map((sid) => sessionToTopic[sid]),
    [sessionIds, sessionToTopic],
  )

  // ---- Local state for syncing indicator and errors ----
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // ---- Pending changes ref (sessionId -> credits) ----
  const pendingRef = useRef<Record<string, number>>({})
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- React Query: fetch current allocations from backend ----
  const queryKey = voteQueryKeys.event(sessionIds)

  const query = useQuery<Record<string, number>>({
    queryKey,
    queryFn: async (): Promise<Record<string, number>> => {
      if (topicIds.length === 0) return {}

      const token =
        typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(
        `/api/votes?topicIds=${topicIds.map(encodeURIComponent).join(',')}`,
        { headers },
      )

      if (response.status === 401) {
        // Not authenticated - return zeroes
        return {}
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error || `Failed to fetch votes (${response.status})`,
        )
      }

      const data: VotesApiResponse = await response.json()

      // data.allocations is keyed by topicId. We store it as-is in the cache
      // (the mapping to session UUIDs happens in the derived values below).
      return data.allocations ?? {}
    },
    enabled: sessionIds.length > 0,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // ---- Derived: allocations & votes keyed by session UUID ----
  const allocations = useMemo(() => {
    const result: Record<string, number> = {}
    const cached = query.data ?? {}
    for (const sessionId of sessionIds) {
      const topicId = sessionToTopic[sessionId]
      result[sessionId] = cached[topicId] ?? 0
    }
    return result
  }, [query.data, sessionIds, sessionToTopic])

  const votes = useMemo(() => {
    const result: Record<string, number> = {}
    for (const [sessionId, credits] of Object.entries(allocations)) {
      result[sessionId] = creditsToVotes(credits)
    }
    return result
  }, [allocations])

  const creditsSpent = useMemo(
    () => Object.values(allocations).reduce((sum, c) => sum + c, 0),
    [allocations],
  )

  const creditsRemaining = TOTAL_BUDGET - creditsSpent

  // ---- flush: send all pending changes to backend ----
  const flush = useCallback(async (): Promise<void> => {
    // Grab and clear pending changes atomically
    const pending = { ...pendingRef.current }
    pendingRef.current = {}

    // Cancel any running debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const entries = Object.entries(pending)
    if (entries.length === 0) return

    setIsSyncing(true)
    setError(null)

    try {
      const passkeyInfo = getPasskeyInfo()
      const sessionKey = getSessionKey()

      if (!passkeyInfo) {
        throw new Error('No passkey found. Please login.')
      }
      if (!sessionKey) {
        throw new Error('Session expired. Please login again.')
      }

      // Build arrays for the batch allocate call
      const topicIdsArray: string[] = []
      const creditsArray: number[] = []

      for (const [sessionId, credits] of entries) {
        topicIdsArray.push(sessionToTopic[sessionId])
        creditsArray.push(credits)
      }

      // Compute identity hash
      const identityHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint256'],
          [passkeyInfo.pubKeyX, passkeyInfo.pubKeyY],
        ),
      )

      // Build the message hash for batchAllocate
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          [
            'string',
            'bytes32',
            'uint256',
            'bytes32',
            'bytes32',
            'uint256',
            'address',
          ],
          [
            'batchAllocate',
            identityHash,
            EVENT_ID,
            ethers.keccak256(
              ethers.solidityPacked(['bytes32[]'], [topicIdsArray]),
            ),
            ethers.keccak256(
              ethers.solidityPacked(['uint256[]'], [creditsArray]),
            ),
            CHAIN_ID,
            CONTRACT_ADDRESS,
          ],
        ),
      )

      // Sign with ephemeral session key (raw sign, no EIP-191 prefix)
      const signingKey = new ethers.SigningKey(sessionKey.privateKey)
      const sig = signingKey.sign(messageHash)
      const signature = ethers.hexlify(
        ethers.concat([sig.r, sig.s, new Uint8Array([sig.v])]),
      )

      // Get auth token for the HTTP call
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('authToken')
          : null

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/vote/allocate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pubKeyX: passkeyInfo.pubKeyX,
          pubKeyY: passkeyInfo.pubKeyY,
          signer: sessionKey.address,
          topicIds: topicIdsArray,
          credits: creditsArray,
          signature,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error ||
            `Allocate failed (${response.status})`,
        )
      }

      // Success - pending is already cleared. The optimistic cache is up-to-date.
    } catch (err) {
      const flushError =
        err instanceof Error ? err : new Error('Flush failed')
      setError(flushError)
      console.error('[useVotes] flush error:', flushError)

      // Restore pending changes so they can be retried
      for (const [sessionId, credits] of entries) {
        // Only restore if the user hasn't already set a new value
        if (pendingRef.current[sessionId] === undefined) {
          pendingRef.current[sessionId] = credits
        }
      }

      // Invalidate cache to refetch from the backend (source of truth)
      queryClient.invalidateQueries({ queryKey })
    } finally {
      setIsSyncing(false)
    }
  }, [sessionToTopic, queryClient, queryKey])

  // Keep a stable ref to flush so effects and callbacks never go stale
  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  // ---- setVotes: optimistic update + debounced flush ----
  const setVotesForSession = useCallback(
    (sessionId: string, voteCount: number) => {
      const credits = votesToCredits(voteCount)

      // 1. Track the pending change
      pendingRef.current[sessionId] = credits

      // 2. Optimistically update the React Query cache
      const topicId = sessionToTopic[sessionId]
      if (topicId) {
        queryClient.setQueryData<Record<string, number>>(queryKey, (old) => {
          const current = old ?? {}
          return {
            ...current,
            [topicId]: credits,
          }
        })
      }

      // 3. Clear any existing error since the user is making new changes
      setError(null)

      // 4. Reset the debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        flushRef.current()
      }, DEBOUNCE_MS)
    },
    [sessionToTopic, queryClient, queryKey],
  )

  // ---- beforeunload: flush on page leave ----
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (Object.keys(pendingRef.current).length > 0) {
        // Fire-and-forget. We cannot await here, but the request
        // will be queued by the browser before the page unloads.
        flushRef.current()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // ---- Cleanup: flush on unmount (covers Next.js route changes) ----
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (Object.keys(pendingRef.current).length > 0) {
        // Fire-and-forget flush on unmount
        flushRef.current()
      }
    }
  }, [])

  return {
    allocations,
    votes,
    creditsSpent,
    creditsRemaining,
    setVotes: setVotesForSession,
    flush,
    isLoading: query.isLoading,
    isSyncing,
    error,
  }
}
