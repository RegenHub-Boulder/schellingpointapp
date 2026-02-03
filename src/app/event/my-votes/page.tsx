'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditBar } from '@/components/voting/credit-bar'
import { VoteCounter } from '@/components/voting/vote-counter'
import { useAuth } from '@/hooks'
import { useVotes, getTopicId } from '@/hooks/useVotes'
import { useSessions } from '@/hooks/use-sessions'

export default function MyVotesPage() {
  const { isLoggedIn } = useAuth()
  const { sessions: apiSessions, loading: sessionsLoading } = useSessions({ status: 'approved' })

  const sessionIds = React.useMemo(() => apiSessions.map(s => s.id), [apiSessions])

  const eventId = process.env.NEXT_PUBLIC_EVENT_ID || ''

  const {
    votes,
    creditsSpent,
    creditsRemaining,
    setVotes,
    isLoading: votesLoading,
    isSyncing,
    error
  } = useVotes({ eventId, sessionIds })

  const [showAllSessions, setShowAllSessions] = React.useState(false)

  // Sessions with votes > 0, sorted by vote count descending
  const votedSessions = React.useMemo(() => {
    return apiSessions
      .filter(s => (votes[s.id] || 0) > 0)
      .sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0))
  }, [apiSessions, votes])

  // Sessions with 0 votes (for "All Sessions" expandable)
  const unvotedSessions = React.useMemo(() => {
    return apiSessions.filter(s => (votes[s.id] || 0) === 0)
  }, [apiSessions, votes])

  const loading = sessionsLoading || votesLoading

  const getHostName = (session: typeof apiSessions[0]) => {
    return session.hosts?.find(h => h.isPrimary)?.name || session.hosts?.[0]?.name || 'Unknown'
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not authenticated
  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Votes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Allocate your voting credits across sessions
          </p>
        </div>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Sign in to view and manage your votes.
          </p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Votes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Allocate your voting credits across sessions
          </p>
        </div>
        {isSyncing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Syncing...</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error.message}
        </div>
      )}

      {/* Credit Bar */}
      <Card className="p-4">
        <CreditBar total={100} spent={creditsSpent} />
      </Card>

      {/* Voted Sessions */}
      {votedSessions.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            Your Voted Sessions ({votedSessions.length})
          </h2>

          {votedSessions.map((session) => (
            <Card key={session.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/event/sessions/${session.id}`}
                    className="font-medium hover:underline block truncate"
                  >
                    {session.title}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">
                    {getHostName(session)}
                  </p>
                </div>

                <div className="shrink-0 w-48">
                  <VoteCounter
                    votes={votes[session.id] || 0}
                    onVote={(v) => setVotes(session.id, v)}
                    remainingCredits={creditsRemaining}
                    showCost={false}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            You haven't voted on any sessions yet.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Use the section below to find sessions and allocate your votes.
          </p>
        </Card>
      )}

      {/* All Sessions (expandable) */}
      {unvotedSessions.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowAllSessions(!showAllSessions)}
          >
            <span>
              All Sessions ({unvotedSessions.length} unvoted)
            </span>
            {showAllSessions ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>

          {showAllSessions && (
            <div className="space-y-2">
              {unvotedSessions.map((session) => (
                <Card key={session.id} className="p-4 opacity-60 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/event/sessions/${session.id}`}
                        className="font-medium hover:underline block truncate"
                      >
                        {session.title}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {getHostName(session)}
                      </p>
                    </div>

                    <div className="shrink-0 w-48">
                      <VoteCounter
                        votes={votes[session.id] || 0}
                        onVote={(v) => setVotes(session.id, v)}
                        remainingCredits={creditsRemaining}
                        showCost={false}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
