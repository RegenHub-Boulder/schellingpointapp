'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface CreditBarProps {
  total: number
  spent: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'default' | 'lg'
}

export function CreditBar({
  total,
  spent,
  className,
  showLabel = true,
  size = 'default',
}: CreditBarProps) {
  const remaining = total - spent
  const percentage = (remaining / total) * 100

  const heights = {
    sm: 'h-1.5',
    default: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Credits</span>
          <span className="font-medium tabular-nums">
            {remaining}/{total}
          </span>
        </div>
      )}
      <Progress
        value={percentage}
        className={cn(heights[size], 'bg-muted')}
        indicatorClassName={cn(
          percentage < 20
            ? 'bg-destructive'
            : percentage < 50
            ? 'bg-amber-500'
            : 'bg-primary'
        )}
      />
    </div>
  )
}
