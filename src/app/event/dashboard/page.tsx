'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Users,
  Vote,
  Clock,
  TrendingUp,
  Award,
  Activity,
  DollarSign,
  Loader2,
  CalendarDays,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NetworkGraph } from '@/components/visualization/network-graph'
import { useEvent } from '@/hooks/use-event'
import { useSessions } from '@/hooks/use-sessions'

export default function EventDashboardPage() {
  const { event, votingConfig, budgetConfig, loading: eventLoading } = useEvent()
  const { sessions, loading: sessionsLoading } = useSessions({ status: 'approved' })

  const loading = eventLoading || sessionsLoading

  // Calculate stats from real data
  const totalSessions = sessions.length
  const totalVotes = sessions.reduce((sum, s) => sum + (s.preVoteStats?.totalVotes || 0), 0)
  const totalVoters = sessions.reduce((sum, s) => sum + (s.preVoteStats?.totalVoters || 0), 0)
  const uniqueVoters = new Set(sessions.flatMap(s => s.preVoteStats?.totalVoters ? [s.id] : [])).size

  // Sort sessions by votes for top sessions
  const topSessions = [...sessions]
    .sort((a, b) => (b.preVoteStats?.totalVotes || 0) - (a.preVoteStats?.totalVotes || 0))
    .slice(0, 5)

  // Calculate time remaining until voting ends (if pre_vote_deadline exists)
  const getTimeRemaining = () => {
    if (!votingConfig?.preVoteDeadline) return 'TBD'
    const deadline = new Date(votingConfig.preVoteDeadline)
    const now = new Date()
    const diff = deadline.getTime() - now.getTime()

    if (diff <= 0) return 'Voting ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  // Calculate budget distribution using quadratic funding formula
  const budgetResults = React.useMemo(() => {
    if (!topSessions.length) return []

    const totalBudget = budgetConfig?.totalBudgetPool || 10000

    // Calculate QF scores
    const sessionsWithQf = topSessions.map((session) => {
      const votes = session.preVoteStats?.totalVotes || 0
      const voters = session.preVoteStats?.totalVoters || 1
      // Simple QF approximation: sqrt(credits per voter) * voters squared
      const avgCreditsPerVoter = votes > 0 && voters > 0 ? (votes * votes) / voters : 0
      const qfScore = Math.sqrt(avgCreditsPerVoter) * voters
      return {
        ...session,
        qfScore: qfScore * qfScore,
      }
    })

    const totalQfScore = sessionsWithQf.reduce((sum, s) => sum + s.qfScore, 0) || 1

    return sessionsWithQf.map((session) => ({
      ...session,
      estimatedBudget: Math.round((session.qfScore / totalQfScore) * totalBudget),
      percentage: Math.round((session.qfScore / totalQfScore) * 100),
    }))
  }, [topSessions, budgetConfig?.totalBudgetPool])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No sessions yet
  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Event Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {event?.name || 'Event'} statistics
          </p>
        </div>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No approved sessions yet. The dashboard will populate once sessions are approved and voting begins.
          </p>
          <Button asChild>
            <Link href="/event/sessions">Browse Sessions</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const creditsPerVoter = votingConfig?.preVoteCredits || 100
  const totalBudget = budgetConfig?.totalBudgetPool || 10000

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Event Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {event?.name || 'Event'} - Real-time insights and voting statistics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Sessions
              </p>
              <p className="text-2xl font-bold mt-1">
                {totalSessions}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Approved for voting
              </p>
            </div>
            <CalendarDays className="h-8 w-8 text-primary/70" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Votes
              </p>
              <p className="text-2xl font-bold mt-1">
                {totalVotes.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Across all sessions
              </p>
            </div>
            <Vote className="h-8 w-8 text-primary/70" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Budget Pool
              </p>
              <p className="text-2xl font-bold mt-1">
                ${totalBudget.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                To be distributed
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary/70" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Time Remaining
              </p>
              <p className="text-2xl font-bold mt-1">{getTimeRemaining()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Until voting closes
              </p>
            </div>
            <Clock className="h-8 w-8 text-primary/70" />
          </div>
        </Card>
      </div>

      {/* Top Sessions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Top Sessions</h2>
          </div>
          <Badge variant="secondary">By Votes</Badge>
        </div>
        <div className="space-y-3">
          {topSessions.length > 0 ? (
            topSessions.map((session, index) => (
              <Link
                key={session.id}
                href={`/event/sessions/${session.id}`}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{session.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{session.preVoteStats?.totalVotes || 0} votes</span>
                    <span>•</span>
                    <span>{session.preVoteStats?.totalVoters || 0} voters</span>
                    <span>•</span>
                    <span className="capitalize">{session.format}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-success text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              No votes yet. Be the first to vote!
            </p>
          )}
        </div>
      </Card>

      {/* Anticipated Budget Distribution */}
      {budgetResults.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Anticipated Budget Distribution</h2>
            </div>
            <Badge variant="secondary">Based on Current Votes</Badge>
          </div>

          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Total Budget Pool</div>
            <div className="text-3xl font-bold">${totalBudget.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Distributed using quadratic funding formula
            </div>
          </div>

          <div className="space-y-3">
            {budgetResults.map((session, index) => (
              <div
                key={session.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {index + 1}
                      </div>
                      <h3 className="font-medium text-sm truncate">{session.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{session.preVoteStats?.totalVotes || 0} votes</span>
                      <span>•</span>
                      <span>{session.preVoteStats?.totalVoters || 0} voters</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-success">
                      ${session.estimatedBudget.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.percentage}% of pool
                    </div>
                  </div>
                </div>

                {/* Progress bar showing percentage of total budget */}
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-success/60 to-success rounded-full transition-all"
                    style={{ width: `${Math.min(session.percentage * 3, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="text-sm space-y-2">
              <div className="font-medium mb-2">How Quadratic Funding Works:</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unlike simple majority voting, quadratic funding rewards sessions with broad support.
                Each session receives funding proportional to the square of the sum of square roots
                of individual contributions. This means a session with many small supporters will
                receive more funding than one with few large supporters.
              </p>
              <div className="flex items-start gap-2 mt-3 text-xs">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  This creates a more democratic allocation where community consensus matters more
                  than large individual contributions.
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Network Graph Visualization */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Voting Network</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Interactive visualization of voting patterns showing relationships between voters and sessions.
          Colored clusters represent groups of voters with similar preferences.
        </p>
        <NetworkGraph width={800} height={600} />
      </Card>
    </div>
  )
}
