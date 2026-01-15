'use client'

import { useState, useEffect, useCallback } from 'react'
import { EVENT_SLUG } from '@/lib/config'

export interface Vote {
  sessionId: string
  voteCount: number
  creditsSpent: number
  updatedAt: string
  session: {
    id: string
    title: string
    format: string
    duration: number
  } | null
}

export interface VoteBalance {
  creditsSpent: number
  creditsRemaining: number
  totalCredits: number
}

interface UseVotesReturn {
  votes: Vote[]
  balance: VoteBalance
  loading: boolean
  error: string | null
  castVote: (sessionId: string, voteCount: number) => Promise<{ success: boolean; error?: string }>
  getVoteForSession: (sessionId: string) => number
  refetch: () => Promise<void>
}

export function useVotes(slug: string = EVENT_SLUG): UseVotesReturn {
  const [votes, setVotes] = useState<Vote[]>([])
  const [balance, setBalance] = useState<VoteBalance>({
    creditsSpent: 0,
    creditsRemaining: 100,
    totalCredits: 100,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVotes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/events/${slug}/votes/me`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (response.status === 401) {
        // User not authenticated - that's okay, just return empty
        setVotes([])
        setLoading(false)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch votes')
      }

      const data = await response.json()
      setVotes(data.votes || [])
      setBalance(data.balance || { creditsSpent: 0, creditsRemaining: 100, totalCredits: 100 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchVotes()
  }, [fetchVotes])

  const castVote = useCallback(async (sessionId: string, voteCount: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/events/${slug}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, voteCount }),
      })

      if (!response.ok) {
        const data = await response.json()
        return { success: false, error: data.error || 'Failed to cast vote' }
      }

      const data = await response.json()

      // Update local state
      setBalance(data.balance)

      // Update votes list
      if (voteCount === 0) {
        setVotes(prev => prev.filter(v => v.sessionId !== sessionId))
      } else {
        setVotes(prev => {
          const existingIndex = prev.findIndex(v => v.sessionId === sessionId)
          const newVote: Vote = {
            sessionId,
            voteCount,
            creditsSpent: voteCount * voteCount,
            updatedAt: new Date().toISOString(),
            session: existingIndex >= 0 ? prev[existingIndex].session : null,
          }

          if (existingIndex >= 0) {
            const updated = [...prev]
            updated[existingIndex] = newVote
            return updated
          } else {
            return [...prev, newVote]
          }
        })
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }, [slug])

  const getVoteForSession = useCallback((sessionId: string): number => {
    const vote = votes.find(v => v.sessionId === sessionId)
    return vote?.voteCount || 0
  }, [votes])

  return { votes, balance, loading, error, castVote, getVoteForSession, refetch: fetchVotes }
}
