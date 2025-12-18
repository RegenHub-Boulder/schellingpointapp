'use client'

import * as React from 'react'
import { Presentation, Calendar, ClipboardList, Heart, BarChart3, FileText, Users, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { TabsNav } from '@/components/layout/tabs-nav'
import { Container } from '@/components/layout/container'
import { CreditBar } from '@/components/voting/credit-bar'
import { Badge } from '@/components/ui/badge'
import { useEvent } from '@/hooks/use-event'
import { useAuth } from '@/hooks'

const tabs = [
  {
    label: 'Dashboard',
    href: '/event/dashboard',
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    label: 'Sessions',
    href: '/event/sessions',
    icon: <Presentation className="h-4 w-4" />,
    badge: 24,
  },
  {
    label: 'My Sessions',
    href: '/event/my-sessions',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: 'Schedule',
    href: '/event/schedule',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    label: 'My Schedule',
    href: '/event/my-schedule',
    icon: <Heart className="h-4 w-4" />,
  },
  {
    label: 'My Votes',
    href: '/event/my-votes',
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    label: 'Participants',
    href: '/event/participants',
    icon: <Users className="h-4 w-4" />,
  },
]

// Determine event status based on dates and flags
function getEventStatus(event: {
  schedulePublished: boolean
  scheduleLocked: boolean
  startDate: string
  endDate: string
} | null, votingConfig: { preVoteDeadline: string | null; proposalDeadline: string | null } | null) {
  if (!event) return 'proposals_open'

  const now = new Date()
  const startDate = new Date(event.startDate)
  const endDate = new Date(event.endDate)

  if (now > endDate) return 'concluded'
  if (now >= startDate && now <= endDate) return 'live'
  if (event.schedulePublished) return 'scheduled'

  // Check voting deadlines
  if (votingConfig?.preVoteDeadline) {
    const preVoteDeadline = new Date(votingConfig.preVoteDeadline)
    if (now <= preVoteDeadline) return 'voting_open'
  }

  if (votingConfig?.proposalDeadline) {
    const proposalDeadline = new Date(votingConfig.proposalDeadline)
    if (now <= proposalDeadline) return 'proposals_open'
  }

  return 'proposals_open'
}

// Calculate time remaining until deadline
function getTimeRemaining(deadline: string | null): string {
  if (!deadline) return ''

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate.getTime() - now.getTime()

  if (diff <= 0) return 'Closed'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `Closes in ${days}d ${hours}h`
  return `Closes in ${hours}h`
}

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch event data and user info
  const { event, votingConfig, loading: eventLoading, error: eventError } = useEvent()
  const { user, loading: authLoading, signOut } = useAuth()

  // Calculate event status
  const eventStatus = getEventStatus(event, votingConfig)

  // Mock credits for now (will be from user's voting credits later)
  const credits = {
    total: votingConfig?.preVoteCredits || 100,
    spent: 0, // Will be calculated from user's votes
  }

  const statusLabels = {
    proposals_open: 'Proposals Open',
    voting_open: 'Voting Open',
    scheduled: 'Scheduled',
    live: 'Live Now',
    concluded: 'Concluded',
  }

  const statusColors = {
    proposals_open: 'success',
    voting_open: 'success',
    scheduled: 'secondary',
    live: 'destructive',
    concluded: 'muted',
  } as const

  // Loading state
  if (eventLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (eventError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load event</p>
          <p className="text-sm text-muted-foreground">{eventError}</p>
        </div>
      </div>
    )
  }

  // Get deadline for status bar
  const deadline = eventStatus === 'voting_open'
    ? votingConfig?.preVoteDeadline
    : eventStatus === 'proposals_open'
    ? votingConfig?.proposalDeadline
    : null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        eventName={event?.name || 'Event'}
        user={user ? { name: user.email || 'User' } : null}
        credits={credits}
        onSignOut={signOut}
      />

      {/* Event Status Banner */}
      <div className="border-b bg-muted/30">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <Badge variant={statusColors[eventStatus]}>
                {statusLabels[eventStatus]}
              </Badge>
              {deadline && (
                <span className="text-sm text-muted-foreground">
                  {getTimeRemaining(deadline)}
                </span>
              )}
            </div>

            <div className="sm:hidden">
              <CreditBar total={credits.total} spent={credits.spent} />
            </div>
          </div>
        </Container>
      </div>

      {/* Navigation Tabs */}
      <Container>
        <TabsNav tabs={tabs} />
      </Container>

      {/* Main Content */}
      <main className="flex-1 py-6">
        <Container>{children}</Container>
      </main>
    </div>
  )
}
