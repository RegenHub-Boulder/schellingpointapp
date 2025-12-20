'use client'

import { useState, useEffect, useCallback } from 'react'
import { EVENT_SLUG } from '@/lib/config'

export interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  label: string | null
  isAvailable: boolean
  displayOrder: number
}

interface UseTimeSlotsReturn {
  timeSlots: TimeSlot[]
  loading: boolean
  error: string | null
  createTimeSlot: (data: { startTime: string; endTime: string; label?: string; isAvailable?: boolean }) => Promise<{ success: boolean; timeSlot?: TimeSlot; error?: string }>
  refetch: () => Promise<void>
}

export function useTimeSlots(slug: string = EVENT_SLUG): UseTimeSlotsReturn {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeSlots = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${slug}/time-slots`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch time slots')
      }

      const data = await response.json()
      setTimeSlots(data.timeSlots || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchTimeSlots()
  }, [fetchTimeSlots])

  const createTimeSlot = useCallback(async (data: { startTime: string; endTime: string; label?: string; isAvailable?: boolean }): Promise<{ success: boolean; timeSlot?: TimeSlot; error?: string }> => {
    try {
      const response = await fetch(`/api/events/${slug}/time-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        return { success: false, error: result.error || 'Failed to create time slot' }
      }

      const result = await response.json()
      const newSlot: TimeSlot = {
        id: result.timeSlot.id,
        startTime: result.timeSlot.start_time,
        endTime: result.timeSlot.end_time,
        label: result.timeSlot.label,
        isAvailable: result.timeSlot.is_available,
        displayOrder: result.timeSlot.display_order,
      }

      setTimeSlots(prev => [...prev, newSlot].sort((a, b) => a.startTime.localeCompare(b.startTime)))
      return { success: true, timeSlot: newSlot }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }, [slug])

  return { timeSlots, loading, error, createTimeSlot, refetch: fetchTimeSlots }
}
