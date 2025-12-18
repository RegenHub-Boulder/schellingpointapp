'use client'

import * as React from 'react'
import { Clock, MapPin, ChevronRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditBar } from '@/components/voting/credit-bar'
import { TapToVote } from '@/components/voting/tap-to-vote'
import { VoteDots } from '@/components/voting/vote-dots'
import { calculateQuadraticCost } from '@/lib/utils'
import { useVoting } from '@/hooks/useVoting'

// Mock data - in production, fetch from API
const currentSession = {
  id: 1, // topicId for the contract
  title: 'Building DAOs That Actually Work',
  host: 'Alice Chen',
  venue: 'Main Hall',
  time: '10:00 AM - 11:00 AM',
  status: 'live' as const,
}

const votedSessions = [
  { id: 0, title: 'Opening Keynote', votes: 2 },
]

export default function LiveVotingPage() {
  const [votes, setVotes] = React.useState(0)
  const [allVotes, setAllVotes] = React.useState(votedSessions)
  const [error, setError] = React.useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = React.useState<string | null>(null)

  const { hasPasskey, hasValidSession, castVote, isAuthorizing, isVoting } = useVoting()

  const totalCredits = 100
  const spentCredits =
    calculateQuadraticCost(votes) +
    allVotes.reduce((sum, v) => sum + calculateQuadraticCost(v.votes), 0)
  const remainingCredits = totalCredits - spentCredits

  const handleVote = async () => {
    setError(null)
    try {
      // Cast vote on-chain (auto-authorizes if needed)
      const txHash = await castVote(currentSession.id, 1)
      setLastTxHash(txHash)
      setVotes(votes + 1)
    } catch (err) {
      console.error('Vote error:', err)
      setError(err instanceof Error ? err.message : 'Vote failed')
    }
  }

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

          <h1 className="text-xl font-bold">{currentSession.title}</h1>
          <p className="text-sm text-muted-foreground">{currentSession.host}</p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {currentSession.time}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {currentSession.venue}
            </div>
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

      {/* Authorization/Voting status */}
      {(isAuthorizing || isVoting) && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <span className="text-sm text-primary">
            {isAuthorizing ? 'Authorizing session (Face ID)...' : 'Submitting vote on-chain...'}
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
          votes={votes}
          onVote={handleVote}
          remainingCredits={remainingCredits}
          disabled={isAuthorizing || isVoting}
        />
      </div>

      {/* Session Navigation */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Sessions voted on today</h3>
          <Button variant="ghost" size="sm">
            View Schedule
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="space-y-2">
          {allVotes.length > 0 ? (
            allVotes.map((session) => (
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
              No votes cast yet today
            </p>
          )}

          {votes > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm truncate font-medium">{currentSession.title}</span>
              <div className="flex items-center gap-2">
                <VoteDots votes={votes} maxDisplay={5} size="sm" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {votes}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
