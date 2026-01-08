'use client'

import * as React from 'react'
import {
  User,
  Mail,
  Search,
  Download,
  UserPlus,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Wallet,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useParticipants, Participant } from '@/hooks/use-participants'
import { useEvent } from '@/hooks/use-event'

export default function AdminParticipantsPage() {
  const { event, loading: eventLoading } = useEvent()
  const { participants, loading: participantsLoading, error } = useParticipants()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'checked-in' | 'not-checked-in' | 'admins'>('all')

  const loading = eventLoading || participantsLoading

  // Filter participants
  const filteredParticipants = React.useMemo(() => {
    return participants.filter((participant) => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        searchQuery === '' ||
        participant.user.displayName?.toLowerCase().includes(searchLower) ||
        participant.user.email?.toLowerCase().includes(searchLower) ||
        participant.user.walletAddress?.toLowerCase().includes(searchLower)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'checked-in' && participant.checkedIn) ||
        (statusFilter === 'not-checked-in' && !participant.checkedIn) ||
        (statusFilter === 'admins' && participant.isAdmin)

      return matchesSearch && matchesStatus
    })
  }, [participants, searchQuery, statusFilter])

  // Stats
  const stats = React.useMemo(() => {
    return {
      total: participants.length,
      checkedIn: participants.filter((p) => p.checkedIn).length,
      notCheckedIn: participants.filter((p) => !p.checkedIn).length,
      admins: participants.filter((p) => p.isAdmin).length,
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

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Participants</h1>
          <p className="text-muted-foreground mt-1">
            Manage event participants and their permissions
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Participants</h1>
          <p className="text-muted-foreground mt-1">
            {participants.length} registered for {event?.name || 'this event'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button disabled>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Participant
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Registered</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Checked In</div>
          <div className="text-2xl font-bold mt-1 text-green-600">{stats.checkedIn}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Not Checked In</div>
          <div className="text-2xl font-bold mt-1 text-muted-foreground">{stats.notCheckedIn}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Organizers</div>
          <div className="text-2xl font-bold mt-1 text-primary">{stats.admins}</div>
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
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'checked-in' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('checked-in')}
          >
            Checked In
          </Button>
          <Button
            variant={statusFilter === 'not-checked-in' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('not-checked-in')}
          >
            Not Checked In
          </Button>
          <Button
            variant={statusFilter === 'admins' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('admins')}
          >
            Organizers
          </Button>
        </div>
      </div>

      {/* Participants Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Participant
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Contact
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Granted
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map((participant, index) => {
                const displayName = participant.user.displayName || participant.user.email || 'Anonymous'
                const truncatedWallet = participant.user.walletAddress
                  ? `${participant.user.walletAddress.slice(0, 6)}...${participant.user.walletAddress.slice(-4)}`
                  : null

                return (
                  <tr key={participant.user.id || index} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {participant.user.avatar ? (
                            <img
                              src={participant.user.avatar}
                              alt={displayName}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {displayName}
                            {participant.isAdmin && (
                              <Badge variant="default" className="text-xs">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                          </div>
                          {participant.burnerCardId && (
                            <div className="text-xs text-muted-foreground">
                              Card: {participant.burnerCardId}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {participant.user.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-xs">{participant.user.email}</span>
                          </div>
                        )}
                        {truncatedWallet && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Wallet className="h-3 w-3" />
                            <span className="font-mono">{truncatedWallet}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {new Date(participant.grantedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {participant.checkedIn ? (
                        <Badge className="bg-green-500 flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Checked In
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          Not Checked In
                        </Badge>
                      )}
                      {participant.checkedInAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(participant.checkedInAt).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <User className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" disabled>
                            <Ban className="h-4 w-4 mr-2" />
                            Revoke Access
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" disabled>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty State */}
      {filteredParticipants.length === 0 && participants.length > 0 && (
        <div className="text-center py-12">
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
      )}

      {/* No participants */}
      {participants.length === 0 && (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">No participants yet</h3>
          <p className="text-muted-foreground mb-4">
            Grant access to participants to get started
          </p>
          <Button disabled>
            <UserPlus className="h-4 w-4 mr-2" />
            Add First Participant
          </Button>
        </div>
      )}
    </div>
  )
}
