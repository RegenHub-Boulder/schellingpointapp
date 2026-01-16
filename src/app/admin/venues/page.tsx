'use client'

import * as React from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  MapPin,
  Clock,
  Users,
  Wifi,
  Monitor,
  Mic,
  Coffee,
  Zap,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useVenues, Venue } from '@/hooks/use-venues'
import { useTimeSlots, TimeSlot } from '@/hooks/use-time-slots'

const featureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  projector: Monitor,
  microphone: Mic,
  whiteboard: Edit2,
  power_outlets: Zap,
  wifi: Wifi,
  av_support: Mic,
  catering_access: Coffee,
}

const featureLabels: Record<string, string> = {
  projector: 'Projector',
  microphone: 'Microphone',
  whiteboard: 'Whiteboard',
  power_outlets: 'Power Outlets',
  wifi: 'WiFi',
  av_support: 'A/V Support',
  catering_access: 'Catering Access',
}

const allFeatures = Object.keys(featureLabels)

export default function AdminVenuesPage() {
  // Use the venues hook for API integration
  const { venues, loading: venuesLoading, error: venuesError, createVenue, updateVenue, deleteVenue, refetch } = useVenues()

  // Use the time slots hook for API integration
  const {
    timeSlots,
    loading: timeSlotsLoading,
    error: timeSlotsError,
    createTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
    refetch: refetchTimeSlots
  } = useTimeSlots()

  const [editingVenue, setEditingVenue] = React.useState<Venue | null>(null)
  const [editingSlot, setEditingSlot] = React.useState<TimeSlot | null>(null)
  const [showAddVenue, setShowAddVenue] = React.useState(false)
  const [showAddSlot, setShowAddSlot] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Form state for venues
  const [venueName, setVenueName] = React.useState('')
  const [venueCapacity, setVenueCapacity] = React.useState('')
  const [venueFeatures, setVenueFeatures] = React.useState<string[]>([])

  // Custom features state - persists across the app
  const [customFeatures, setCustomFeatures] = React.useState<string[]>([])
  const [newFeatureName, setNewFeatureName] = React.useState('')

  // Form state for time slots
  const [slotStart, setSlotStart] = React.useState('')
  const [slotEnd, setSlotEnd] = React.useState('')
  const [slotIsAvailable, setSlotIsAvailable] = React.useState(true)
  const [slotLabel, setSlotLabel] = React.useState('')

  const resetVenueForm = () => {
    setVenueName('')
    setVenueCapacity('')
    setVenueFeatures([])
    setEditingVenue(null)
    setShowAddVenue(false)
  }

  const resetSlotForm = () => {
    setSlotStart('')
    setSlotEnd('')
    setSlotIsAvailable(true)
    setSlotLabel('')
    setEditingSlot(null)
    setShowAddSlot(false)
  }

  const handleEditVenue = (venue: Venue) => {
    setEditingVenue(venue)
    setVenueName(venue.name)
    setVenueCapacity(venue.capacity.toString())
    setVenueFeatures(venue.features)
    setShowAddVenue(true)
  }

  const handleSaveVenue = async () => {
    if (!venueName || !venueCapacity) return

    setSaving(true)
    try {
      if (editingVenue) {
        const result = await updateVenue(editingVenue.id, {
          name: venueName,
          capacity: parseInt(venueCapacity),
          features: venueFeatures,
        })
        if (!result.success) {
          alert(result.error || 'Failed to update venue')
          return
        }
      } else {
        const result = await createVenue({
          name: venueName,
          capacity: parseInt(venueCapacity),
          features: venueFeatures,
        })
        if (!result.success) {
          alert(result.error || 'Failed to create venue')
          return
        }
      }
      resetVenueForm()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVenue = async (id: string) => {
    if (!confirm('Are you sure you want to delete this venue?')) return

    const result = await deleteVenue(id)
    if (!result.success) {
      alert(result.error || 'Failed to delete venue')
    }
  }

  const handleEditSlot = (slot: TimeSlot) => {
    setEditingSlot(slot)
    setSlotStart(slot.startTime)
    setSlotEnd(slot.endTime)
    setSlotIsAvailable(slot.isAvailable)
    setSlotLabel(slot.label || '')
    setShowAddSlot(true)
  }

  const handleSaveSlot = async () => {
    if (!slotStart || !slotEnd) return

    setSaving(true)
    try {
      if (editingSlot) {
        const result = await updateTimeSlot(editingSlot.id, {
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: slotIsAvailable,
          label: slotLabel || undefined,
        })
        if (!result.success) {
          alert(result.error || 'Failed to update time slot')
          return
        }
      } else {
        const result = await createTimeSlot({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: slotIsAvailable,
          label: slotLabel || undefined,
        })
        if (!result.success) {
          alert(result.error || 'Failed to create time slot')
          return
        }
      }
      resetSlotForm()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return

    const result = await deleteTimeSlot(id)
    if (!result.success) {
      alert(result.error || 'Failed to delete time slot')
    }
  }

  const toggleFeature = (feature: string) => {
    setVenueFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    )
  }

  const handleAddCustomFeature = () => {
    if (!newFeatureName.trim()) return
    const formattedName = newFeatureName.trim().toLowerCase().replace(/\s+/g, '_')
    if (!customFeatures.includes(formattedName) && !allFeatures.includes(formattedName)) {
      setCustomFeatures(prev => [...prev, formattedName])
      setVenueFeatures(prev => [...prev, formattedName])
      setNewFeatureName('')
    }
  }

  const allAvailableFeatures = [...allFeatures, ...customFeatures]

  // Sort time slots by start time
  const sortedSlots = [...timeSlots].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0)
  const sessionSlots = timeSlots.filter(s => s.isAvailable)

  const loading = venuesLoading || timeSlotsLoading
  const error = venuesError || timeSlotsError

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
        <Button onClick={() => { refetch(); refetchTimeSlots(); }}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Venues & Time Slots</h1>
        <p className="text-muted-foreground mt-1">
          Configure the physical spaces and schedule structure for your event
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{venues.length}</div>
              <div className="text-xs text-muted-foreground">Venues</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalCapacity}</div>
              <div className="text-xs text-muted-foreground">Total Capacity</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{sessionSlots.length}</div>
              <div className="text-xs text-muted-foreground">Session Slots</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{venues.length * sessionSlots.length}</div>
              <div className="text-xs text-muted-foreground">Max Sessions</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Venues Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Venues</CardTitle>
          <Button size="sm" onClick={() => setShowAddVenue(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Venue
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {venues.map(venue => {
              return (
                <div key={venue.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{venue.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {venue.capacity} capacity
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex gap-1">
                          {venue.features.slice(0, 3).map(f => {
                            const Icon = featureIcons[f]
                            return Icon ? (
                              <div key={f} className="p-1 rounded bg-muted" title={featureLabels[f]}>
                                <Icon className="h-3 w-3 text-muted-foreground" />
                              </div>
                            ) : null
                          })}
                          {venue.features.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{venue.features.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleEditVenue(venue)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteVenue(venue.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}

            {venues.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No venues configured yet. Add your first venue to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Time Slots</CardTitle>
          <Button size="sm" onClick={() => setShowAddSlot(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Slot
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedSlots.map(slot => (
              <div
                key={slot.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  !slot.isAvailable && 'bg-muted'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono">
                    {slot.startTime} - {slot.endTime}
                  </div>
                  <Badge
                    variant={slot.isAvailable ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {slot.isAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                  {slot.label && (
                    <span className="text-sm text-muted-foreground">{slot.label}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => handleEditSlot(slot)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {sortedSlots.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No time slots configured yet. Add slots to define the schedule structure.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Venue Modal */}
      <Modal open={showAddVenue} onOpenChange={() => resetVenueForm()}>
        <ModalContent className="sm:max-w-md">
          <ModalHeader>
            <ModalTitle>{editingVenue ? 'Edit Venue' : 'Add Venue'}</ModalTitle>
            <ModalDescription>
              Configure the venue name, capacity, and available features.
            </ModalDescription>
          </ModalHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Venue Name</label>
              <Input
                placeholder="e.g., Main Hall"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Capacity</label>
              <Input
                type="number"
                placeholder="e.g., 100"
                value={venueCapacity}
                onChange={(e) => setVenueCapacity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Features</label>
              <div className="grid grid-cols-2 gap-2">
                {allAvailableFeatures.map(feature => {
                  const Icon = featureIcons[feature]
                  const isCustom = customFeatures.includes(feature)
                  const displayName = featureLabels[feature] || feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  return (
                    <label
                      key={feature}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                        venueFeatures.includes(feature) ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      )}
                    >
                      <Checkbox
                        checked={venueFeatures.includes(feature)}
                        onCheckedChange={() => toggleFeature(feature)}
                      />
                      {Icon && <Icon className="h-4 w-4" />}
                      <span className="text-sm flex-1">{displayName}</span>
                      {isCustom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
                    </label>
                  )
                })}
              </div>

              {/* Add Custom Feature */}
              <div className="pt-3 border-t">
                <label className="text-sm font-medium block mb-2">Add Custom Feature</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., Stage Lighting, Coffee Machine"
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomFeature()}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomFeature}
                    disabled={!newFeatureName.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetVenueForm} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSaveVenue} disabled={!venueName || !venueCapacity || saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {saving ? 'Saving...' : editingVenue ? 'Save Changes' : 'Add Venue'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Add/Edit Time Slot Modal */}
      <Modal open={showAddSlot} onOpenChange={() => resetSlotForm()}>
        <ModalContent className="sm:max-w-md">
          <ModalHeader>
            <ModalTitle>{editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}</ModalTitle>
            <ModalDescription>
              Configure the time slot for scheduling sessions.
            </ModalDescription>
          </ModalHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Label (optional)</label>
              <Input
                placeholder="e.g., Morning Block, Lunch Break"
                value={slotLabel}
                onChange={(e) => setSlotLabel(e.target.value)}
              />
            </div>

            <label
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                slotIsAvailable ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
              )}
            >
              <Checkbox
                checked={slotIsAvailable}
                onCheckedChange={(checked) => setSlotIsAvailable(checked === true)}
              />
              <div>
                <span className="text-sm font-medium">Available for Sessions</span>
                <p className="text-xs text-muted-foreground">
                  Uncheck for breaks, ceremonies, or other locked time slots
                </p>
              </div>
            </label>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetSlotForm} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSaveSlot} disabled={!slotStart || !slotEnd || saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {saving ? 'Saving...' : editingSlot ? 'Save Changes' : 'Add Slot'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  )
}
