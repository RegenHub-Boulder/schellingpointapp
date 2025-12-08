'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, calculateQuadraticCost, calculateNextVoteCost } from '@/lib/utils'
import { VoteDots } from './vote-dots'

interface TapToVoteProps {
  votes: number
  onVote: () => void
  remainingCredits: number
  disabled?: boolean
  className?: string
}

export function TapToVote({
  votes,
  onVote,
  remainingCredits,
  disabled,
  className,
}: TapToVoteProps) {
  const [isPressed, setIsPressed] = React.useState(false)
  const [showFeedback, setShowFeedback] = React.useState(false)

  const nextCost = calculateNextVoteCost(votes)
  const canVote = nextCost <= remainingCredits && !disabled

  const handleTap = () => {
    if (!canVote) return

    setShowFeedback(true)
    onVote()

    setTimeout(() => setShowFeedback(false), 600)
  }

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      <motion.button
        className={cn(
          'relative flex h-40 w-40 items-center justify-center rounded-full border-4 transition-colors duration-200',
          canVote
            ? 'border-primary bg-primary/5 hover:bg-primary/10 cursor-pointer'
            : 'border-muted bg-muted/50 cursor-not-allowed',
          isPressed && canVote && 'scale-95 bg-primary/20'
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onClick={handleTap}
        disabled={!canVote}
        whileTap={{ scale: 0.95 }}
      >
        <div className="text-center">
          <div className={cn(
            'text-lg font-semibold uppercase tracking-wide',
            canVote ? 'text-primary' : 'text-muted-foreground'
          )}>
            Tap to Vote
          </div>
        </div>

        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 rounded-full border-4 border-primary"
            />
          )}
        </AnimatePresence>
      </motion.button>

      <div className="text-center space-y-3">
        <VoteDots votes={votes} size="lg" className="justify-center" />

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Your votes: <span className="font-medium text-foreground">{votes}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Credits spent: <span className="font-medium text-foreground">{calculateQuadraticCost(votes)}</span>
          </p>
        </div>

        {canVote ? (
          <p className="text-xs text-muted-foreground">
            Tap again: +1 vote (costs {nextCost} more)
          </p>
        ) : (
          <p className="text-xs text-destructive">
            Not enough credits for another vote
          </p>
        )}
      </div>
    </div>
  )
}
