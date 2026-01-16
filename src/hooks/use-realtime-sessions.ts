'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

type SessionStatus = 'pending' | 'approved' | 'rejected' | 'scheduled' | 'merged'

interface SessionUpdate {
  sessionId: string
  status: SessionStatus
  venueId?: string | null
  timeSlotId?: string | null
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
}

interface UseRealtimeSessionsOptions {
  eventId: string
  onSessionUpdate?: (update: SessionUpdate) => void
  onSessionInsert?: (sessionId: string) => void
  onSessionDelete?: (sessionId: string) => void
  enabled?: boolean
}

/**
 * Hook for subscribing to real-time session status changes
 * Useful for:
 * - Admins seeing new proposals come in
 * - Users seeing their session get approved/rejected
 * - Schedule updates when sessions get assigned to venues/time slots
 */
export function useRealtimeSessions({
  eventId,
  onSessionUpdate,
  onSessionInsert,
  onSessionDelete,
  enabled = true,
}: UseRealtimeSessionsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  const subscribe = useCallback(() => {
    if (!enabled || !eventId) return

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Subscribe to session changes for this event
    const channel = supabase
      .channel(`event:${eventId}:sessions`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'

          if (eventType === 'DELETE' && payload.old) {
            const oldData = payload.old as Record<string, unknown>
            onSessionDelete?.(oldData.id as string)
            return
          }

          if (eventType === 'INSERT' && payload.new) {
            const newData = payload.new as Record<string, unknown>
            onSessionInsert?.(newData.id as string)
          }

          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as Record<string, unknown>
            const oldData = (payload.old as Record<string, unknown>) || {}

            // Check if status or schedule assignment changed
            const statusChanged = newData.status !== oldData.status
            const scheduleChanged =
              newData.venue_id !== oldData.venue_id ||
              newData.time_slot_id !== oldData.time_slot_id

            if (statusChanged || scheduleChanged || eventType === 'INSERT') {
              const update: SessionUpdate = {
                sessionId: newData.id as string,
                status: newData.status as SessionStatus,
                venueId: newData.venue_id as string | null,
                timeSlotId: newData.time_slot_id as string | null,
                eventType,
              }

              onSessionUpdate?.(update)
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to real-time sessions for event ${eventId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to real-time sessions')
        }
      })

    channelRef.current = channel
  }, [eventId, enabled, onSessionUpdate, onSessionInsert, onSessionDelete, supabase])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [supabase])

  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    subscribe()
    return () => unsubscribe()
  }, [subscribe, unsubscribe])

  return {
    subscribe,
    unsubscribe,
  }
}
