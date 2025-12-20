'use client'

import { useState, useCallback } from 'react'
import { EVENT_SLUG } from '@/lib/config'

export interface ScheduleAssignment {
  sessionId: string
  sessionTitle?: string
  venueId: string
  venueName?: string
  venueCapacity?: number
  timeSlotId: string
  startTime?: string
  endTime?: string
  timeSlotLabel?: string
}

export interface ScheduleGenerateResult {
  success: boolean
  dryRun: boolean
  applied: boolean
  qualityScore: number
  metrics: {
    totalSessions: number
    scheduledSessions: number
    conflictsAvoided: number
    capacityUtilization: number
  }
  warnings: string[]
  assignments: ScheduleAssignment[]
  unassignedSessions: { id: string; title?: string }[]
  executionTimeMs: number
}

interface UseScheduleReturn {
  generating: boolean
  publishing: boolean
  error: string | null
  lastResult: ScheduleGenerateResult | null
  generate: (options?: { dryRun?: boolean; conflictThreshold?: number }) => Promise<ScheduleGenerateResult | null>
  publish: () => Promise<{ success: boolean; error?: string }>
}

export function useSchedule(slug: string = EVENT_SLUG): UseScheduleReturn {
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ScheduleGenerateResult | null>(null)

  const generate = useCallback(async (options?: { dryRun?: boolean; conflictThreshold?: number }): Promise<ScheduleGenerateResult | null> => {
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${slug}/schedule/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate schedule')
      }

      const result: ScheduleGenerateResult = await response.json()
      setLastResult(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      return null
    } finally {
      setGenerating(false)
    }
  }, [slug])

  const publish = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setPublishing(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${slug}/schedule/publish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        return { success: false, error: data.error || 'Failed to publish schedule' }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      return { success: false, error: message }
    } finally {
      setPublishing(false)
    }
  }, [slug])

  return { generating, publishing, error, lastResult, generate, publish }
}
