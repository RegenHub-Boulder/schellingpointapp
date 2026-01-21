'use client'

import * as React from 'react'
import { useAuth } from '@/hooks/useAuth'

export interface EventAccess {
  hasAccess: boolean
  isAdmin: boolean
  isCheckedIn: boolean
  checkedInAt: string | null
  burnerCardId: string | null
}

interface UseEventAccessResult {
  access: EventAccess | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_EVENT_SLUG = 'ethboulder-2026'

export function useEventAccess(eventSlug: string = DEFAULT_EVENT_SLUG): UseEventAccessResult {
  const { token, isLoggedIn } = useAuth()
  const [access, setAccess] = React.useState<EventAccess | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchAccess = React.useCallback(async () => {
    if (!isLoggedIn || !token) {
      setAccess(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventSlug}/access/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          setAccess(null)
          return
        }
        throw new Error('Failed to fetch access')
      }

      const data = await response.json()
      setAccess(data)
    } catch (err) {
      console.error('Error fetching event access:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAccess(null)
    } finally {
      setIsLoading(false)
    }
  }, [eventSlug, token, isLoggedIn])

  React.useEffect(() => {
    fetchAccess()
  }, [fetchAccess])

  return {
    access,
    isLoading,
    error,
    refetch: fetchAccess,
  }
}
