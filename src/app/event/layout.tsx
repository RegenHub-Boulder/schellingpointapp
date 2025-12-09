'use client'

import * as React from 'react'
import { Presentation, Calendar, ClipboardList, Heart, BarChart3, FileText, Users } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { TabsNav } from '@/components/layout/tabs-nav'
import { Container } from '@/components/layout/container'
import { CreditBar } from '@/components/voting/credit-bar'
import { Badge } from '@/components/ui/badge'

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

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mock data - in real app, this would come from context/API
  const event = {
    name: 'EthBoulder 2026',
    status: 'voting_open' as const,
  }

  const user = {
    name: 'Alice Chen',
  }

  const credits = {
    total: 100,
    spent: 18,
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        eventName={event.name}
        user={user}
        credits={credits}
        onSignOut={() => console.log('Sign out')}
      />

      {/* Event Status Banner */}
      <div className="border-b bg-muted/30">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <Badge variant={statusColors[event.status]}>
                {statusLabels[event.status]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Closes in 2d 14h
              </span>
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
