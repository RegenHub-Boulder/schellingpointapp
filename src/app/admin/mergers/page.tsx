'use client'

import * as React from 'react'
import {
  GitMerge,
  Eye,
  Check,
  X,
  Clock,
  ArrowRight,
  MessageSquare,
  ChevronDown,
  Users,
  Mic,
  Wrench,
  Monitor,
  AlertCircle,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { SessionTrack, trackConfig, MergerType, MergerStatus } from '@/types'

interface Session {
  id: string
  title: string
  description: string
  host: string
  track: SessionTrack
  votes: number
  format: 'talk' | 'workshop' | 'discussion' | 'panel' | 'demo'
  durationMinutes: number
}

interface MergerRequest {
  id: string
  sourceSession: Session
  targetSession: Session
  proposedTitle: string
  proposedDescription: string
  mergerType: MergerType
  proposedDuration: number
  requestedBy: string
  requestMessage: string
  status: MergerStatus
  responseMessage?: string
  createdAt: string
}

// Mock sessions for reference
const mockSessions: Record<string, Session> = {
  '1': {
    id: '1',
    title: 'Building DAOs That Actually Work',
    description: 'A comprehensive look at DAO governance patterns.',
    host: 'Alice Chen',
    track: 'governance',
    votes: 127,
    format: 'talk',
    durationMinutes: 45
  },
  '2': {
    id: '2',
    title: 'DAO Legal Structures',
    description: 'Navigating the legal landscape for DAOs.',
    host: 'Legal Expert',
    track: 'governance',
    votes: 34,
    format: 'discussion',
    durationMinutes: 30
  },
  '3': {
    id: '3',
    title: 'Zero-Knowledge Proofs Intro',
    description: 'Introduction to ZK proofs and their applications.',
    host: 'Bob Smith',
    track: 'technical',
    votes: 98,
    format: 'talk',
    durationMinutes: 45
  },
  '4': {
    id: '4',
    title: 'ZK in Practice Workshop',
    description: 'Hands-on ZK circuit building.',
    host: 'ZK Dev',
    track: 'technical',
    votes: 67,
    format: 'workshop',
    durationMinutes: 90
  },
  '5': {
    id: '5',
    title: 'MEV Protection Strategies',
    description: 'How to protect your transactions from MEV.',
    host: 'DeFi Expert',
    track: 'defi',
    votes: 52,
    format: 'talk',
    durationMinutes: 30
  },
  '6': {
    id: '6',
    title: 'Advanced MEV Research',
    description: 'Deep dive into MEV research and mitigation.',
    host: 'Researcher',
    track: 'defi',
    votes: 41,
    format: 'talk',
    durationMinutes: 45
  },
}

// Mock merger requests
const mockMergers: MergerRequest[] = [
  {
    id: 'm1',
    sourceSession: mockSessions['1'],
    targetSession: mockSessions['2'],
    proposedTitle: 'DAOs: Governance & Legal Foundations',
    proposedDescription: 'A comprehensive session covering both governance patterns and legal structures for DAOs.',
    mergerType: 'panel',
    proposedDuration: 60,
    requestedBy: 'Alice Chen',
    requestMessage: 'Our sessions have significant overlap and would benefit from combining into a panel discussion.',
    status: 'pending',
    createdAt: '2024-02-10'
  },
  {
    id: 'm2',
    sourceSession: mockSessions['3'],
    targetSession: mockSessions['4'],
    proposedTitle: 'Zero-Knowledge Proofs: Theory to Practice',
    proposedDescription: 'From ZK fundamentals to hands-on circuit building in one cohesive workshop progression.',
    mergerType: 'workshop-progression',
    proposedDuration: 120,
    requestedBy: 'Bob Smith',
    requestMessage: 'My intro talk would be a perfect lead-in to the hands-on workshop. Attendees would get both theory and practice.',
    status: 'accepted',
    responseMessage: 'Great idea! This creates a much more valuable learning experience.',
    createdAt: '2024-02-08'
  },
  {
    id: 'm3',
    sourceSession: mockSessions['5'],
    targetSession: mockSessions['6'],
    proposedTitle: 'MEV Deep Dive: Protection & Research',
    proposedDescription: 'Combined session on MEV protection strategies and cutting-edge research.',
    mergerType: 'co-presentation',
    proposedDuration: 60,
    requestedBy: 'DeFi Expert',
    requestMessage: 'We cover complementary aspects of MEV. A joint presentation would be more comprehensive.',
    status: 'counter-proposed',
    responseMessage: 'I\'d prefer a dialogue format where we can discuss different perspectives.',
    createdAt: '2024-02-09'
  },
]

const mergerTypeLabels: Record<MergerType, string> = {
  'co-presentation': 'Co-Presentation',
  'panel': 'Panel Discussion',
  'workshop-progression': 'Workshop Progression',
  'dialogue': 'Dialogue',
}

const statusColors: Record<MergerStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  'counter-proposed': 'bg-purple-100 text-purple-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  executed: 'bg-blue-100 text-blue-800',
}

