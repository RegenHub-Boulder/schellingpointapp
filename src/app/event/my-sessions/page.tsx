'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  MapPin,
  Clock,
  Users,
  Vote,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Edit,
  FileText,
  Upload,
  Home,
  Loader2,
  Plus,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SelfHostedModal } from '@/components/sessions/self-hosted-modal'
import { useSessions, Session } from '@/hooks/use-sessions'
import { useAuth } from '@/hooks'

type SessionStatus = 'pending' | 'approved' | 'scheduled' | 'rejected' | 'self-hosted'

export default function MySessionsPage() {
  const { user } = useAuth()
  const { sessions: apiSessions, loading, error, refetch } = useSessions({ mine: true })

  const [uploadingTranscript, setUploadingTranscript] = React.useState<string | null>(null)
  const [sessionsWithTranscripts, setSessionsWithTranscripts] = React.useState<Set<string>>(
    new Set()
  )
  const [selfHostedSessionId, setSelfHostedSessionId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Transform API sessions to include vote stats
  const sessions = React.useMemo(() => {
    return apiSessions.map(s => ({
      ...s,
      votes: s.preVoteStats?.totalVotes || 0,
      credits: 0, // Credits spent not currently tracked per-session
    }))
  }, [apiSessions])

  const statusConfig = {
    pending: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Pending Review',
      variant: 'secondary' as const,
      description: 'Awaiting schedule assignment',
    },
    approved: {
      icon: <CheckCircle className="h-4 w-4" />,
      label: 'Approved',
      variant: 'success' as const,
      description: 'Approved, awaiting venue assignment',
    },
    scheduled: {
      icon: <Calendar className="h-4 w-4" />,
      label: 'Scheduled',
      variant: 'default' as const,
      description: 'Time and venue confirmed',
    },
    rejected: {
      icon: <XCircle className="h-4 w-4" />,
      label: 'Not Scheduled',
      variant: 'destructive' as const,
      description: 'Did not receive enough votes',
    },
    'self-hosted': {
      icon: <Home className="h-4 w-4" />,
      label: 'Community Session',
      variant: 'secondary' as const,
      description: 'Self-hosted at external venue',
    },
  }

  const handleTranscriptUpload = async (sessionId: string, file: File) => {
    setUploadingTranscript(sessionId)

    try {
      // Simulate upload - in real app, would upload to server/S3/IPFS
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Add to sessions with transcripts
      setSessionsWithTranscripts((prev) => new Set(prev).add(sessionId))

      console.log(`Transcript uploaded for session ${sessionId}:`, file.name)
      // In real app, this would:
      // 1. Upload file to storage (S3/IPFS)
      // 2. Store reference in database
      // 3. Add to shared knowledge base for AI training
    } catch (error) {
      console.error('Failed to upload transcript:', error)
    } finally {
      setUploadingTranscript(null)
    }
  }

  const triggerFileInput = (sessionId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.sessionId = sessionId
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const sessionId = e.target.dataset.sessionId || ''

    if (file && sessionId) {
      handleTranscriptUpload(sessionId, file)
    }

    // Reset input
    e.target.value = ''
  }

  const handleSelfHostedConfirm = (details: {
    venue: string
    date: string
    time: string
    notes?: string
  }) => {
    if (selfHostedSessionId !== null) {
      // In real app, would save to API
      console.log('Self-hosted details:', details)
      setSelfHostedSessionId(null)
    }
  }

  const stats = {
    total: sessions.length,
    scheduled: sessions.filter((s) => s.status === 'scheduled').length,
    approved: sessions.filter((s) => s.status === 'approved').length,
    pending: sessions.filter((s) => s.status === 'pending').length,
  }

  // Not signed in
  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Please sign in to view your sessions.</p>
        <Button asChild>
          <Link href="/">Sign In</Link>
        </Button>
      </div>
    )
  }

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
      {/* Hidden file input for transcript uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.doc,.docx,.md"
        onChange={handleFileSelect}
        className="hidden"
        data-session-id=""
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Sessions</h1>
          <p className="text-muted-foreground mt-1">
            Sessions you've proposed and their current status
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Proposed</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Scheduled</div>
          <div className="text-2xl font-bold mt-1 text-success">{stats.scheduled}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Approved</div>
          <div className="text-2xl font-bold mt-1 text-primary">{stats.approved}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold mt-1 text-warning">{stats.pending}</div>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.map((session) => {
          const statusKey = session.status as SessionStatus
          const statusInfo = statusConfig[statusKey] || statusConfig.pending
          const scheduledTime = session.timeSlot
            ? new Date(session.timeSlot.start_time).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : null
          return (
            <Card key={session.id} className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Link href={`/event/sessions/${session.id}`} className="hover:underline">
                      <h3 className="text-lg font-semibold">{session.title}</h3>
                    </Link>
                    <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                      {statusInfo.icon}
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{session.description}</p>
                </div>
                <div className="flex gap-2">
                  {session.status === 'scheduled' && (
                    <Button
                      variant={sessionsWithTranscripts.has(session.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => triggerFileInput(session.id)}
                      disabled={uploadingTranscript === session.id}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {uploadingTranscript === session.id
                        ? 'Uploading...'
                        : sessionsWithTranscripts.has(session.id)
                        ? 'Update Transcript'
                        : 'Upload Transcript'}
                    </Button>
                  )}
                  {session.status === 'pending' && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/event/sessions/${session.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {session.duration} min • <span className="capitalize">{session.format}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Vote className="h-4 w-4 text-muted-foreground" />
                  <span>{session.votes} votes</span>
                </div>
                {scheduledTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{scheduledTime}</span>
                  </div>
                )}
                {session.venue && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{session.venue.name}</span>
                  </div>
                )}
              </div>

              {/* Venue Details */}
              {session.venue && (
                <div className="p-3 bg-muted/30 rounded-lg mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium mb-1">Venue: {session.venue.name}</div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {session.venue.capacity} capacity
                        </div>
                        {session.venue.features && session.venue.features.length > 0 && (
                          <div className="flex gap-1">
                            {session.venue.features.slice(0, 3).map((feature: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Topic Tags */}
              {session.topicTags && session.topicTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {session.topicTags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Status Message */}
              <div className="mt-4 text-xs text-muted-foreground">
                {statusInfo.description}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't proposed any sessions for this event.
            </p>
            <Button asChild>
              <Link href="/event/propose">
                <Plus className="h-4 w-4 mr-2" />
                Propose Your First Session
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Self-Hosted Modal */}
      {selfHostedSessionId !== null && (
        <SelfHostedModal
          open={selfHostedSessionId !== null}
          onOpenChange={(open) => !open && setSelfHostedSessionId(null)}
          sessionTitle={sessions.find((s) => s.id === selfHostedSessionId)?.title || ''}
          onConfirm={handleSelfHostedConfirm}
        />
      )}
    </div>
  )
}
