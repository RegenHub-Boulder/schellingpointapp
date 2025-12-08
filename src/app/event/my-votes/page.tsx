'use client'

import * as React from 'react'
import { Mic, Wrench, MessageSquare, Users, Monitor, Minus, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditBar } from '@/components/voting/credit-bar'
import { VoteDots } from '@/components/voting/vote-dots'
import { cn, calculateQuadraticCost } from '@/lib/utils'

// Mock data
const mockVotes = [
  {
    id: '1',
    title: 'Building DAOs That Actually Work',
    format: 'talk' as const,
    host: 'Alice Chen',
    votes: 3,
  },
  {
    id: '2',
    title: 'Zero-Knowledge Proofs Workshop',
    format: 'workshop' as const,
    host: 'Bob Smith',
    votes: 1,
  },
  {
    id: '3',
    title: 'The Future of Regenerative Finance',
    format: 'discussion' as const,
    host: 'Carol Williams',
    votes: 2,
  },
  {
    id: '4',
    title: 'MEV Deep Dive',
    format: 'talk' as const,
    host: 'David Lee',
    votes: 2,
  },
]

const formatIcons = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

export default function MyVotesPage() {
  const [votes, setVotes] = React.useState(mockVotes)

  const totalCredits = 100
  const spentCredits = votes.reduce((sum, v) => sum + calculateQuadraticCost(v.votes), 0)
  const remainingCredits = totalCredits - spentCredits

  const handleVoteChange = (id: string, delta: number) => {
    setVotes((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v

        const newVotes = Math.max(0, v.votes + delta)
        const currentCost = calculateQuadraticCost(v.votes)
        const newCost = calculateQuadraticCost(newVotes)
        const costDiff = newCost - currentCost

        if (delta > 0 && costDiff > remainingCredits) return v
        return { ...v, votes: newVotes }
      })
    )
  }

  const votedSessions = votes.filter((v) => v.votes > 0)
  const totalVotes = votedSessions.reduce((sum, v) => sum + v.votes, 0)

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
              const FormatIcon = formatIcons[vote.format]
              const credits = calculateQuadraticCost(vote.votes)
              const nextCost = calculateQuadraticCost(vote.votes + 1) - credits
              const canAdd = nextCost <= remainingCredits

              return (
                <Card key={vote.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <FormatIcon className="h-4 w-4" />
                        <span>{vote.host}</span>
                      </div>
                      <h3 className="font-medium truncate">{vote.title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <VoteDots votes={vote.votes} maxDisplay={6} />
                        <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                          {credits} credits
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleVoteChange(vote.id, -1)}
                          disabled={vote.votes === 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleVoteChange(vote.id, 1)}
                          disabled={!canAdd}
                        >
                          <Plus className="h-3 w-3" />
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
          <Button>Browse Sessions</Button>
        </Card>
      )}

      {/* Tip */}
      {remainingCredits > 50 && (
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
