'use client'

import * as React from 'react'
import {
  MapPin,
  Clock,
  Users,
  Vote,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  GitMerge,
  Trash2,
  Edit,
  ExternalLink,
  FileText,
  Upload,
  Home,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SelfHostedModal } from '@/components/sessions/self-hosted-modal'

type SessionStatus = 'pending' | 'approved' | 'scheduled' | 'rejected' | 'self-hosted'

interface Session {
  id: number
  title: string
  description: string
  format: string
  duration: number
  status: SessionStatus
  votes: number
  credits: number
  venue?: {
    name: string
    capacity: number
    features: string[]
  }
  scheduledTime?: string
  selfHostedDetails?: {
    venue: string
    date: string
    time: string
    notes?: string
  }
  mergeSuggestions?: {
    sessionId: number
    sessionTitle: string
    similarityScore: number
  }[]
}

export default function MySessionsPage() {
  const [selectedSessions, setSelectedSessions] = React.useState<number[]>([])
  const [showMergeModal, setShowMergeModal] = React.useState(false)
  const [uploadingTranscript, setUploadingTranscript] = React.useState<number | null>(null)
  const [sessionsWithTranscripts, setSessionsWithTranscripts] = React.useState<Set<number>>(
    new Set()
  )
  const [selfHostedSessionId, setSelfHostedSessionId] = React.useState<number | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Mock data - in real app, this would come from API
  const mockSessions: Session[] = [
    {
      id: 1,
      title: 'Decentralized Identity Solutions',
      description:
        'Deep dive into self-sovereign identity systems and their implementation using DIDs and verifiable credentials.',
      format: 'Workshop',
      duration: 90,
      status: 'scheduled',
      votes: 89,
      credits: 1247,
      venue: {
        name: 'Main Hall',
        capacity: 100,
        features: ['Projector', 'Whiteboard', 'Sound System'],
      },
      scheduledTime: 'Mar 15, 10:00 AM',
    },
    {
      id: 2,
      title: 'Web3 UX Design Patterns',
      description:
        'Explore best practices for creating intuitive user experiences in decentralized applications.',
      format: 'Talk',
      duration: 45,
      status: 'approved',
      votes: 52,
      credits: 789,
      mergeSuggestions: [
        {
          sessionId: 15,
          sessionTitle: 'Designing for Decentralization',
          similarityScore: 85,
        },
      ],
    },
    {
      id: 3,
      title: 'DAO Governance Models',
      description:
        'Comparative analysis of governance mechanisms across different DAOs.',
      format: 'Discussion',
      duration: 60,
      status: 'pending',
      votes: 34,
      credits: 456,
    },
    {
      id: 4,
      title: 'Introduction to Smart Contracts',
      description: 'Beginner-friendly introduction to Solidity and smart contract development.',
      format: 'Workshop',
      duration: 120,
      status: 'rejected',
      votes: 12,
      credits: 98,
    },
  ]

  const [sessions, setSessions] = React.useState<Session[]>(mockSessions)

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

  const handleMergeRequest = (sessionId: number, targetId: number) => {
    console.log(`Requesting merge: Session ${sessionId} with Session ${targetId}`)
    // In real app, this would send a merge request to the API
  }

  const handleTranscriptUpload = async (sessionId: number, file: File) => {
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

  const triggerFileInput = (sessionId: number) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.sessionId = sessionId.toString()
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const sessionId = parseInt(e.target.dataset.sessionId || '0')

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
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selfHostedSessionId
            ? { ...s, status: 'self-hosted' as SessionStatus, selfHostedDetails: details }
            : s
        )
      )
      setSelfHostedSessionId(null)
    }
  }

  const stats = {
    total: sessions.length,
    scheduled: sessions.filter((s) => s.status === 'scheduled').length,
    approved: sessions.filter((s) => s.status === 'approved').length,
    pending: sessions.filter((s) => s.status === 'pending').length,
    selfHosted: sessions.filter((s) => s.status === 'self-hosted').length,
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
          const statusInfo = statusConfig[session.status]
          return (
            <Card key={session.id} className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{session.title}</h3>
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
                  {(session.status === 'rejected' || session.status === 'approved') && !session.selfHostedDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelfHostedSessionId(session.id)}
                      className="text-primary border-primary"
                    >
                      <Home className="h-4 w-4 mr-1" />
                      Make Self-Hosted
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {session.duration} min • {session.format}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Vote className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {session.votes} votes • {session.credits} credits
                  </span>
                </div>
                {session.scheduledTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{session.scheduledTime}</span>
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
                        <div className="flex gap-1">
                          {session.venue.features.slice(0, 3).map((feature, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Self-Hosted Details */}
              {session.selfHostedDetails && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4 text-blue-700" />
                    <div className="text-sm font-medium text-blue-900">Community Session Details</div>
                  </div>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <strong>Location:</strong> {session.selfHostedDetails.venue}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <strong>Date:</strong> {session.selfHostedDetails.date}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <strong>Time:</strong> {session.selfHostedDetails.time}
                    </div>
                    {session.selfHostedDetails.notes && (
                      <div className="flex items-start gap-2 mt-2">
                        <FileText className="h-3 w-3 mt-0.5" />
                        <div>
                          <strong>Notes:</strong> {session.selfHostedDetails.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Merge Suggestions */}
              {session.mergeSuggestions && session.mergeSuggestions.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <GitMerge className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Merge Suggestions</span>
                    <Badge variant="secondary" className="text-xs">
                      Save {session.mergeSuggestions.length} conflicts
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {session.mergeSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.sessionId}
                        className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">{suggestion.sessionTitle}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {suggestion.similarityScore}% topic similarity • Merge to get 10% vote
                            bonus
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleMergeRequest(session.id, suggestion.sessionId)
                            }
                          >
                            <GitMerge className="h-3 w-3 mr-1" />
                            Request Merge
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
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
            <Button>Propose Your First Session</Button>
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
