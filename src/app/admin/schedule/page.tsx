'use client'

import * as React from 'react'
import {
  Play,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  GripVertical,
  Send,
  X,
  Users,
  Lock,
  Unlock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { SessionTrack, trackConfig } from '@/types'
import { useVenues, useSessions, useTimeSlots, useSchedule, useEvent } from '@/hooks'

interface ScheduleSession {
  id: string
  title: string
  host: string
  votes: number
  track: SessionTrack
  format: string
  durationMinutes: number
  venueId?: string
  slotId?: string
  locked?: boolean
}

// Helper to format time slot for display
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function AdminSchedulePage() {
  // Fetch data from APIs
  const { venues, loading: venuesLoading, error: venuesError } = useVenues()
  const { sessions: apiSessions, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useSessions({ status: 'approved' })
  const { timeSlots: apiTimeSlots, loading: slotsLoading, error: slotsError } = useTimeSlots()
  const { event, loading: eventLoading } = useEvent()
  const { generate, publish, generating, publishing, lastResult } = useSchedule()

  // Local state for UI
  const [progress, setProgress] = React.useState(0)
  const [generated, setGenerated] = React.useState(false)
  const [sessions, setSessions] = React.useState<ScheduleSession[]>([])
  const [draggedSession, setDraggedSession] = React.useState<ScheduleSession | null>(null)
  const [showPreview, setShowPreview] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [isPublished, setIsPublished] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [qualityScore, setQualityScore] = React.useState(0)

  // Transform API sessions to ScheduleSession format
  React.useEffect(() => {
    if (apiSessions.length > 0) {
      const transformed: ScheduleSession[] = apiSessions.map(s => ({
        id: s.id,
        title: s.title,
        host: s.hosts?.[0]?.name || 'Unknown',
        votes: s.preVoteStats?.totalVotes || 0,
        track: 'technical' as SessionTrack, // Default track since not in API
        format: s.format || 'talk',
        durationMinutes: s.duration || 45,
        venueId: s.venue?.id,
        slotId: s.timeSlot?.id,
        locked: s.isLocked,
      }))
      setSessions(transformed)
    }
  }, [apiSessions])

  // Check if event schedule is already published
  React.useEffect(() => {
    if (event?.schedulePublished) {
      setIsPublished(true)
      setGenerated(true)
    }
  }, [event])

  // Transform time slots for display
  const timeSlots = React.useMemo(() => {
    return apiTimeSlots.map(slot => ({
      id: slot.id,
      start: formatTime(slot.startTime),
      end: formatTime(slot.endTime),
      type: slot.isAvailable ? 'session' as const : 'locked' as const,
      label: slot.label || undefined,
    }))
  }, [apiTimeSlots])

  const loading = venuesLoading || sessionsLoading || slotsLoading || eventLoading
  const error = venuesError || sessionsError || slotsError

  const handleGenerate = async () => {
    setProgress(0)

    // Simulate progress while API is called
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90))
    }, 300)

    const result = await generate({ dryRun: false })

    clearInterval(interval)
    setProgress(100)

    if (result?.success) {
      setGenerated(true)
      setQualityScore(result.qualityScore)

      // Update sessions with assignments
      const assignmentMap = new Map(result.assignments.map(a => [a.sessionId, a]))
      setSessions(prev => prev.map(s => {
        const assignment = assignmentMap.get(s.id)
        if (assignment) {
          return {
            ...s,
            venueId: assignment.venueId,
            slotId: assignment.timeSlotId,
          }
        }
        return s
      }))

      // Refresh sessions from API
      refetchSessions()
    }
  }

  const handleDragStart = (session: ScheduleSession) => {
    setDraggedSession(session)
  }

  const handleDragEnd = () => {
    setDraggedSession(null)
  }

  const handleDrop = (venueId: string, slotId: string) => {
    if (!draggedSession) return
    if (isPublished && !isEditing) return

    setSessions(prev => prev.map(s =>
      s.id === draggedSession.id
        ? { ...s, venueId, slotId }
        : s
    ))
    setDraggedSession(null)
    setHasChanges(true)
  }

  const handleRemoveFromSchedule = (sessionId: string) => {
    if (isPublished && !isEditing) return

    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, venueId: undefined, slotId: undefined }
        : s
    ))
    setHasChanges(true)
  }

  const handlePublish = async () => {
    const result = await publish()
    if (result.success) {
      setIsPublished(true)
      setIsEditing(false)
      setHasChanges(false)
      setShowPreview(false)
    } else {
      alert(result.error || 'Failed to publish schedule')
    }
  }

  const handleEditSchedule = () => {
    setIsEditing(true)
  }

  const handleToggleLock = (sessionId: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, locked: !s.locked } : s
    ))
    setHasChanges(true)
  }

  const getSessionForCell = (venueId: string, slotId: string) => {
    return sessions.find(s => s.venueId === venueId && s.slotId === slotId)
  }

  const unscheduledSessions = sessions.filter(s => !s.venueId || !s.slotId)
  const scheduledSessions = sessions.filter(s => s.venueId && s.slotId)

  const getConflicts = () => {
    const conflicts: { session: ScheduleSession; venue: typeof venues[0]; reason: string }[] = []
    scheduledSessions.forEach(session => {
      const venue = venues.find(v => v.id === session.venueId)
      if (venue && session.votes > venue.capacity * 1.2) {
        conflicts.push({
          session,
          venue,
          reason: `Expected attendance (${session.votes} votes) exceeds venue capacity (${venue.capacity})`
        })
      }
    })
    return conflicts
  }

  const conflicts = getConflicts()

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Failed to load data: {error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule Builder</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage the event schedule
          </p>
        </div>

        {!generated && !generating && (
          <Button onClick={handleGenerate} disabled={sessions.length === 0 || venues.length === 0 || timeSlots.length === 0}>
            <Play className="h-4 w-4 mr-2" />
            Auto-Generate Schedule
          </Button>
        )}

        {generated && !isPublished && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
            <Button onClick={() => setShowPreview(true)} disabled={publishing}>
              <Send className="h-4 w-4 mr-2" />
              Publish Schedule
            </Button>
          </div>
        )}

        {isPublished && !isEditing && (
          <div className="flex gap-2">
            <Badge variant="success" className="px-3 py-1.5">
              <CheckCircle className="h-3 w-3 mr-1" />
              Published
            </Badge>
            <Button onClick={handleEditSchedule}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Edit Schedule
            </Button>
          </div>
        )}

        {isPublished && isEditing && (
          <div className="flex gap-2">
            <Badge variant="secondary" className="px-3 py-1.5">
              Editing Mode
            </Badge>
            <Button onClick={() => setShowPreview(true)} disabled={publishing}>
              <Send className="h-4 w-4 mr-2" />
              Publish Changes
            </Button>
          </div>
        )}
      </div>

      {/* Pre-generation state */}
      {!generated && !generating && (
        <>
          {/* Requirements Check */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pre-flight Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {sessions.length > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="text-sm">Sessions approved ({sessions.length} sessions)</span>
                </div>
                <Badge variant={sessions.length > 0 ? 'success' : 'secondary'}>
                  {sessions.length > 0 ? 'Complete' : 'Pending'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {venues.length > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="text-sm">Venues configured ({venues.length} rooms)</span>
                </div>
                <Badge variant={venues.length > 0 ? 'success' : 'secondary'}>
                  {venues.length > 0 ? 'Complete' : 'Pending'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {timeSlots.filter(t => t.type === 'session').length > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="text-sm">Time slots defined ({timeSlots.filter(t => t.type === 'session').length} slots)</span>
                </div>
                <Badge variant={timeSlots.filter(t => t.type === 'session').length > 0 ? 'success' : 'secondary'}>
                  {timeSlots.filter(t => t.type === 'session').length > 0 ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Algorithm Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Algorithm Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="mb-2">The algorithm will optimize for:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Minimize audience conflicts (based on voter overlap)</li>
                  <li>Match venue capacity to session demand</li>
                  <li>Respect all manual constraints</li>
                  <li>Balance high-demand sessions across time slots</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Lock className="h-4 w-4" />
                  Pro Tip: Lock Important Sessions
                </div>
                <p className="text-sm">
                  Before generating, you can manually place keynotes or pre-booked sessions and lock them.
                  The algorithm will schedule all other sessions around your locked placements.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cluster Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audience Clusters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sessions that share voters should not overlap in the schedule:
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">High Overlap (73%)</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    "Building DAOs" ↔ "DAO Legal Structures"
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">High Overlap (65%)</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    "ZK Workshop" ↔ "Smart Contract Security"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Generating state */}
      {generating && (
        <Card className="p-8">
          <div className="space-y-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <h3 className="font-semibold">Generating Schedule...</h3>
              <Progress value={progress} className="max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground">
                {progress < 30 && 'Analyzing voter clusters...'}
                {progress >= 30 && progress < 60 && 'Calculating venue requirements...'}
                {progress >= 60 && progress < 80 && 'Optimizing time slot assignments...'}
                {progress >= 80 && 'Resolving conflicts...'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Generated state - Schedule Builder */}
      {generated && (
        <>
          {/* Quality Score & Conflicts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Schedule Generated
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">{Math.round(qualityScore)}</div>
                  <div>
                    <div className="text-sm font-medium">Quality Score</div>
                    <div className="text-xs text-muted-foreground">Out of 100</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">{scheduledSessions.length} scheduled</Badge>
                  <Badge variant="secondary">{unscheduledSessions.length} unscheduled</Badge>
                  {conflicts.length > 0 && (
                    <Badge variant="destructive">{conflicts.length} conflicts</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {conflicts.length > 0 && (
              <Card className="border-amber-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-5 w-5" />
                    Capacity Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {conflicts.slice(0, 2).map((conflict, i) => (
                    <div key={i} className="p-2 rounded bg-amber-50 text-sm text-amber-800">
                      <strong>{conflict.session.title}</strong> may exceed {conflict.venue.name} capacity
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Unscheduled Sessions */}
          {unscheduledSessions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Unscheduled Sessions ({unscheduledSessions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {unscheduledSessions.map(session => (
                    <div
                      key={session.id}
                      draggable
                      onDragStart={() => handleDragStart(session)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing text-white text-sm',
                        trackConfig[session.track].color
                      )}
                    >
                      <GripVertical className="h-4 w-4" />
                      <span className="font-medium">{session.title}</span>
                      <span className="text-white/70 text-xs">{session.votes}v</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Track Legend */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {Object.entries(trackConfig).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={cn('h-3 w-3 rounded', color)} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Drag & Drop Schedule Grid */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-base">Schedule Grid (Drag & Drop)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div style={{ minWidth: `${100 + venues.length * 200}px` }}>
                  {/* Header Row */}
                  <div
                    className="border-b bg-muted/50"
                    style={{ display: 'grid', gridTemplateColumns: `100px repeat(${venues.length}, 1fr)` }}
                  >
                    <div className="p-3 border-r" />
                    {venues.map((venue) => (
                      <div key={venue.id} className="p-3 border-r last:border-r-0 text-center">
                        <div className="font-medium text-sm">{venue.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <Users className="h-3 w-3" />
                          {venue.capacity}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time Slot Rows */}
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="border-b last:border-b-0"
                      style={{ display: 'grid', gridTemplateColumns: `100px repeat(${venues.length}, 1fr)` }}
                    >
                      {/* Time Column */}
                      <div className="p-3 border-r bg-muted/30">
                        <div className="text-xs font-medium">{slot.start}</div>
                        <div className="text-xs text-muted-foreground">{slot.end}</div>
                      </div>

                      {/* Venue Columns */}
                      {slot.type === 'locked' ? (
                        <div
                          className="p-3 bg-muted/20 flex items-center justify-center"
                          style={{ gridColumn: `span ${venues.length}` }}
                        >
                          <span className="text-sm text-muted-foreground font-medium">
                            {slot.label}
                          </span>
                        </div>
                      ) : (
                        venues.map((venue) => {
                          const session = getSessionForCell(venue.id, slot.id)
                          const isOverCapacity = session && session.votes > venue.capacity * 1.2

                          return (
                            <div
                              key={venue.id}
                              className={cn(
                                'p-2 border-r last:border-r-0 min-h-[100px] transition-colors',
                                draggedSession && 'bg-accent/30'
                              )}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDrop(venue.id, slot.id)}
                            >
                              {session ? (
                                <div
                                  draggable
                                  onDragStart={() => handleDragStart(session)}
                                  onDragEnd={handleDragEnd}
                                  className={cn(
                                    'w-full h-full p-2 rounded-lg cursor-grab active:cursor-grabbing relative group',
                                    trackConfig[session.track].color,
                                    isOverCapacity && 'ring-2 ring-amber-500',
                                    session.locked && 'ring-2 ring-white/50'
                                  )}
                                >
                                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleLock(session.id)
                                      }}
                                      className="p-1 rounded bg-black/20 hover:bg-black/30"
                                      title={session.locked ? 'Unlock session' : 'Lock session'}
                                    >
                                      {session.locked ? (
                                        <Lock className="h-3 w-3 text-white" />
                                      ) : (
                                        <Unlock className="h-3 w-3 text-white" />
                                      )}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveFromSchedule(session.id)
                                      }}
                                      className="p-1 rounded bg-black/20 hover:bg-black/30"
                                      title="Remove from schedule"
                                    >
                                      <X className="h-3 w-3 text-white" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1 mb-1">
                                    {session.locked ? (
                                      <Lock className="h-3 w-3 text-white" />
                                    ) : (
                                      <GripVertical className="h-3 w-3 text-white/70" />
                                    )}
                                    <span className="text-xs text-white font-medium line-clamp-1">
                                      {session.title}
                                    </span>
                                  </div>
                                  <div className="text-xs text-white/80">{session.host}</div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-white/70">{session.votes}v</span>
                                    <span className="text-[10px] text-white/70">{session.durationMinutes}m</span>
                                  </div>
                                  {isOverCapacity && (
                                    <div className="absolute -bottom-1 -right-1">
                                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    'w-full h-full rounded-lg border-2 border-dashed transition-colors',
                                    draggedSession ? 'border-primary bg-primary/10' : 'border-muted'
                                  )}
                                />
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Publish Preview Modal */}
      <Modal open={showPreview} onOpenChange={setShowPreview}>
        <ModalContent className="sm:max-w-lg">
          <ModalHeader>
            <ModalTitle>Publish Schedule</ModalTitle>
            <ModalDescription>
              Review before making the schedule visible to attendees.
            </ModalDescription>
          </ModalHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Scheduled sessions</span>
                <span className="font-medium">{scheduledSessions.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Unscheduled sessions</span>
                <span className="font-medium">{unscheduledSessions.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Capacity warnings</span>
                <span className="font-medium">{conflicts.length}</span>
              </div>
            </div>

            {unscheduledSessions.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Warning</span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  {unscheduledSessions.length} session(s) will not appear on the public schedule.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button onClick={handlePublish}>
                <Send className="h-4 w-4 mr-2" />
                {isEditing ? 'Publish Changes' : 'Publish Schedule'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  )
}
