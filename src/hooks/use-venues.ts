'use client'

import { useState, useEffect, useCallback } from 'react'
import { EVENT_SLUG } from '@/lib/config'

export interface Venue {
  id: string
  name: string
  capacity: number
  features: string[]
  description: string | null
  displayOrder: number
}

interface UseVenuesReturn {
  venues: Venue[]
  loading: boolean
  error: string | null
  createVenue: (data: { name: string; capacity: number; features?: string[]; description?: string }) => Promise<{ success: boolean; venue?: Venue; error?: string }>
  updateVenue: (id: string, data: Partial<{ name: string; capacity: number; features: string[]; description: string }>) => Promise<{ success: boolean; error?: string }>
  deleteVenue: (id: string) => Promise<{ success: boolean; error?: string }>
  refetch: () => Promise<void>
}

export function useVenues(slug: string = EVENT_SLUG): UseVenuesReturn {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVenues = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${slug}/venues`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch venues')
      }

      const data = await response.json()
      // Transform snake_case to camelCase
      const transformedVenues = (data.venues || []).map((v: {
        id: string
        name: string
        capacity: number
        features: string[]
        description: string | null
        display_order: number
      }) => ({
        id: v.id,
        name: v.name,
        capacity: v.capacity,
        features: v.features || [],
        description: v.description,
        displayOrder: v.display_order,
      }))
      setVenues(transformedVenues)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  const createVenue = useCallback(async (data: { name: string; capacity: number; features?: string[]; description?: string }): Promise<{ success: boolean; venue?: Venue; error?: string }> => {
    try {
      const response = await fetch(`/api/events/${slug}/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        return { success: false, error: result.error || 'Failed to create venue' }
      }

      const result = await response.json()
      const newVenue: Venue = {
        id: result.venue.id,
        name: result.venue.name,
        capacity: result.venue.capacity,
        features: result.venue.features || [],
        description: result.venue.description,
        displayOrder: result.venue.display_order,
      }

      setVenues(prev => [...prev, newVenue])
      return { success: true, venue: newVenue }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }, [slug])

  const updateVenue = useCallback(async (id: string, data: Partial<{ name: string; capacity: number; features: string[]; description: string }>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/events/${slug}/venues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        return { success: false, error: result.error || 'Failed to update venue' }
      }

      const result = await response.json()
      setVenues(prev => prev.map(v => v.id === id ? {
        ...v,
        name: result.venue.name,
        capacity: result.venue.capacity,
        features: result.venue.features || [],
        description: result.venue.description,
        displayOrder: result.venue.display_order,
      } : v))

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }, [slug])

  const deleteVenue = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/events/${slug}/venues/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        return { success: false, error: result.error || 'Failed to delete venue' }
      }

      setVenues(prev => prev.filter(v => v.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }, [slug])

  return { venues, loading, error, createVenue, updateVenue, deleteVenue, refetch: fetchVenues }
}
