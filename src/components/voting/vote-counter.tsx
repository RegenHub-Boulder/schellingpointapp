'use client'

import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn, calculateQuadraticCost, calculateNextVoteCost } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { VoteDots } from './vote-dots'

interface VoteCounterProps {
  votes: number
  onVote: (newVotes: number) => void
  remainingCredits: number
  disabled?: boolean
  className?: string
  showCost?: boolean
}

export function VoteCounter({
  votes,
  onVote,
  remainingCredits,
  disabled,
  className,
  showCost = true,
}: VoteCounterProps) {
  const currentCost = calculateQuadraticCost(votes)
  const nextCost = calculateNextVoteCost(votes)
  const canIncrement = nextCost <= remainingCredits && !disabled
  const canDecrement = votes > 0 && !disabled

  const handleIncrement = () => {
    if (canIncrement) {
      onVote(votes + 1)
    }
  }

  const handleDecrement = () => {
    if (canDecrement) {
      onVote(votes - 1)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleDecrement}
          disabled={!canDecrement}
          className="shrink-0"
        >
          <Minus className="h-3 w-3" />
        </Button>

        <div className="flex-1 min-w-0">
          <VoteDots votes={votes} />
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleIncrement}
          disabled={!canIncrement}
          className="shrink-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">
          {votes} {votes === 1 ? 'vote' : 'votes'} ({currentCost} credits)
        </span>
        {showCost && votes > 0 && (
          <span className="tabular-nums">
            Next: +{nextCost} credits
          </span>
        )}
      </div>
    </div>
  )
}
