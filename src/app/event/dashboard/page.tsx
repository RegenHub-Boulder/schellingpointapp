'use client'

import * as React from 'react'
import {
  Users,
  Vote,
  Clock,
  TrendingUp,
  Award,
  Activity,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function EventDashboardPage() {
  // Mock data - in real app, this would come from API
  const eventStats = {
    totalParticipants: 156,
    activeVoters: 142,
    totalVotesCast: 1248,
    creditsSpent: 12840,
    totalCredits: 15600,
    sessionsProposed: 24,
    votingEndsIn: '2d 14h',
  }

  const topSessions = [
    {
      id: 1,
      title: 'Decentralized Identity Solutions',
      votes: 89,
      credits: 1247,
      trend: '+12',
    },
    {
      id: 2,
      title: 'Quadratic Funding Deep Dive',
      votes: 76,
      credits: 1089,
      trend: '+8',
    },
    {
      id: 3,
      title: 'DAOs and Community Governance',
      votes: 68,
      credits: 956,
      trend: '+15',
    },
    {
      id: 4,
      title: 'Zero-Knowledge Proofs Workshop',
      votes: 54,
      credits: 823,
      trend: '+5',
    },
    {
      id: 5,
      title: 'Web3 UX Design Patterns',
      votes: 52,
      credits: 789,
      trend: '+10',
    },
  ]

  const participationTrend = [
    { hour: '00:00', voters: 12 },
    { hour: '04:00', voters: 8 },
    { hour: '08:00', voters: 34 },
    { hour: '12:00', voters: 56 },
    { hour: '16:00', voters: 78 },
    { hour: '20:00', voters: 92 },
    { hour: 'Now', voters: 142 },
  ]

  const votingDistribution = [
    { range: '0-20', count: 18, percentage: 11 },
    { range: '21-40', count: 34, percentage: 22 },
    { range: '41-60', count: 45, percentage: 29 },
    { range: '61-80', count: 38, percentage: 24 },
    { range: '81-100', count: 21, percentage: 14 },
  ]

  const creditsPercentage = Math.round(
    (eventStats.creditsSpent / eventStats.totalCredits) * 100
  )
  const participationRate = Math.round(
    (eventStats.activeVoters / eventStats.totalParticipants) * 100
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Event Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Real-time insights and voting statistics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Participants
              </p>
              <p className="text-2xl font-bold mt-1">
                {eventStats.totalParticipants}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {eventStats.activeVoters} active voters
              </p>
            </div>
            <Users className="h-8 w-8 text-primary/70" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Votes
              </p>
              <p className="text-2xl font-bold mt-1">
                {eventStats.totalVotesCast.toLocaleString()}
              </p>
              <p className="text-xs text-success mt-1">
                ↑ {Math.round(eventStats.totalVotesCast / eventStats.activeVoters)}{' '}
                avg per voter
              </p>
            </div>
            <Vote className="h-8 w-8 text-primary/70" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Credits Used
              </p>
              <p className="text-2xl font-bold mt-1">{creditsPercentage}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {eventStats.creditsSpent.toLocaleString()} /{' '}
                {eventStats.totalCredits.toLocaleString()}
              </p>
            </div>
            <Activity className="h-8 w-8 text-primary/70" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Time Remaining
              </p>
              <p className="text-2xl font-bold mt-1">{eventStats.votingEndsIn}</p>
              <p className="text-xs text-destructive mt-1">Voting closes soon</p>
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
          <Badge variant="secondary">Live Rankings</Badge>
        </div>
        <div className="space-y-3">
          {topSessions.map((session, index) => (
            <div
              key={session.id}
              className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{session.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{session.votes} votes</span>
                  <span>•</span>
                  <span>{session.credits.toLocaleString()} credits</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-success text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                {session.trend}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Participation Trend */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Participation Trend</h2>
          </div>
          <div className="space-y-4">
            {participationTrend.map((point, index) => {
              const maxVoters = Math.max(...participationTrend.map((p) => p.voters))
              const percentage = (point.voters / maxVoters) * 100
              return (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{point.hour}</span>
                    <span className="font-medium">{point.voters} voters</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Participation Rate</span>
              <span className="font-bold text-primary">{participationRate}%</span>
            </div>
          </div>
        </Card>

        {/* Credits Distribution */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Credits Distribution</h2>
          </div>
          <div className="space-y-4">
            {votingDistribution.map((range, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">
                    {range.range} credits spent
                  </span>
                  <span className="font-medium">
                    {range.count} voters ({range.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all"
                    style={{ width: `${range.percentage * 3}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg credits per voter</span>
                <span className="font-medium">
                  {Math.round(eventStats.creditsSpent / eventStats.activeVoters)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Most active voters</span>
                <span className="font-medium">21 (81-100 credits)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Insights */}
      <Card className="p-6 border-primary/20 bg-primary/5">
        <h3 className="font-semibold mb-3">Key Insights</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>
              <strong>High engagement:</strong> {participationRate}% of participants
              have cast votes, above the typical 75% threshold
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>
              <strong>Competitive race:</strong> Top 5 sessions are within 37 votes of
              each other, indicating close competition
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>
              <strong>Strategic voting:</strong> {creditsPercentage}% of total credits
              spent suggests participants are being thoughtful with allocations
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>
              <strong>Peak activity:</strong> Voting activity peaked in the evening
              hours (16:00-20:00 local time)
            </span>
          </li>
        </ul>
      </Card>
    </div>
  )
}
