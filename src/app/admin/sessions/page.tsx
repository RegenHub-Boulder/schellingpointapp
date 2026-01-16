'use client'

import * as React from 'react'
import {
  Check,
  X,
  Eye,
  MoreHorizontal,
  Search,
  Mic,
  Wrench,
  MessageSquare,
  Users,
  Monitor,
  Clock,
  Tag,
  AlertCircle,
  Send,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { SessionTrack, trackConfig } from '@/types'
import { useSessions, Session as ApiSession } from '@/hooks/use-sessions'
import { useEvent, useRealtimeSessions } from '@/hooks'
import { EVENT_SLUG } from '@/lib/config'

interface Session {
  id: string
  title: string
  description: string
  host: string
  hostEmail: string
  format: 'talk' | 'workshop' | 'discussion' | 'panel' | 'demo'
  track: SessionTrack | null
  status: 'pending' | 'approved' | 'declined' | 'changes_requested' | 'rejected' | 'scheduled'
  votes: number
  voters: number
  durationMinutes: number
  technicalRequirements: string[]
  tags: string[]
  createdAt: string
  adminNotes?: string
}

// Transform API session to admin UI format
function transformSession(apiSession: ApiSession): Session {
  const primaryHost = apiSession.hosts?.find(h => h.isPrimary) || apiSession.hosts?.[0]
  return {
    id: apiSession.id,
    title: apiSession.title,
    description: apiSession.description || '',
    host: primaryHost?.name || 'Unknown Host',
    hostEmail: '', // Not exposed in API for privacy
    format: apiSession.format as Session['format'],
    track: null, // Track assignment not implemented yet
    status: apiSession.status as Session['status'],
    votes: apiSession.preVoteStats?.totalVotes || 0,
    voters: apiSession.preVoteStats?.totalVoters || 0,
    durationMinutes: apiSession.duration,
    technicalRequirements: apiSession.technicalRequirements || [],
    tags: apiSession.topicTags || [],
    createdAt: apiSession.createdAt,
    adminNotes: apiSession.rejectionReason || undefined,
  }
}

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
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

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  scheduled: 'bg-blue-100 text-blue-800',
  declined: 'bg-red-100 text-red-800', // Alias for rejected
  changes_requested: 'bg-orange-100 text-orange-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  scheduled: 'Scheduled',
  declined: 'Declined',
  changes_requested: 'Changes Requested',
}

