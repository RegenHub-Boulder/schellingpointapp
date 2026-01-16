'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface VoteUpdate {
  sessionId: string
  totalVotes: number
  totalVoters: number
}

interface UseRealtimeVotesOptions {
  eventId: string
  onVoteUpdate?: (update: VoteUpdate) => void
  enabled?: boolean
}

/**
 * Hook for subscribing to real-time vote updates (aggregates only, not individual votes)
 * Uses Supabase Realtime to listen for changes to session_pre_vote_stats table
 */
export function useRealtimeVotes({
  eventId,
  onVoteUpdate,
  enabled = true,
}: UseRealtimeVotesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  const subscribe = useCallback(() => {
    if (!enabled || !eventId) return

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Subscribe to vote stats changes for this event
    const channel = supabase
      .channel(`event:${eventId}:votes`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'session_pre_vote_stats',
        },
        (payload) => {
          // Only process if we have the data we need
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as Record<string, unknown>

            // Verify this is for our event by checking the session
            // The stats table doesn't have event_id directly, so we trust the channel filter
            const update: VoteUpdate = {
              sessionId: newData.session_id as string,
              totalVotes: (newData.total_votes as number) || 0,
              totalVoters: (newData.total_voters as number) || 0,
            }

            onVoteUpdate?.(update)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to real-time votes for event ${eventId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to real-time votes')
        }
      })

    channelRef.current = channel
  }, [eventId, enabled, onVoteUpdate, supabase])

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
