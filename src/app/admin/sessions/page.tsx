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
  ChevronDown
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

interface Session {
  id: string
  title: string
  description: string
  host: string
  hostEmail: string
  format: 'talk' | 'workshop' | 'discussion' | 'panel' | 'demo'
  track: SessionTrack | null
  status: 'pending' | 'approved' | 'declined' | 'changes_requested'
  votes: number
  voters: number
  durationMinutes: number
  technicalRequirements: string[]
  tags: string[]
  createdAt: string
  adminNotes?: string
}

// Mock data with more details
const mockSessions: Session[] = [
  {
    id: '1',
    title: 'Building DAOs That Actually Work',
    description: 'A comprehensive look at DAO governance patterns that have proven successful. We\'ll explore voting mechanisms, delegation strategies, and how to balance decentralization with operational efficiency.',
    host: 'Alice Chen',
    hostEmail: 'alice@web3.xyz',
    format: 'talk',
    track: 'governance',
    status: 'approved',
    votes: 127,
    voters: 68,
    durationMinutes: 45,
    technicalRequirements: ['projector', 'microphone'],
    tags: ['DAOs', 'Governance', 'Voting'],
    createdAt: '2024-02-01'
  },
  {
    id: '2',
    title: 'Zero-Knowledge Proofs Workshop',
    description: 'Hands-on workshop where participants will learn to build their first ZK circuit using Circom. Covers basic theory, practical implementation, and testing.',
    host: 'Bob Smith',
    hostEmail: 'bob@zkresearch.io',
    format: 'workshop',
    track: 'technical',
    status: 'approved',
    votes: 98,
    voters: 42,
    durationMinutes: 90,
    technicalRequirements: ['projector', 'whiteboard', 'power_outlets'],
    tags: ['ZK', 'Cryptography', 'Workshop'],
    createdAt: '2024-02-02'
  },
  {
    id: '3',
    title: 'Advanced Solidity Patterns',
    description: 'Deep dive into advanced Solidity patterns including proxy contracts, diamond standard, and gas optimization techniques.',
    host: 'New Proposer',
    hostEmail: 'newdev@eth.dev',
    format: 'talk',
    track: null,
    status: 'pending',
    votes: 0,
    voters: 0,
    durationMinutes: 45,
    technicalRequirements: ['projector'],
    tags: ['Solidity', 'Smart Contracts', 'EVM'],
    createdAt: '2024-02-15'
  },
  {
    id: '4',
    title: 'DeFi Security Audit Workshop',
    description: 'Learn how to audit DeFi protocols. We\'ll walk through real-world vulnerabilities and how to identify them.',
    host: 'Security Expert',
    hostEmail: 'auditor@secure.io',
    format: 'workshop',
    track: null,
    status: 'pending',
    votes: 0,
    voters: 0,
    durationMinutes: 90,
    technicalRequirements: ['projector', 'whiteboard', 'power_outlets'],
    tags: ['Security', 'DeFi', 'Auditing'],
    createdAt: '2024-02-16'
  },
  {
    id: '5',
    title: 'NFT Marketplace Design',
    description: 'Exploring UX patterns for NFT marketplaces, covering discovery, minting flows, and accessibility.',
    host: 'UI Designer',
    hostEmail: 'design@nft.art',
    format: 'demo',
    track: null,
    status: 'pending',
    votes: 0,
    voters: 0,
    durationMinutes: 30,
    technicalRequirements: ['projector', 'av_support'],
    tags: ['NFTs', 'UX', 'Design'],
    createdAt: '2024-02-17'
  },
  {
    id: '6',
    title: 'Too Short Description',
    description: 'Short.',
    host: 'Quick Person',
    hostEmail: 'quick@email.com',
    format: 'talk',
    track: null,
    status: 'changes_requested',
    votes: 0,
    voters: 0,
    durationMinutes: 45,
    technicalRequirements: [],
    tags: ['Quick'],
    createdAt: '2024-02-18',
    adminNotes: 'Please expand your description to at least 50 characters and add more relevant tags.'
  },
  {
    id: '7',
    title: 'Regenerative Finance Panel',
    description: 'Industry leaders discuss the future of ReFi, carbon credits on-chain, and how Web3 can fund regeneration.',
    host: 'Carol Williams',
    hostEmail: 'carol@refi.earth',
    format: 'panel',
    track: 'sustainability',
    status: 'approved',
    votes: 84,
    voters: 47,
    durationMinutes: 60,
    technicalRequirements: ['projector', 'microphone', 'av_support'],
    tags: ['ReFi', 'Climate', 'Panel'],
    createdAt: '2024-02-05'
  },
  {
    id: '8',
    title: 'Future of L2s',
    description: 'Exploring rollups, validiums, and emerging L2 solutions. We\'ll compare approaches and discuss scaling tradeoffs.',
    host: 'David Lee',
    hostEmail: 'david@l2research.io',
    format: 'talk',
    track: 'technical',
    status: 'approved',
    votes: 89,
    voters: 51,
    durationMinutes: 45,
    technicalRequirements: ['projector'],
    tags: ['L2', 'Scaling', 'Rollups'],
    createdAt: '2024-02-03'
  },
]

const formatIcons = {
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

const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  changes_requested: 'bg-blue-100 text-blue-800',
}

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
  changes_requested: 'Changes Requested',
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = React.useState(mockSessions)
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'approved' | 'declined' | 'changes_requested'>('all')
  const [search, setSearch] = React.useState('')
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [showRequestChanges, setShowRequestChanges] = React.useState(false)
  const [requestChangesMessage, setRequestChangesMessage] = React.useState('')
  const [assignTrack, setAssignTrack] = React.useState<SessionTrack | ''>('')

  const handleApprove = (id: string, track?: SessionTrack) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'approved', track: track || s.track } : s))
    )
    setSelectedSession(null)
  }

  const handleDecline = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'declined' } : s))
    )
    setSelectedSession(null)
  }

  const handleRequestChanges = (id: string, message: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'changes_requested', adminNotes: message } : s))
    )
    setRequestChangesMessage('')
    setShowRequestChanges(false)
    setSelectedSession(null)
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
  const changesCount = sessions.filter((s) => s.status === 'changes_requested').length

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
          {changesCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {changesCount} awaiting changes
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
          {(['all', 'pending', 'changes_requested', 'approved', 'declined'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
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
