'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Search,
  X,
  Heart,
  Calendar,
  Tag,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { useVenues } from '@/hooks/use-venues'
import { useTimeSlots } from '@/hooks/use-time-slots'
import { useSessions, Session } from '@/hooks/use-sessions'
import { useEvent } from '@/hooks/use-event'

const formatLabels: Record<string, string> = {
  talk: 'Talk',
  workshop: 'Workshop',
  discussion: 'Discussion',
  panel: 'Panel',
  demo: 'Demo',
}

// Simple track colors based on format for now
const getTrackColor = (format: string): string => {
  const colors: Record<string, string> = {
    talk: 'bg-blue-500',
    workshop: 'bg-purple-500',
    discussion: 'bg-green-500',
    panel: 'bg-orange-500',
    demo: 'bg-pink-500',
  }
  return colors[format] || 'bg-gray-500'
}

export default function SchedulePage() {
  const { event, loading: eventLoading } = useEvent()
  const { venues, loading: venuesLoading } = useVenues()
  const { timeSlots, loading: timeSlotsLoading } = useTimeSlots()
  const { sessions, loading: sessionsLoading } = useSessions({ status: 'scheduled' })

  const [searchQuery, setSearchQuery] = React.useState('')
  const [formatFilter, setFormatFilter] = React.useState<string>('all')
  const [venueFilter, setVenueFilter] = React.useState<string>('all')
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set())
  const [currentDay, setCurrentDay] = React.useState(1)

  const loading = eventLoading || venuesLoading || timeSlotsLoading || sessionsLoading

  const toggleFavorite = (sessionId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  // Format time for display
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    // Only show scheduled sessions with venue and time slot
    if (!session.venue || !session.timeSlot) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = session.title.toLowerCase().includes(query)
      const matchesHost = session.hosts?.some(h => h.name?.toLowerCase().includes(query))
      const matchesTags = session.topicTags?.some(tag => tag.toLowerCase().includes(query))
      const matchesVenue = session.venue?.name.toLowerCase().includes(query)

      if (!matchesTitle && !matchesHost && !matchesTags && !matchesVenue) {
        return false
      }
    }

    // Format filter
    if (formatFilter !== 'all' && session.format !== formatFilter) {
      return false
    }

    // Venue filter
    if (venueFilter !== 'all' && session.venue?.id !== venueFilter) {
      return false
    }

    return true
  })

  const getSessionForCell = (venueId: string, slotId: string) => {
    return filteredSessions.find(
      s => s.venue?.id === venueId && s.timeSlot?.id === slotId
    )
  }

  const hasFilters = searchQuery || formatFilter !== 'all' || venueFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setFormatFilter('all')
    setVenueFilter('all')
  }

  // Get event date range for display
  const eventStartDate = event?.startDate ? new Date(event.startDate) : null

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No venues/time slots configured
  if (venues.length === 0 || timeSlots.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Event schedule will appear here once configured
          </p>
        </div>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            The schedule hasn't been published yet. Check back later!
          </p>
          <Button asChild>
            <Link href="/event/sessions">Browse Sessions</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // No scheduled sessions
  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {event?.name || 'Event'} schedule
          </p>
        </div>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No sessions have been scheduled yet. The schedule will be published soon!
          </p>
          <Button asChild>
            <Link href="/event/sessions">Browse Sessions</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {eventStartDate
              ? `Day ${currentDay} • ${eventStartDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`
              : `Day ${currentDay}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={currentDay === 1}
            onClick={() => setCurrentDay(1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">Day {currentDay}</span>
          <Button
            variant="outline"
            size="icon"
            disabled={currentDay === 2}
            onClick={() => setCurrentDay(2)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by topic, host, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              {Object.entries(formatLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={venueFilter} onValueChange={setVenueFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Venue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {venues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Format Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {Object.entries(formatLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFormatFilter(formatFilter === key ? 'all' : key)}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded transition-colors',
              formatFilter === key ? 'bg-accent' : 'hover:bg-accent/50'
            )}
          >
            <div className={cn('h-3 w-3 rounded', getTrackColor(key))} />
            <span className="text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* Schedule Grid - Desktop */}
      <div className="hidden sm:block border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className={cn(
              'grid border-b bg-muted/50',
              `grid-cols-[100px_repeat(${venues.length},1fr)]`
            )} style={{ gridTemplateColumns: `100px repeat(${venues.length}, 1fr)` }}>
              <div className="p-3 border-r" />
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  className={cn(
                    'p-3 border-r last:border-r-0 text-center cursor-pointer transition-colors',
                    venueFilter === venue.id ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                  onClick={() => setVenueFilter(venueFilter === venue.id ? 'all' : venue.id)}
                >
                  <div className="font-medium text-sm">{venue.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {venue.capacity} cap
                  </div>
                </div>
              ))}
            </div>

            {/* Time Slot Rows */}
            {timeSlots.map((slot) => (
              <div
                key={slot.id}
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: `100px repeat(${venues.length}, 1fr)` }}
              >
                {/* Time Column */}
                <div className="p-3 border-r bg-muted/30">
                  <div className="text-xs font-medium">{formatTime(slot.startTime)}</div>
                  <div className="text-xs text-muted-foreground">{formatTime(slot.endTime)}</div>
                </div>

                {/* Venue Columns */}
                {!slot.isAvailable ? (
                  <div className={`col-span-${venues.length} p-3 bg-muted/20 flex items-center justify-center`} style={{ gridColumn: `span ${venues.length}` }}>
                    <span className="text-sm text-muted-foreground font-medium">
                      {slot.label || 'Break'}
                    </span>
                  </div>
                ) : (
                  venues.map((venue) => {
                    const session = getSessionForCell(venue.id, slot.id)

                    return (
                      <div
                        key={venue.id}
                        className="p-2 border-r last:border-r-0 min-h-[100px]"
                      >
                        {session ? (
                          <button
                            onClick={() => setSelectedSession(session)}
                            className={cn(
                              'w-full h-full p-2 rounded-lg text-left transition-all hover:ring-2 hover:ring-primary/50 relative',
                              getTrackColor(session.format)
                            )}
                          >
                            {favorites.has(session.id) && (
                              <Heart className="absolute top-1 right-1 h-3 w-3 fill-white text-white" />
                            )}
                            <div className="text-xs font-medium text-white line-clamp-2">
                              {session.title}
                            </div>
                            <div className="text-xs text-white/80 mt-1">
                              {session.hosts?.[0]?.name || 'Unknown Host'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">
                                {formatLabels[session.format] || session.format}
                              </Badge>
                              <span className="text-[10px] text-white/80 font-mono">
                                {session.preVoteStats?.totalVotes || 0} votes
                              </span>
                            </div>
                          </button>
                        ) : (
                          <div className="w-full h-full rounded-lg border-2 border-dashed border-muted" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile List View */}
      <div className="sm:hidden space-y-4">
        <h2 className="font-semibold">Today's Sessions</h2>
        {timeSlots
          .filter((slot) => slot.isAvailable)
          .map((slot) => {
            const slotSessions = filteredSessions.filter((s) => s.timeSlot?.id === slot.id)
            if (slotSessions.length === 0) return null

            return (
              <div key={slot.id} className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </span>
                </div>
                <div className="grid gap-2">
                  {slotSessions.map((session) => (
                    <Card
                      key={session.id}
                      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn('w-1 self-stretch rounded-full', getTrackColor(session.format))} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm">{session.title}</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFavorite(session.id)
                              }}
                              className="shrink-0"
                            >
                              <Heart className={cn(
                                'h-4 w-4',
                                favorites.has(session.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                              )} />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {session.hosts?.[0]?.name || 'Unknown Host'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {formatLabels[session.format] || session.format}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {session.preVoteStats?.totalVotes || 0} votes
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {session.venue?.name}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        {filteredSessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No sessions match your filters
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      <Modal open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <ModalContent className="sm:max-w-lg">
          {selectedSession && (
            <>
              <ModalHeader>
                <div className="flex items-start gap-3">
                  <div className={cn('w-1 self-stretch rounded-full', getTrackColor(selectedSession.format))} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn('text-xs text-white border-0', getTrackColor(selectedSession.format))}>
                        {formatLabels[selectedSession.format] || selectedSession.format}
                      </Badge>
                    </div>
                    <ModalTitle className="text-lg">{selectedSession.title}</ModalTitle>
                    <ModalDescription className="mt-1">
                      by {selectedSession.hosts?.[0]?.name || 'Unknown Host'}
                    </ModalDescription>
                  </div>
                </div>
              </ModalHeader>

              <div className="space-y-4 px-6 pb-6">
                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {selectedSession.description || 'No description provided.'}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedSession.timeSlot
                        ? `${formatTime(selectedSession.timeSlot.start_time)} - ${formatTime(selectedSession.timeSlot.end_time)}`
                        : 'TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedSession.venue?.name || 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedSession.maxParticipants || selectedSession.venue?.capacity || '—'} max</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedSession.duration} min</span>
                  </div>
                </div>

                {/* Tags */}
                {selectedSession.topicTags && selectedSession.topicTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.topicTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Vote count and actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm">
                    <span className="font-semibold">{selectedSession.preVoteStats?.totalVotes || 0}</span>
                    <span className="text-muted-foreground"> votes received</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={favorites.has(selectedSession.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleFavorite(selectedSession.id)}
                      className="gap-2"
                    >
                      <Heart className={cn(
                        'h-4 w-4',
                        favorites.has(selectedSession.id) && 'fill-current'
                      )} />
                      {favorites.has(selectedSession.id) ? 'Saved' : 'Save'}
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/event/sessions/${selectedSession.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
