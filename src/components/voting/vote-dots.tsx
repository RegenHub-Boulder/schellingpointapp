'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface VoteDotsProps {
  votes: number
  maxDisplay?: number
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function VoteDots({
  votes,
  maxDisplay = 10,
  className,
  size = 'default',
}: VoteDotsProps) {
  const sizes = {
    sm: 'h-1.5 w-1.5',
    default: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  }

  const gaps = {
    sm: 'gap-0.5',
    default: 'gap-1',
    lg: 'gap-1.5',
  }

  return (
    <div className={cn('flex items-center', gaps[size], className)}>
      <AnimatePresence mode="popLayout">
        {Array.from({ length: maxDisplay }).map((_, i) => (
          <motion.div
            key={i}
            initial={i < votes ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'rounded-full transition-colors duration-200',
              sizes[size],
              i < votes ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </AnimatePresence>
      {votes > maxDisplay && (
        <span className="ml-1 text-xs text-muted-foreground">
          +{votes - maxDisplay}
        </span>
      )}
    </div>
  )
}
