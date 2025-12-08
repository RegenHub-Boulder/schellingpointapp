'use client'

import * as React from 'react'
import { Mic, Wrench, MessageSquare, Users, Monitor, ChevronRight, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VoteCounter } from '@/components/voting/vote-counter'
import { SessionTrack, trackConfig } from '@/types'

interface SessionCardProps {
  session: {
    id: string
    title: string
    description: string
    format: 'talk' | 'workshop' | 'discussion' | 'panel' | 'demo'
    duration: number
    host: {
      name: string
      avatar?: string
    }
    tags: string[]
    track?: SessionTrack
    votes?: number
    userVotes?: number
    isFavorited?: boolean
  }
  remainingCredits: number
  onVote?: (sessionId: string, votes: number) => void
  onViewDetail?: (sessionId: string) => void
  onToggleFavorite?: (sessionId: string) => void
  className?: string
  votingEnabled?: boolean
  showFavorite?: boolean
}

const formatIcons = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

const formatLabels = {
  talk: 'Talk',
  workshop: 'Workshop',
  discussion: 'Discussion',
  panel: 'Panel',
  demo: 'Demo',
}

export function SessionCard({
  session,
  remainingCredits,
  onVote,
  onViewDetail,
  onToggleFavorite,
  className,
  votingEnabled = true,
  showFavorite = true,
}: SessionCardProps) {
  const FormatIcon = formatIcons[session.format]
  const trackInfo = session.track ? trackConfig[session.track] : null

  return (
    <Card className={cn('p-5', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
              <FormatIcon className="h-4 w-4" />
              <span>{formatLabels[session.format]}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{session.duration} min</span>
              {trackInfo && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className={cn('w-2 h-2 rounded-full', trackInfo.color)} />
                  <span>{trackInfo.label}</span>
                </>
              )}
            </div>

            <h3 className="font-semibold line-clamp-2">{session.title}</h3>

            <p className="text-sm text-muted-foreground mt-1">
              {session.host.name}
            </p>
          </div>

          {/* Favorite Button */}
          {showFavorite && onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(session.id)
              }}
              className={cn(
                'p-2 rounded-full transition-colors',
                session.isFavorited
                  ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
                  : 'text-muted-foreground hover:text-red-500 hover:bg-muted'
              )}
              aria-label={session.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={cn('h-5 w-5', session.isFavorited && 'fill-current')}
              />
            </button>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {session.description}
        </p>

        {/* Tags */}
        {session.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {session.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Voting */}
        {votingEnabled && (
          <div className="pt-2 border-t">
            <VoteCounter
              votes={session.userVotes || 0}
              onVote={(votes) => onVote?.(session.id, votes)}
              remainingCredits={remainingCredits}
            />
          </div>
        )}

        {/* View Detail */}
        {onViewDetail && (
          <button
            onClick={() => onViewDetail(session.id)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View full details
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </Card>
  )
}
