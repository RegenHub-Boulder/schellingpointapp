'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, Calendar, MapPin, Clock, Mic, Wrench, MessageSquare, Users, Monitor, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSessions, Session } from '@/hooks/use-sessions'
import { useFavorites } from '@/hooks/use-favorites'
import { useEvent } from '@/hooks/use-event'

const formatIcons: Record<string, React.ElementType> = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

const formatLabels: Record<string, string> = {
  talk: 'Talk',
  workshop: 'Workshop',
  discussion: 'Discussion',
  panel: 'Panel',
  demo: 'Demo',
}

export default function MySchedulePage() {
  const { event, loading: eventLoading } = useEvent()
  // Fetch scheduled sessions (those that have been assigned to the schedule)
  const { sessions: allSessions, loading: sessionsLoading } = useSessions({ status: 'scheduled' })
  const { favorites, removeFavorite } = useFavorites()

  const loading = eventLoading || sessionsLoading

  // Filter to only favorited sessions
  const favoritedSessions = React.useMemo(() => {
    return allSessions.filter(session => favorites.has(session.id))
  }, [allSessions, favorites])

  // Group sessions by day (using time slot date)
  const sessionsByDay = React.useMemo(() => {
    const grouped: Record<string, Session[]> = {}

    favoritedSessions.forEach(session => {
      if (session.timeSlot?.start_time) {
        const date = new Date(session.timeSlot.start_time)
        const dayKey = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
        if (!grouped[dayKey]) {
          grouped[dayKey] = []
        }
        grouped[dayKey].push(session)
      } else {
        // Sessions without time slots go in "Unscheduled"
        if (!grouped['Unscheduled']) {
          grouped['Unscheduled'] = []
        }
        grouped['Unscheduled'].push(session)
      }
    })

    // Sort sessions within each day by start time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => {
        const aTime = a.timeSlot?.start_time || ''
        const bTime = b.timeSlot?.start_time || ''
        return aTime.localeCompare(bTime)
      })
    })

    return grouped
  }, [favoritedSessions])

  const handleRemoveFavorite = (sessionId: string) => {
    removeFavorite(sessionId)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
            {favoritedSessions.length} session{favoritedSessions.length !== 1 ? 's' : ''} saved
            {event?.name && ` for ${event.name}`}
          </p>
        </div>
      </div>

      {favoritedSessions.length === 0 ? (
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
                  const FormatIcon = formatIcons[session.format] || Mic
                  const primaryHost = session.hosts?.find(h => h.isPrimary) || session.hosts?.[0]

                  const startTime = session.timeSlot?.start_time
                    ? new Date(session.timeSlot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'TBD'
                  const endTime = session.timeSlot?.end_time
                    ? new Date(session.timeSlot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'TBD'

                  return (
                    <Card key={session.id} className="p-4">
                      <div className="flex gap-4">
                        {/* Time column */}
                        <div className="flex-shrink-0 w-20 text-center">
                          <div className="text-sm font-medium">{startTime}</div>
                          <div className="text-xs text-muted-foreground">
                            {session.duration} min
                          </div>
                        </div>

                        {/* Format indicator */}
                        <div className="w-1 rounded-full bg-primary/30" />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <FormatIcon className="h-4 w-4" />
                                <span>{formatLabels[session.format] || session.format}</span>
                              </div>
                              <Link
                                href={`/event/sessions/${session.id}`}
                                className="font-semibold hover:underline"
                              >
                                {session.title}
                              </Link>
                              {primaryHost && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {primaryHost.name}
                                </p>
                              )}
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
                            {session.venue && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {session.venue.name}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {startTime} - {endTime}
                            </div>
                          </div>

                          {session.topicTags && session.topicTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {session.topicTags.map((tag) => (
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
      {favoritedSessions.length > 0 && (
        <div className="flex justify-center gap-3 pt-4">
          <Button variant="outline" disabled>
            Export to Calendar
          </Button>
          <Button variant="outline" disabled>
            Share Schedule
          </Button>
        </div>
      )}
    </div>
  )
}
