'use client'

import * as React from 'react'
import Link from 'next/link'
import { Mic, Wrench, MessageSquare, Users, Monitor, Minus, Plus, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditBar } from '@/components/voting/credit-bar'
import { VoteDots } from '@/components/voting/vote-dots'
import { cn, calculateQuadraticCost } from '@/lib/utils'
import { useVotes } from '@/hooks/use-votes'
import { useAuth } from '@/hooks'

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

export default function MyVotesPage() {
  const { user } = useAuth()
  const { votes, balance, loading, error, castVote, refetch } = useVotes()
  const [updatingVote, setUpdatingVote] = React.useState<string | null>(null)

  const totalCredits = balance.totalCredits
  const spentCredits = balance.creditsSpent
  const remainingCredits = balance.creditsRemaining

  const handleVoteChange = async (sessionId: string, currentVotes: number, delta: number) => {
    const newVotes = Math.max(0, currentVotes + delta)

    // Check if we can afford the increase
    if (delta > 0) {
      const currentCost = calculateQuadraticCost(currentVotes)
      const newCost = calculateQuadraticCost(newVotes)
      const costDiff = newCost - currentCost
      if (costDiff > remainingCredits) return
    }

    setUpdatingVote(sessionId)
    const result = await castVote(sessionId, newVotes)
    setUpdatingVote(null)

    if (!result.success) {
      console.error('Failed to update vote:', result.error)
    }
  }

  // Filter to only show sessions with votes
  const votedSessions = votes.filter((v) => v.voteCount > 0)
  const totalVotes = votedSessions.reduce((sum, v) => sum + v.voteCount, 0)

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Your Vote Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage how you've allocated your pre-event votes
          </p>
        </div>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Sign in to view and manage your votes.
          </p>
          <Button asChild>
            <Link href="/">Sign In</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Failed to load votes: {error}</p>
        <Button onClick={() => refetch()}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Your Vote Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage how you've allocated your pre-event votes
        </p>
      </div>

      {/* Summary Card */}
      <Card className="p-6 space-y-4">
        <CreditBar total={totalCredits} spent={spentCredits} />

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold">{votedSessions.length}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalVotes}</div>
            <div className="text-xs text-muted-foreground">Total Votes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{spentCredits}</div>
            <div className="text-xs text-muted-foreground">Credits Spent</div>
          </div>
        </div>
      </Card>

      {/* Voted Sessions */}
      {votedSessions.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Sessions You've Voted On</h2>

          <div className="space-y-3">
            {votedSessions.map((vote) => {
              const format = vote.session?.format || 'talk'
              const FormatIcon = formatIcons[format] || Mic
              const credits = calculateQuadraticCost(vote.voteCount)
              const nextCost = calculateQuadraticCost(vote.voteCount + 1) - credits
              const canAdd = nextCost <= remainingCredits
              const isUpdating = updatingVote === vote.sessionId

              return (
                <Card key={vote.sessionId} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <FormatIcon className="h-4 w-4" />
                        <span className="capitalize">{format}</span>
                        <span>•</span>
                        <span>{vote.session?.duration || 60} min</span>
                      </div>
                      <Link
                        href={`/event/sessions/${vote.sessionId}`}
                        className="font-medium truncate hover:underline block"
                      >
                        {vote.session?.title || 'Unknown Session'}
                      </Link>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <VoteDots votes={vote.voteCount} maxDisplay={6} />
                        <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                          {credits} credits
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleVoteChange(vote.sessionId, vote.voteCount, -1)}
                          disabled={vote.voteCount === 0 || isUpdating}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleVoteChange(vote.sessionId, vote.voteCount, 1)}
                          disabled={!canAdd || isUpdating}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            You haven't voted on any sessions yet.
          </p>
          <Button asChild>
            <Link href="/event/sessions">Browse Sessions</Link>
          </Button>
        </Card>
      )}

      {/* Tip */}
      {remainingCredits > 50 && votedSessions.length > 0 && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm">
            <span className="font-medium">Tip:</span>{' '}
            <span className="text-muted-foreground">
              You have {remainingCredits} credits left. Consider voting on more
              sessions to influence the schedule.
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
