'use client'

import * as React from 'react'
import Link from 'next/link'
import { Clock, MapPin, ChevronRight, Loader2, Radio, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CreditBar } from '@/components/voting/credit-bar'
import { TapToVote } from '@/components/voting/tap-to-vote'
import { VoteDots } from '@/components/voting/vote-dots'
import { calculateQuadraticCost } from '@/lib/utils'
import { useSessions } from '@/hooks/use-sessions'
import { useTimeSlots, TimeSlot } from '@/hooks/use-time-slots'
import { useVotes } from '@/hooks/use-votes'
import { useEvent } from '@/hooks/use-event'
import { useVoting } from '@/hooks/useVoting'

// Helper to check if a time slot is currently live
function isLiveNow(timeSlot: TimeSlot): boolean {
  const now = new Date()
  const start = new Date(timeSlot.startTime)
  const end = new Date(timeSlot.endTime)
  return now >= start && now <= end
}

// Helper to format time range
function formatTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

export default function LiveVotingPage() {
  const { event, loading: eventLoading } = useEvent()
  const { sessions, loading: sessionsLoading } = useSessions({ status: 'scheduled' })
  const { timeSlots, loading: timeSlotsLoading } = useTimeSlots()
  const { balance, votes: userVotes, castVote: castOffChainVote, getVoteForSession } = useVotes()

  // On-chain voting hook
  const { castVote: castOnChainVote, isVoting } = useVoting()

  // On-chain transaction tracking
  const [lastTxHash, setLastTxHash] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const loading = eventLoading || sessionsLoading || timeSlotsLoading

  // Find the currently live session
  const liveSession = React.useMemo(() => {
    if (!sessions.length || !timeSlots.length) return null

    // Find time slot that's currently live
    const liveTimeSlot = timeSlots.find(isLiveNow)
    if (!liveTimeSlot) return null

    // Find session scheduled in that time slot
    const session = sessions.find(s => s.timeSlot?.id === liveTimeSlot.id)
    if (!session) return null

    return {
      session,
      timeSlot: liveTimeSlot,
      venue: session.venue,
    }
  }, [sessions, timeSlots])

  // Get today's voted sessions
  const todayVotes = React.useMemo(() => {
    if (!userVotes.length || !sessions.length) return []

    const today = new Date().toDateString()

    return userVotes
      .filter(vote => {
        // Check if the session's time slot is today
        const session = sessions.find(s => s.id === vote.sessionId)
        if (!session?.timeSlot?.start_time) return false
        return new Date(session.timeSlot.start_time).toDateString() === today
      })
      .map(vote => {
        const session = sessions.find(s => s.id === vote.sessionId)
        return {
          id: vote.sessionId,
          title: session?.title || 'Unknown Session',
          votes: vote.voteCount,
        }
      })
  }, [userVotes, sessions])

  // Current session voting state
  const [localVotes, setLocalVotes] = React.useState(0)
  const [isSaving, setIsSaving] = React.useState(false)

  // Initialize local votes from server when live session changes
  React.useEffect(() => {
    if (liveSession) {
      const existingVotes = getVoteForSession(liveSession.session.id)
      setLocalVotes(existingVotes)
    }
  }, [liveSession, getVoteForSession])

  const handleVote = async () => {
    if (!liveSession) return
    setError(null)

    const newVotes = localVotes + 1
    const cost = calculateQuadraticCost(newVotes)

    if (cost > balance.creditsRemaining + calculateQuadraticCost(localVotes)) {
      // Not enough credits
      return
    }

    setLocalVotes(newVotes)
    setIsSaving(true)

    try {
      // Cast vote on-chain first
      // TODO: Use session UUID hash as topicId instead of numeric ID
      const txHash = await castOnChainVote(Number(liveSession.session.id), 1)
      setLastTxHash(txHash)

      // Then update off-chain stats
      const result = await castOffChainVote(liveSession.session.id, newVotes)

      if (!result.success) {
        // Revert on error
        setLocalVotes(localVotes)
        setError('Failed to save vote')
      }
    } catch (err) {
      console.error('Vote error:', err)
      setError(err instanceof Error ? err.message : 'Vote failed')
      setLocalVotes(localVotes)
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate credits
  const totalCredits = balance.totalCredits
  const currentSessionCost = calculateQuadraticCost(localVotes)
  const otherSessionsCost = todayVotes
    .filter(v => v.id !== liveSession?.session.id)
    .reduce((sum, v) => sum + calculateQuadraticCost(v.votes), 0)
  const spentCredits = currentSessionCost + otherSessionsCost

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No live session
  if (!liveSession) {
    return (
      <div className="min-h-[80vh] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Radio className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">No Live Session</h2>
            <p className="text-muted-foreground mb-6">
              There's no session happening right now. Check the schedule to see upcoming sessions.
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link href="/event/schedule">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/event/sessions">
                  Browse All Sessions
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* Show today's votes if any */}
        {todayVotes.length > 0 && (
          <div className="border-t p-4">
            <h3 className="font-medium mb-4">Your votes today</h3>
            <div className="space-y-2">
              {todayVotes.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm truncate">{session.title}</span>
                  <div className="flex items-center gap-2">
                    <VoteDots votes={session.votes} maxDisplay={5} size="sm" />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {session.votes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Live session found - show voting UI
  const primaryHost = liveSession.session.hosts?.find(h => h.isPrimary) || liveSession.session.hosts?.[0]

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Current Session Header */}
      <div className="bg-primary/5 border-b">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              Live
            </Badge>
            <span className="text-sm text-muted-foreground">Now Playing</span>
          </div>

          <h1 className="text-xl font-bold">{liveSession.session.title}</h1>
          {primaryHost && (
            <p className="text-sm text-muted-foreground">{primaryHost.name}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTimeRange(liveSession.timeSlot.startTime, liveSession.timeSlot.endTime)}
            </div>
            {liveSession.venue && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {liveSession.venue.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credits */}
      <div className="p-4 border-b">
        <CreditBar total={totalCredits} spent={spentCredits} />
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Voting status */}
      {isVoting && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <span className="text-sm text-primary">
            Submitting vote on-chain...
          </span>
        </div>
      )}

      {/* Last tx hash */}
      {lastTxHash && (
        <div className="mx-4 mt-2 text-center">
          <a
            href={`https://sepolia.basescan.org/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary underline"
          >
            View last vote on Basescan
          </a>
        </div>
      )}

      {/* Tap to Vote */}
      <div className="flex-1 flex items-center justify-center p-8">
        <TapToVote
          votes={localVotes}
          onVote={handleVote}
          remainingCredits={balance.creditsRemaining}
          disabled={isVoting || isSaving}
        />
      </div>

      {/* Session Navigation */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Sessions voted on today</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/event/schedule">
              View Schedule
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          {todayVotes.filter(v => v.id !== liveSession.session.id).length > 0 ? (
            todayVotes
              .filter(v => v.id !== liveSession.session.id)
              .map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm truncate">{session.title}</span>
                  <div className="flex items-center gap-2">
                    <VoteDots votes={session.votes} maxDisplay={5} size="sm" />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {session.votes}
                    </span>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No other votes cast today
            </p>
          )}

          {/* Current session votes */}
          {localVotes > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm truncate font-medium">{liveSession.session.title}</span>
              <div className="flex items-center gap-2">
                <VoteDots votes={localVotes} maxDisplay={5} size="sm" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {localVotes}
                </span>
                {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
