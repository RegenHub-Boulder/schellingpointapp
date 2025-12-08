'use client'

import * as React from 'react'
import { Mic, Wrench, MessageSquare, Users, Monitor, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VoteCounter } from '@/components/voting/vote-counter'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'

interface SessionDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: {
    id: string
    title: string
    description: string
    format: 'talk' | 'workshop' | 'discussion' | 'panel' | 'demo'
    duration: number
    host: {
      name: string
      bio?: string
      avatar?: string
    }
    coHosts?: { name: string }[]
    tags: string[]
    technicalRequirements?: string[]
    maxParticipants?: number
    userVotes?: number
  }
  remainingCredits: number
  onVote: (votes: number) => void
  votingEnabled?: boolean
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

export function SessionDetailModal({
  open,
  onOpenChange,
  session,
  remainingCredits,
  onVote,
  votingEnabled = true,
}: SessionDetailModalProps) {
  const FormatIcon = formatIcons[session.format]

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-xl">
        <ModalHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <FormatIcon className="h-4 w-4" />
            <span>{formatLabels[session.format]}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{session.duration} min</span>
            {session.maxParticipants && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>Max {session.maxParticipants} people</span>
              </>
            )}
          </div>
          <ModalTitle className="text-xl">{session.title}</ModalTitle>
        </ModalHeader>

        <div className="space-y-6">
          {/* Host Info */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              {session.host.avatar ? (
                <img
                  src={session.host.avatar}
                  alt={session.host.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">
                  {session.host.name.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium">{session.host.name}</p>
              {session.host.bio && (
                <p className="text-sm text-muted-foreground">{session.host.bio}</p>
              )}
            </div>
          </div>

          {session.coHosts && session.coHosts.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Co-hosts:</span>{' '}
              {session.coHosts.map((h) => h.name).join(', ')}
            </div>
          )}

          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {session.description}
            </p>
          </div>

          {/* Tags */}
          {session.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {session.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Technical Requirements */}
          {session.technicalRequirements && session.technicalRequirements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Technical Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {session.technicalRequirements.map((req) => (
                  <li key={req} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Voting */}
          {votingEnabled && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Your Vote</h4>
              <VoteCounter
                votes={session.userVotes || 0}
                onVote={onVote}
                remainingCredits={remainingCredits}
              />
            </div>
          )}

          {/* Merge Option */}
          <div className="pt-4 border-t">
            <Button variant="outline" className="w-full gap-2">
              <Link2 className="h-4 w-4" />
              Propose Merger
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Have a similar session? Combine forces!
            </p>
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}
