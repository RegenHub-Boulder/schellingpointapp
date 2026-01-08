'use client'

import { useState, useEffect, useCallback } from 'react'
import { MergerStatus, SessionTrack } from '@/types'

const EVENT_SLUG = process.env.NEXT_PUBLIC_EVENT_SLUG || 'ethboulder-2026'

export interface MergerSession {
  id: string
  title: string
  description: string
  format: string
  durationMinutes: number
  track: SessionTrack
  host: string
  votes: number
}

export interface Merger {
  id: string
  eventId: string
  sourceSession: MergerSession | null
  targetSession: MergerSession | null
  proposedTitle: string
  proposedDescription: string
  mergerType: string
  proposedDuration: number
  requestedBy: string
  requestMessage?: string
  status: MergerStatus
  responseMessage?: string
  createdAt: string
  respondedAt?: string
}

interface UseMergersReturn {
  mergers: Merger[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateMergerStatus: (mergerId: string, status: MergerStatus, responseMessage?: string) => Promise<boolean>
}

export function useMergers(): UseMergersReturn {
  const [mergers, setMergers] = useState<Merger[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMergers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/events/${EVENT_SLUG}/mergers`)

      if (response.status === 401) {
        setError('Authentication required')
        setMergers([])
        return
      }

      if (response.status === 403) {
        setError('Admin access required')
        setMergers([])
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch mergers')
      }

      const data = await response.json()
      setMergers(data.mergers || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mergers')
      setMergers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const updateMergerStatus = useCallback(async (
    mergerId: string,
    status: MergerStatus,
    responseMessage?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/events/${EVENT_SLUG}/mergers/${mergerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, responseMessage }),
      })

      if (!response.ok) {
        throw new Error('Failed to update merger')
      }

      // Update local state
      setMergers(prev => prev.map(m =>
        m.id === mergerId
          ? { ...m, status, responseMessage: responseMessage || m.responseMessage }
          : m
      ))

      return true
    } catch (err) {
      console.error('Error updating merger:', err)
      return false
    }
  }, [])

  useEffect(() => {
    fetchMergers()
  }, [fetchMergers])

  return {
    mergers,
    loading,
    error,
    refetch: fetchMergers,
    updateMergerStatus,
  }
}
