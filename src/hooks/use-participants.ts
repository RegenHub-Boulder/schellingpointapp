'use client'

import { useState, useEffect, useCallback } from 'react'
import { EVENT_SLUG } from '@/lib/config'
import { useAuth } from './useAuth'

export interface Participant {
  user: {
    id?: string
    email?: string
    displayName?: string
    avatar?: string
    walletAddress?: string
  }
  checkedIn: boolean
  checkedInAt: string | null
  isAdmin: boolean
  burnerCardId: string | null
  grantedAt: string
}

interface UseParticipantsOptions {
  checkedIn?: boolean
  isAdmin?: boolean
}

interface UseParticipantsReturn {
  participants: Participant[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useParticipants(options: UseParticipantsOptions = {}): UseParticipantsReturn {
  const { token, isLoggedIn } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchParticipants = useCallback(async () => {
    if (!isLoggedIn || !token) {
      setError('Please sign in to view participants')
      setParticipants([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.checkedIn !== undefined) {
        params.set('checkedIn', String(options.checkedIn))
      }
      if (options.isAdmin !== undefined) {
        params.set('isAdmin', String(options.isAdmin))
      }

      const queryString = params.toString()
      const url = `/api/events/${EVENT_SLUG}/participants${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        setError('Please sign in to view participants')
        setParticipants([])
        setLoading(false)
        return
      }

      if (response.status === 403) {
        setError('Only event admins can view participants')
        setParticipants([])
        setLoading(false)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch participants')
      }

      const data = await response.json()
      setParticipants(data.participants || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [options.checkedIn, options.isAdmin, token, isLoggedIn])

  useEffect(() => {
    fetchParticipants()
  }, [fetchParticipants])

  return { participants, loading, error, refetch: fetchParticipants }
}