export default function AdminSessionsPage() {
  // Fetch event for real-time subscription
  const { event } = useEvent()

  // Fetch all sessions (no status filter for admin view)
  const { sessions: apiSessions, loading, error, refetch } = useSessions({})

  // Real-time session updates - refetch when sessions change
  useRealtimeSessions({
    eventId: event?.id || '',
    enabled: !!event?.id,
    onSessionUpdate: () => refetch(),
    onSessionInsert: () => refetch(),
    onSessionDelete: () => refetch(),
  })

  // Transform API sessions to UI format
  const sessions = React.useMemo(() => {
    return apiSessions.map(transformSession)
  }, [apiSessions])

  const [filter, setFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected' | 'scheduled'>('all')
  const [search, setSearch] = React.useState('')
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [showRequestChanges, setShowRequestChanges] = React.useState(false)
  const [requestChangesMessage, setRequestChangesMessage] = React.useState('')
  const [assignTrack, setAssignTrack] = React.useState<SessionTrack | ''>('')
  const [actionLoading, setActionLoading] = React.useState(false)

  const handleApprove = async (id: string, track?: SessionTrack) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/events/${EVENT_SLUG}/sessions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve session')
      }

      await refetch()
      setSelectedSession(null)
    } catch (err) {
      console.error('Failed to approve:', err)
      alert(err instanceof Error ? err.message : 'Failed to approve session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async (id: string) => {
    const reason = prompt('Please provide a reason for declining this session:')
    if (!reason) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/events/${EVENT_SLUG}/sessions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject session')
      }

      await refetch()
      setSelectedSession(null)
    } catch (err) {
      console.error('Failed to reject:', err)
      alert(err instanceof Error ? err.message : 'Failed to reject session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestChanges = async (id: string, message: string) => {
    // For now, request changes is implemented as a rejection with a message
    setActionLoading(true)
    try {
      const response = await fetch(`/api/events/${EVENT_SLUG}/sessions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Changes requested: ${message}` }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to request changes')
      }

      await refetch()
      setRequestChangesMessage('')
      setShowRequestChanges(false)
      setSelectedSession(null)
    } catch (err) {
      console.error('Failed to request changes:', err)
      alert(err instanceof Error ? err.message : 'Failed to request changes')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredSessions = sessions.filter((s) => {
    if (filter !== 'all' && s.status !== filter) return false
    if (search) {
      const query = search.toLowerCase()
      return (
        s.title.toLowerCase().includes(query) ||
        s.host.toLowerCase().includes(query) ||
        s.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    return true
  })

  const pendingCount = sessions.filter((s) => s.status === 'pending').length

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
        <p className="text-destructive mb-4">Failed to load sessions: {error}</p>
        <Button onClick={() => refetch()}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Session Management</h1>
          <p className="text-muted-foreground mt-1">
            Review, approve, and manage proposed sessions
          </p>
        </div>

        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, host, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected', 'scheduled'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              disabled={actionLoading}
            >
              {f === 'all' ? 'All' : statusLabels[f]}
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
                  {pendingCount}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Sessions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Session
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Host
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Format
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Track
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  Votes
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 w-[140px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSessions.map((session) => {
                const FormatIcon = formatIcons[session.format]

                return (
                  <tr key={session.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{session.title}</div>
                      <div className="flex gap-1 mt-1">
                        {session.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {session.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{session.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{session.host}</div>
                      <div className="text-xs text-muted-foreground">{session.hostEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <FormatIcon className="h-4 w-4" />
                        <span>{formatLabels[session.format]}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {session.durationMinutes} min
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {session.track ? (
                        <Badge className={cn('text-xs text-white border-0', trackConfig[session.track].color)}>
                          {trackConfig[session.track].label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          statusColors[session.status]
                        )}
                      >
                        {statusLabels[session.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-sm tabular-nums">{session.votes}</div>
                      <div className="text-xs text-muted-foreground">{session.voters} voters</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {session.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleApprove(session.id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDecline(session.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Decline"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setSelectedSession(session)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedSession(session)}>
                              View Details
                            </DropdownMenuItem>
                            {session.status !== 'approved' && (
                              <DropdownMenuItem onClick={() => handleApprove(session.id)}>
                                Approve
                              </DropdownMenuItem>
                            )}
                            {session.status !== 'declined' && (
                              <DropdownMenuItem onClick={() => handleDecline(session.id)}>
                                Decline
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSession(session)
                                setShowRequestChanges(true)
                              }}
                            >
                              Request Changes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredSessions.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No sessions found matching your criteria.
          </div>
        )}
      </Card>

      {/* Session Detail Modal */}
      <Modal open={!!selectedSession && !showRequestChanges} onOpenChange={() => setSelectedSession(null)}>
        <ModalContent className="sm:max-w-2xl">
          {selectedSession && (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      statusColors[selectedSession.status]
                    )}
                  >
                    {statusLabels[selectedSession.status]}
                  </span>
                  {selectedSession.track && (
                    <Badge className={cn('text-xs text-white border-0', trackConfig[selectedSession.track].color)}>
                      {trackConfig[selectedSession.track].label}
                    </Badge>
                  )}
                </div>
                <ModalTitle>{selectedSession.title}</ModalTitle>
                <ModalDescription>
                  Proposed by {selectedSession.host} ({selectedSession.hostEmail})
                </ModalDescription>
              </ModalHeader>

              <div className="px-6 pb-6 space-y-4">
                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedSession.description}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Format</div>
                    <div className="flex items-center gap-1.5 text-sm mt-0.5">
                      {React.createElement(formatIcons[selectedSession.format], { className: 'h-4 w-4' })}
                      {formatLabels[selectedSession.format]}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                    <div className="flex items-center gap-1.5 text-sm mt-0.5">
                      <Clock className="h-4 w-4" />
                      {selectedSession.durationMinutes} minutes
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Votes</div>
                    <div className="text-sm mt-0.5 font-medium">{selectedSession.votes} ({selectedSession.voters} voters)</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Submitted</div>
                    <div className="text-sm mt-0.5">{selectedSession.createdAt}</div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Technical Requirements */}
                {selectedSession.technicalRequirements.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Technical Requirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSession.technicalRequirements.map(req => (
                        <Badge key={req} variant="outline" className="text-xs capitalize">
                          {req.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedSession.adminNotes && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      Changes Requested
                    </div>
                    <p className="text-sm text-blue-700">{selectedSession.adminNotes}</p>
                  </div>
                )}

                {/* Track Assignment (for pending/unassigned) */}
                {selectedSession.status === 'pending' && !selectedSession.track && (
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Assign Track</h4>
                    <Select value={assignTrack} onValueChange={(v) => setAssignTrack(v as SessionTrack)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a track..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(trackConfig).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRequestChanges(true)
                    }}
                  >
                    Request Changes
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDecline(selectedSession.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedSession.id, assignTrack || undefined)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Request Changes Modal */}
      <Modal open={showRequestChanges} onOpenChange={() => {
        setShowRequestChanges(false)
        setRequestChangesMessage('')
      }}>
        <ModalContent className="sm:max-w-md">
          <ModalHeader>
            <ModalTitle>Request Changes</ModalTitle>
            <ModalDescription>
              Send feedback to the session proposer about what needs to be updated.
            </ModalDescription>
          </ModalHeader>
          <div className="px-6 pb-6 space-y-4">
            <Textarea
              placeholder="Describe what changes are needed..."
              value={requestChangesMessage}
              onChange={(e) => setRequestChangesMessage(e.target.value)}
              className="min-h-[120px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowRequestChanges(false)
                setRequestChangesMessage('')
              }}>
                Cancel
              </Button>
              <Button
                disabled={!requestChangesMessage.trim()}
                onClick={() => {
                  if (selectedSession) {
                    handleRequestChanges(selectedSession.id, requestChangesMessage)
                  }
                }}
              >
                <Send className="h-4 w-4 mr-1" />
                Send Request
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  )
}
