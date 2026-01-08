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
  Users,
  Mic,
  Wrench,
  Monitor,
  AlertCircle,
  Play,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { SessionTrack, trackConfig, MergerStatus } from '@/types'
import { useMergers, Merger, MergerSession } from '@/hooks/use-mergers'

const mergerTypeLabels: Record<string, string> = {
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

const formatIcons: Record<string, React.ElementType> = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

export default function AdminMergersPage() {
  const { mergers, loading, error, updateMergerStatus } = useMergers()
  const [selectedMerger, setSelectedMerger] = React.useState<Merger | null>(null)
  const [filter, setFilter] = React.useState<'all' | MergerStatus>('all')
  const [updating, setUpdating] = React.useState<string | null>(null)

  const handleAccept = async (id: string) => {
    setUpdating(id)
    await updateMergerStatus(id, 'accepted')
    setUpdating(null)
    setSelectedMerger(null)
  }

  const handleDecline = async (id: string) => {
    setUpdating(id)
    await updateMergerStatus(id, 'declined')
    setUpdating(null)
    setSelectedMerger(null)
  }

  const handleExecute = async (id: string) => {
    setUpdating(id)
    await updateMergerStatus(id, 'executed')
    setUpdating(null)
    setSelectedMerger(null)
  }

  const filteredMergers = mergers.filter(m => filter === 'all' || m.status === filter)
  const pendingCount = mergers.filter(m => m.status === 'pending').length
  const acceptedCount = mergers.filter(m => m.status === 'accepted').length

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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Merger Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage session merger proposals
          </p>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </Card>
      </div>
    )
  }

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
        {filteredMergers.map((merger) => {
          if (!merger.sourceSession || !merger.targetSession) {
            return null
          }

          const sourceTrack = merger.sourceSession.track as SessionTrack
          const targetTrack = merger.targetSession.track as SessionTrack

          return (
            <Card key={merger.id} className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Source Session */}
                <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {trackConfig[sourceTrack] && (
                      <Badge className={cn('text-xs text-white border-0', trackConfig[sourceTrack].color)}>
                        {trackConfig[sourceTrack].label}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{merger.sourceSession.votes} votes</span>
                  </div>
                  <h4 className="font-medium text-sm">{merger.sourceSession.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">by {merger.sourceSession.host}</p>
                </div>

                {/* Merge Arrow */}
                <div className="flex items-center justify-center lg:py-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                    <GitMerge className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">{mergerTypeLabels[merger.mergerType] || merger.mergerType}</span>
                  </div>
                </div>

                {/* Target Session */}
                <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {trackConfig[targetTrack] && (
                      <Badge className={cn('text-xs text-white border-0', trackConfig[targetTrack].color)}>
                        {trackConfig[targetTrack].label}
                      </Badge>
                    )}
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
                    Requested by {merger.requestedBy} on {new Date(merger.createdAt).toLocaleDateString()}
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
                        disabled={updating === merger.id}
                      >
                        {updating === merger.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-1" />
                        )}
                        Decline
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAccept(merger.id)}
                        className="text-green-600 hover:text-green-700"
                        disabled={updating === merger.id}
                      >
                        {updating === merger.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Accept
                      </Button>
                    </>
                  )}
                  {merger.status === 'accepted' && (
                    <Button
                      size="sm"
                      onClick={() => handleExecute(merger.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={updating === merger.id}
                    >
                      {updating === merger.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
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
          )
        })}

        {filteredMergers.length === 0 && (
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <GitMerge className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">No merger requests</h3>
            <p className="text-muted-foreground">
              {filter === 'all'
                ? 'Session hosts can propose merging similar sessions together.'
                : `No ${statusLabels[filter as MergerStatus].toLowerCase()} merger requests found.`}
            </p>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedMerger} onOpenChange={() => setSelectedMerger(null)}>
        <ModalContent className="sm:max-w-2xl">
          {selectedMerger && selectedMerger.sourceSession && selectedMerger.targetSession && (
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
                    {mergerTypeLabels[selectedMerger.mergerType] || selectedMerger.mergerType}
                  </Badge>
                </div>
                <ModalTitle>Merger Request Details</ModalTitle>
                <ModalDescription>
                  Requested by {selectedMerger.requestedBy} on {new Date(selectedMerger.createdAt).toLocaleDateString()}
                </ModalDescription>
              </ModalHeader>

              <div className="px-6 pb-6 space-y-4">
                {/* Sessions Being Merged */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Source Session</div>
                    <div className="flex items-center gap-2 mb-2">
                      {trackConfig[selectedMerger.sourceSession.track as SessionTrack] && (
                        <Badge className={cn('text-xs text-white border-0', trackConfig[selectedMerger.sourceSession.track as SessionTrack].color)}>
                          {trackConfig[selectedMerger.sourceSession.track as SessionTrack].label}
                        </Badge>
                      )}
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
                      {trackConfig[selectedMerger.targetSession.track as SessionTrack] && (
                        <Badge className={cn('text-xs text-white border-0', trackConfig[selectedMerger.targetSession.track as SessionTrack].color)}>
                          {trackConfig[selectedMerger.targetSession.track as SessionTrack].label}
                        </Badge>
                      )}
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
                {selectedMerger.requestMessage && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <MessageSquare className="h-4 w-4" />
                      Request Message
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedMerger.requestMessage}</p>
                  </div>
                )}

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
                          disabled={updating === selectedMerger.id}
                        >
                          {updating === selectedMerger.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Decline
                        </Button>
                        <Button
                          onClick={() => handleAccept(selectedMerger.id)}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={updating === selectedMerger.id}
                        >
                          {updating === selectedMerger.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Accept
                        </Button>
                      </>
                    )}
                    {selectedMerger.status === 'accepted' && (
                      <Button
                        onClick={() => handleExecute(selectedMerger.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={updating === selectedMerger.id}
                      >
                        {updating === selectedMerger.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
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
