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
  Eye,
  Save,
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
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/modal'
import { useParticipants, Participant } from '@/hooks/use-participants'
import { useEvent } from '@/hooks/use-event'
import { useAuth } from '@/hooks/useAuth'

const EVENT_SLUG = 'ethdenver-2025'

export default function AdminParticipantsPage() {
  const { event, loading: eventLoading } = useEvent()
  const { participants, loading: participantsLoading, error, refetch } = useParticipants()
  const { token } = useAuth()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'checked-in' | 'not-checked-in' | 'admins'>('all')

  // Modal states
  const [selectedParticipant, setSelectedParticipant] = React.useState<Participant | null>(null)
  const [viewModalOpen, setViewModalOpen] = React.useState(false)
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [revokeModalOpen, setRevokeModalOpen] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  // Edit form state
  const [editForm, setEditForm] = React.useState({
    displayName: '',
    email: '',
    payoutAddress: '',
    isAdmin: false,
    checkedIn: false,
  })

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

  // Handler to open view profile modal
  const handleViewProfile = (participant: Participant) => {
    setSelectedParticipant(participant)
    setActionError(null)
    setViewModalOpen(true)
  }

  // Handler to open edit modal
  const handleEditDetails = (participant: Participant) => {
    setSelectedParticipant(participant)
    setEditForm({
      displayName: participant.user.displayName || '',
      email: participant.user.email || '',
      payoutAddress: participant.user.walletAddress || '',
      isAdmin: participant.isAdmin,
      checkedIn: participant.checkedIn,
    })
    setActionError(null)
    setEditModalOpen(true)
  }

  // Handler to save edited details
  const handleSaveEdit = async () => {
    if (!selectedParticipant || !token) return

    setActionLoading(true)
    setActionError(null)

    try {
      const response = await fetch(
        `/api/events/${EVENT_SLUG}/access/${selectedParticipant.user.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            displayName: editForm.displayName || undefined,
            email: editForm.email || undefined,
            payoutAddress: editForm.payoutAddress || undefined,
            isAdmin: editForm.isAdmin,
            checkedIn: editForm.checkedIn,
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update participant')
      }

      setEditModalOpen(false)
      refetch?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  // Handler to open revoke modal
  const handleRevokeAccess = (participant: Participant) => {
    setSelectedParticipant(participant)
    setActionError(null)
    setRevokeModalOpen(true)
  }

  // Handler to confirm revoke
  const handleConfirmRevoke = async () => {
    if (!selectedParticipant || !token) return

    setActionLoading(true)
    setActionError(null)

    try {
      const response = await fetch(
        `/api/events/${EVENT_SLUG}/access/${selectedParticipant.user.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke access')
      }

      setRevokeModalOpen(false)
      refetch?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
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
                          <DropdownMenuItem onClick={() => handleEditDetails(participant)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewProfile(participant)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRevokeAccess(participant)}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Revoke Access
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

      {/* View Profile Modal */}
      <Modal open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Participant Profile</ModalTitle>
            <ModalDescription>
              View participant details
            </ModalDescription>
          </ModalHeader>
          {selectedParticipant && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  {selectedParticipant.user.avatar ? (
                    <img
                      src={selectedParticipant.user.avatar}
                      alt={selectedParticipant.user.displayName || 'User'}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedParticipant.user.displayName || 'Anonymous'}
                  </h3>
                  {selectedParticipant.isAdmin && (
                    <Badge variant="default" className="mt-1">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {selectedParticipant.user.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedParticipant.user.email}</span>
                  </div>
                )}
                {selectedParticipant.user.walletAddress && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{selectedParticipant.user.walletAddress}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Status: {selectedParticipant.checkedIn ? 'Checked In' : 'Not Checked In'}
                  </span>
                </div>
                {selectedParticipant.checkedInAt && (
                  <div className="text-sm text-muted-foreground pl-6">
                    Checked in at: {new Date(selectedParticipant.checkedInAt).toLocaleString()}
                  </div>
                )}
                {selectedParticipant.burnerCardId && (
                  <div className="text-sm text-muted-foreground">
                    Burner Card ID: {selectedParticipant.burnerCardId}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Access granted: {new Date(selectedParticipant.grantedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
          <ModalFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Details Modal */}
      <Modal open={editModalOpen} onOpenChange={setEditModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit Participant</ModalTitle>
            <ModalDescription>
              Update participant details and permissions
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4">
            {actionError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {actionError}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="Enter display name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Payout Address</label>
              <input
                type="text"
                value={editForm.payoutAddress}
                onChange={(e) => setEditForm({ ...editForm, payoutAddress: e.target.value })}
                className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm font-mono text-xs"
                placeholder="0x..."
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.isAdmin}
                  onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                Admin
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.checkedIn}
                  onChange={(e) => setEditForm({ ...editForm, checkedIn: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                Checked In
              </label>
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Revoke Access Modal */}
      <Modal open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Revoke Access</ModalTitle>
            <ModalDescription>
              Are you sure you want to revoke access for this participant?
            </ModalDescription>
          </ModalHeader>
          {selectedParticipant && (
            <div className="py-4">
              {actionError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  {actionError}
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  {selectedParticipant.user.avatar ? (
                    <img
                      src={selectedParticipant.user.avatar}
                      alt={selectedParticipant.user.displayName || 'User'}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {selectedParticipant.user.displayName || selectedParticipant.user.email || 'Anonymous'}
                  </div>
                  {selectedParticipant.user.email && (
                    <div className="text-sm text-muted-foreground">
                      {selectedParticipant.user.email}
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                This action will remove the participant from the event. They will need to be re-invited to regain access.
              </p>
            </div>
          )}
          <ModalFooter>
            <Button variant="outline" onClick={() => setRevokeModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRevoke} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Revoke Access
                </>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
