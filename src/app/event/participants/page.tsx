'use client'

import * as React from 'react'
import {
  User,
  MapPin,
  Briefcase,
  Mail,
  Wallet,
  Search,
  Loader2,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useParticipants, Participant } from '@/hooks/use-participants'
import { useEvent } from '@/hooks/use-event'

export default function ParticipantsPage() {
  const { event, loading: eventLoading } = useEvent()
  const { participants, loading: participantsLoading, error } = useParticipants()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [filter, setFilter] = React.useState<'all' | 'checked-in' | 'admins'>('all')

  const loading = eventLoading || participantsLoading

  // Filter participants
  const filteredParticipants = React.useMemo(() => {
    return participants.filter((participant) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        searchQuery === '' ||
        participant.user.displayName?.toLowerCase().includes(searchLower) ||
        participant.user.email?.toLowerCase().includes(searchLower) ||
        participant.user.walletAddress?.toLowerCase().includes(searchLower)

      // Status filter
      const matchesFilter =
        filter === 'all' ||
        (filter === 'checked-in' && participant.checkedIn) ||
        (filter === 'admins' && participant.isAdmin)

      return matchesSearch && matchesFilter
    })
  }, [participants, searchQuery, filter])

  // Stats
  const stats = React.useMemo(() => {
    return {
      total: participants.length,
      checkedIn: participants.filter(p => p.checkedIn).length,
      admins: participants.filter(p => p.isAdmin).length,
    }
  }, [participants])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state (including auth errors)
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Participants</h1>
          <p className="text-muted-foreground mt-1">
            {event?.name || 'Event'} attendees
          </p>
        </div>

        <Card className="p-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground mb-4">
              {error}
            </p>
            {error.includes('sign in') && (
              <Button asChild>
                <a href="/auth">Sign In</a>
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Participants</h1>
        <p className="text-muted-foreground mt-1">
          {stats.total} registered attendees for {event?.name || 'this event'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Registered</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <p className="text-2xl font-bold">{stats.checkedIn}</p>
              <p className="text-xs text-muted-foreground">Checked In</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-xs text-muted-foreground">Organizers</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or wallet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'checked-in' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('checked-in')}
          >
            Checked In
          </Button>
          <Button
            variant={filter === 'admins' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('admins')}
          >
            Organizers
          </Button>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredParticipants.map((participant, index) => (
          <ParticipantCard key={participant.user.id || index} participant={participant} />
        ))}
      </div>

      {/* Empty State */}
      {filteredParticipants.length === 0 && participants.length > 0 && (
        <Card className="p-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">No participants found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        </Card>
      )}

      {/* No participants yet */}
      {participants.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">No participants yet</h3>
            <p className="text-muted-foreground">
              Participants will appear here once they register for the event
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

function ParticipantCard({ participant }: { participant: Participant }) {
  const displayName = participant.user.displayName || participant.user.email || 'Anonymous'
  const truncatedWallet = participant.user.walletAddress
    ? `${participant.user.walletAddress.slice(0, 6)}...${participant.user.walletAddress.slice(-4)}`
    : null

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {participant.user.avatar ? (
            <img
              src={participant.user.avatar}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <User className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{displayName}</h3>
            {participant.isAdmin && (
              <Badge variant="default" className="text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>

          {participant.user.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Mail className="h-3 w-3" />
              <span className="truncate">{participant.user.email}</span>
            </div>
          )}

          {truncatedWallet && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Wallet className="h-3 w-3" />
              <span className="font-mono">{truncatedWallet}</span>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2 mt-2">
            {participant.checkedIn ? (
              <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Checked In
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Not Checked In
              </Badge>
            )}
          </div>

          {/* Check-in time */}
          {participant.checkedInAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Checked in {new Date(participant.checkedInAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