const statusLabels: Record<MergerStatus, string> = {
  pending: 'Pending',
  'counter-proposed': 'Counter-Proposed',
  accepted: 'Accepted',
  declined: 'Declined',
  executed: 'Executed',
}

const formatIcons = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

export default function AdminMergersPage() {
  const [mergers, setMergers] = React.useState(mockMergers)
  const [selectedMerger, setSelectedMerger] = React.useState<MergerRequest | null>(null)
  const [filter, setFilter] = React.useState<'all' | MergerStatus>('all')

  const handleAccept = (id: string) => {
    setMergers(prev => prev.map(m => m.id === id ? { ...m, status: 'accepted' as MergerStatus } : m))
    setSelectedMerger(null)
  }

  const handleDecline = (id: string) => {
    setMergers(prev => prev.map(m => m.id === id ? { ...m, status: 'declined' as MergerStatus } : m))
    setSelectedMerger(null)
  }

  const handleExecute = (id: string) => {
    setMergers(prev => prev.map(m => m.id === id ? { ...m, status: 'executed' as MergerStatus } : m))
    setSelectedMerger(null)
  }

  const filteredMergers = mergers.filter(m => filter === 'all' || m.status === filter)
  const pendingCount = mergers.filter(m => m.status === 'pending').length
  const acceptedCount = mergers.filter(m => m.status === 'accepted').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Merger Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage session merger proposals
          </p>
        </div>

        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              {pendingCount} pending
            </Badge>
          )}
          {acceptedCount > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {acceptedCount} ready to execute
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'counter-proposed', 'accepted', 'declined', 'executed'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : statusLabels[f]}
          </Button>
        ))}
      </div>

      {/* Merger Cards */}
      <div className="space-y-4">
        {filteredMergers.map((merger) => (
          <Card key={merger.id} className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              {/* Source Session */}
              <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn('text-xs text-white border-0', trackConfig[merger.sourceSession.track].color)}>
                    {trackConfig[merger.sourceSession.track].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{merger.sourceSession.votes} votes</span>
                </div>
                <h4 className="font-medium text-sm">{merger.sourceSession.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">by {merger.sourceSession.host}</p>
              </div>

              {/* Merge Arrow */}
              <div className="flex items-center justify-center lg:py-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                  <GitMerge className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">{mergerTypeLabels[merger.mergerType]}</span>
                </div>
              </div>

              {/* Target Session */}
              <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn('text-xs text-white border-0', trackConfig[merger.targetSession.track].color)}>
                    {trackConfig[merger.targetSession.track].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{merger.targetSession.votes} votes</span>
                </div>
                <h4 className="font-medium text-sm">{merger.targetSession.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">by {merger.targetSession.host}</p>
              </div>
            </div>

            {/* Result Preview */}
            <div className="mt-4 p-3 border rounded-lg bg-background">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ArrowRight className="h-3 w-3" />
                Proposed Result
              </div>
              <h4 className="font-medium">{merger.proposedTitle}</h4>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{merger.proposedDescription}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {merger.proposedDuration} min
                </span>
                <span>Combined: {merger.sourceSession.votes + merger.targetSession.votes} votes</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    statusColors[merger.status]
                  )}
                >
                  {statusLabels[merger.status]}
                </span>
                <span className="text-xs text-muted-foreground">
                  Requested by {merger.requestedBy} on {merger.createdAt}
                </span>
              </div>

              <div className="flex gap-2">
                {merger.status === 'pending' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDecline(merger.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAccept(merger.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </>
                )}
                {merger.status === 'accepted' && (
                  <Button
                    size="sm"
                    onClick={() => handleExecute(merger.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Execute Merger
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMerger(merger)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Details
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredMergers.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No merger requests found.
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedMerger} onOpenChange={() => setSelectedMerger(null)}>
        <ModalContent className="sm:max-w-2xl">
          {selectedMerger && (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      statusColors[selectedMerger.status]
                    )}
                  >
                    {statusLabels[selectedMerger.status]}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {mergerTypeLabels[selectedMerger.mergerType]}
                  </Badge>
                </div>
                <ModalTitle>Merger Request Details</ModalTitle>
                <ModalDescription>
                  Requested by {selectedMerger.requestedBy} on {selectedMerger.createdAt}
                </ModalDescription>
              </ModalHeader>

              <div className="px-6 pb-6 space-y-4">
                {/* Sessions Being Merged */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Source Session</div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn('text-xs text-white border-0', trackConfig[selectedMerger.sourceSession.track].color)}>
                        {trackConfig[selectedMerger.sourceSession.track].label}
                      </Badge>
                    </div>
                    <h4 className="font-medium">{selectedMerger.sourceSession.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{selectedMerger.sourceSession.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span>Host: {selectedMerger.sourceSession.host}</span>
                      <span>{selectedMerger.sourceSession.votes} votes</span>
                      <span>{selectedMerger.sourceSession.durationMinutes} min</span>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Target Session</div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn('text-xs text-white border-0', trackConfig[selectedMerger.targetSession.track].color)}>
                        {trackConfig[selectedMerger.targetSession.track].label}
                      </Badge>
                    </div>
                    <h4 className="font-medium">{selectedMerger.targetSession.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{selectedMerger.targetSession.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span>Host: {selectedMerger.targetSession.host}</span>
                      <span>{selectedMerger.targetSession.votes} votes</span>
                      <span>{selectedMerger.targetSession.durationMinutes} min</span>
                    </div>
                  </div>
                </div>

                {/* Request Message */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <MessageSquare className="h-4 w-4" />
                    Request Message
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedMerger.requestMessage}</p>
                </div>

                {/* Response Message (if any) */}
                {selectedMerger.responseMessage && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      Response from Target Host
                    </div>
                    <p className="text-sm text-blue-700">{selectedMerger.responseMessage}</p>
                  </div>
                )}

                {/* Proposed Result */}
                <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <GitMerge className="h-4 w-4 text-primary" />
                    Proposed Merged Session
                  </div>
                  <h4 className="font-semibold">{selectedMerger.proposedTitle}</h4>
                  <p className="text-sm text-muted-foreground mt-2">{selectedMerger.proposedDescription}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {selectedMerger.proposedDuration} minutes
                    </span>
                    <span className="font-medium">
                      Combined votes: {selectedMerger.sourceSession.votes + selectedMerger.targetSession.votes}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedMerger(null)}>
                    Close
                  </Button>
                  <div className="flex gap-2">
                    {selectedMerger.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleDecline(selectedMerger.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                        <Button
                          onClick={() => handleAccept(selectedMerger.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </>
                    )}
                    {selectedMerger.status === 'accepted' && (
                      <Button
                        onClick={() => handleExecute(selectedMerger.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Execute Merger
                      </Button>
                    )}
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
