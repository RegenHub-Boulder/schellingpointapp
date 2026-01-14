'use client'

import { useState, useEffect, useCallback } from 'react'
import { EVENT_SLUG } from '@/lib/config'

export interface SessionHost {
  id: string
  name: string | null
  avatar: string | null
  isPrimary: boolean | null
}

export interface Session {
  id: string
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
  hosts: SessionHost[]
  venue: {
    id: string
    name: string
    capacity: number
    features: string[]
  } | null
  timeSlot: {
    id: string
    start_time: string
    end_time: string
    label: string | null
  } | null
  preVoteStats: {
    totalVotes: number
    totalVoters: number
  }
  attendanceStats: {
    totalVotes: number
    qfScore: number
  }
}

interface UseSessionsOptions {
  status?: string
  format?: string
  tags?: string[]
  mine?: boolean
}

interface UseSessionsReturn {
  sessions: Session[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSessions(options: UseSessionsOptions = {}): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.status) params.set('status', options.status)
      if (options.format) params.set('format', options.format)
      if (options.tags && options.tags.length > 0) {
        params.set('tags', options.tags.join(','))
      }
      if (options.mine) params.set('mine', 'true')

      const queryString = params.toString()
      const url = `/api/events/${EVENT_SLUG}/sessions${queryString ? `?${queryString}` : ''}`

      const token = localStorage.getItem('authToken')
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch sessions')
      }

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [options.status, options.format, options.tags, options.mine])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return { sessions, loading, error, refetch: fetchSessions }
}
