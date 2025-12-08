'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, Calendar, MapPin, Clock, Mic, Wrench, MessageSquare, Users, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SessionTrack, trackConfig } from '@/types'

// Mock favorited sessions with schedule info
const mockFavoritedSessions = [
  {
    id: '1',
    title: 'Building DAOs That Actually Work',
    description: 'We\'ll explore practical governance frameworks that have worked for DAOs at different scales.',
    format: 'talk' as const,
    duration: 60,
    host: { name: 'Alice Chen' },
    tags: ['Governance', 'DAOs'],
    track: 'governance' as SessionTrack,
    venue: 'Main Hall',
    startTime: '9:45 AM',
    endTime: '10:45 AM',
    day: 'Day 1 - March 15',
  },
  {
    id: '3',
    title: 'The Future of Regenerative Finance',
    description: 'A facilitated discussion on how ReFi can scale beyond carbon credits.',
    format: 'discussion' as const,
    duration: 60,
    host: { name: 'Carol Williams' },
    tags: ['ReFi', 'Sustainability'],
    track: 'sustainability' as SessionTrack,
    venue: 'Breakout Room A',
    startTime: '2:00 PM',
    endTime: '3:00 PM',
    day: 'Day 1 - March 15',
  },
  {
    id: '5',
    title: 'Layer 2 Scaling Solutions Panel',
    description: 'Representatives from various L2 solutions discuss trade-offs and roadmaps.',
    format: 'panel' as const,
    duration: 90,
    host: { name: 'Eve Martinez' },
    tags: ['Layer 2', 'Scaling'],
    track: 'technical' as SessionTrack,
    venue: 'Main Hall',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    day: 'Day 2 - March 16',
  },
]

const formatIcons = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

export default function MySchedulePage() {
  const [sessions, setSessions] = React.useState(mockFavoritedSessions)

  const handleRemoveFavorite = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }

  // Group sessions by day
  const sessionsByDay = sessions.reduce((acc, session) => {
    if (!acc[session.day]) {
      acc[session.day] = []
    }
    acc[session.day].push(session)
    return acc
  }, {} as Record<string, typeof sessions>)

  // Sort sessions within each day by start time
  Object.keys(sessionsByDay).forEach((day) => {
    sessionsByDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime))
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/event/sessions">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} saved
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium mb-2">No sessions saved yet</h2>
          <p className="text-muted-foreground mb-6">
            Heart sessions you want to attend to build your personal schedule
          </p>
          <Button asChild>
            <Link href="/event/sessions">Browse Sessions</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(sessionsByDay).map(([day, daySessions]) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">{day}</h2>
              </div>

              <div className="space-y-3">
                {daySessions.map((session) => {
                  const FormatIcon = formatIcons[session.format]
                  const trackInfo = trackConfig[session.track]

                  return (
                    <Card key={session.id} className="p-4">
                      <div className="flex gap-4">
                        {/* Time column */}
                        <div className="flex-shrink-0 w-20 text-center">
                          <div className="text-sm font-medium">{session.startTime}</div>
                          <div className="text-xs text-muted-foreground">
                            {session.duration} min
                          </div>
                        </div>

                        {/* Track indicator */}
                        <div
                          className={cn('w-1 rounded-full', trackInfo.color)}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <FormatIcon className="h-4 w-4" />
                                <span>{trackInfo.label}</span>
                              </div>
                              <h3 className="font-semibold">{session.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {session.host.name}
                              </p>
                            </div>

                            <button
                              onClick={() => handleRemoveFavorite(session.id)}
                              className="p-2 rounded-full text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                              aria-label="Remove from schedule"
                            >
                              <Heart className="h-4 w-4 fill-current" />
                            </button>
                          </div>

                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {session.venue}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {session.startTime} - {session.endTime}
                            </div>
                          </div>

                          {session.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {session.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export / Share */}
      {sessions.length > 0 && (
        <div className="flex justify-center gap-3 pt-4">
          <Button variant="outline">Export to Calendar</Button>
          <Button variant="outline">Share Schedule</Button>
        </div>
      )}
    </div>
  )
}
