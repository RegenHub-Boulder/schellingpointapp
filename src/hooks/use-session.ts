'use client'

import { useState, useEffect, useCallback } from 'react'
import { EVENT_SLUG } from '@/lib/config'

export interface SessionHost {
  id: string
  name: string | null
  avatar: string | null
  bio: string | null
  isPrimary: boolean | null
  status: string | null
}

export interface SessionDetail {
  id: string
  eventId: string
  title: string
  description: string | null
  format: string
  duration: number
  maxParticipants: number | null
  technicalRequirements: string[]
  topicTags: string[]
  status: string
  rejectionReason: string | null
  isLocked: boolean
  createdAt: string
  updatedAt: string
  venue: {
    id: string
    name: string
    capacity: number
    features: string[]
    description: string | null
  } | null
  timeSlot: {
    id: string
    start_time: string
    end_time: string
    label: string | null
  } | null
}

export interface VoteStats {
  preVote: {
    totalVotes: number
    totalVoters: number
    totalCreditsSpent: number
    voteDistribution: Record<string, number>
  }
  attendance: {
    totalVotes: number
    totalVoters: number
    qfScore: number
    voteDistribution: Record<string, number>
  }
}

interface UseSessionReturn {
  session: SessionDetail | null
  hosts: SessionHost[]
  votes: VoteStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSession(sessionId: string, slug: string = EVENT_SLUG): UseSessionReturn {
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [hosts, setHosts] = useState<SessionHost[]>([])
  const [votes, setVotes] = useState<VoteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${slug}/sessions/${sessionId}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch session')
      }

      const data = await response.json()
      setSession(data.session)
      setHosts(data.hosts || [])
      setVotes(data.votes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [sessionId, slug])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return { session, hosts, votes, loading, error, refetch: fetchSession }
}
