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

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  type: 'session' | 'break' | 'locked'
  label?: string
  day: number
}

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

// Time slots are still managed locally for now (TODO: create time_slots API)
const initialTimeSlots: TimeSlot[] = [
  { id: '1', startTime: '09:00', endTime: '09:30', type: 'locked', label: 'Opening Ceremony', day: 1 },
  { id: '2', startTime: '09:45', endTime: '10:45', type: 'session', day: 1 },
  { id: '3', startTime: '11:00', endTime: '12:00', type: 'session', day: 1 },
  { id: '4', startTime: '12:00', endTime: '13:00', type: 'break', label: 'Lunch', day: 1 },
  { id: '5', startTime: '13:00', endTime: '14:30', type: 'session', day: 1 },
  { id: '6', startTime: '14:45', endTime: '15:45', type: 'session', day: 1 },
  { id: '7', startTime: '16:00', endTime: '17:00', type: 'session', day: 1 },
  { id: '8', startTime: '17:15', endTime: '18:15', type: 'locked', label: 'Closing Remarks', day: 1 },
  { id: '9', startTime: '09:00', endTime: '09:30', type: 'locked', label: 'Day 2 Kickoff', day: 2 },
  { id: '10', startTime: '09:45', endTime: '10:45', type: 'session', day: 2 },
  { id: '11', startTime: '11:00', endTime: '12:00', type: 'session', day: 2 },
  { id: '12', startTime: '12:00', endTime: '13:00', type: 'break', label: 'Lunch', day: 2 },
  { id: '13', startTime: '13:00', endTime: '14:30', type: 'session', day: 2 },
  { id: '14', startTime: '14:45', endTime: '16:00', type: 'locked', label: 'Final Session & Awards', day: 2 },
]

export default function AdminVenuesPage() {
  // Use the venues hook for API integration
  const { venues, loading, error, createVenue, updateVenue, deleteVenue, refetch } = useVenues()

  const [timeSlots, setTimeSlots] = React.useState(initialTimeSlots)
  const [editingVenue, setEditingVenue] = React.useState<Venue | null>(null)
  const [editingSlot, setEditingSlot] = React.useState<TimeSlot | null>(null)
  const [showAddVenue, setShowAddVenue] = React.useState(false)
  const [showAddSlot, setShowAddSlot] = React.useState(false)
  const [selectedDay, setSelectedDay] = React.useState(1)
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
  const [slotType, setSlotType] = React.useState<'session' | 'break' | 'locked'>('session')
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
    setSlotType('session')
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
    setSlotType(slot.type)
    setSlotLabel(slot.label || '')
    setShowAddSlot(true)
  }

  const handleSaveSlot = () => {
    if (!slotStart || !slotEnd) return

    if (editingSlot) {
      setTimeSlots(prev => prev.map(s =>
        s.id === editingSlot.id
          ? { ...s, startTime: slotStart, endTime: slotEnd, type: slotType, label: slotLabel || undefined }
          : s
      ))
    } else {
      setTimeSlots(prev => [...prev, {
        id: Date.now().toString(),
        startTime: slotStart,
        endTime: slotEnd,
        type: slotType,
        label: slotLabel || undefined,
        day: selectedDay,
      }])
    }
    resetSlotForm()
  }

  const handleDeleteSlot = (id: string) => {
    setTimeSlots(prev => prev.filter(s => s.id !== id))
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

  const daySlots = timeSlots.filter(s => s.day === selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0)
  const sessionSlots = timeSlots.filter(s => s.type === 'session')

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
        <p className="text-destructive mb-4">Failed to load venues: {error}</p>
        <Button onClick={() => refetch()}>Try again</Button>
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
          <div className="flex items-center gap-4">
            <CardTitle className="text-base">Time Slots</CardTitle>
            <div className="flex gap-1">
              {[1, 2].map(day => (
                <Button
                  key={day}
                  variant={selectedDay === day ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(day)}
                >
                  Day {day}
                </Button>
              ))}
            </div>
          </div>
          <Button size="sm" onClick={() => setShowAddSlot(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Slot
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {daySlots.map(slot => (
              <div
                key={slot.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  slot.type === 'break' && 'bg-amber-50 border-amber-200',
                  slot.type === 'locked' && 'bg-muted'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono">
                    {slot.startTime} - {slot.endTime}
                  </div>
                  <Badge
                    variant={
                      slot.type === 'session' ? 'default' :
                      slot.type === 'break' ? 'secondary' : 'outline'
                    }
                    className="text-xs"
                  >
                    {slot.type === 'session' ? 'Session' :
                     slot.type === 'break' ? 'Break' : 'Locked'}
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

            {daySlots.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No time slots for Day {selectedDay}. Add slots to define the schedule structure.
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
              Configure the time slot for Day {selectedDay}.
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
              <label className="text-sm font-medium">Slot Type</label>
              <Select value={slotType} onValueChange={(v) => setSlotType(v as typeof slotType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">Session (available for scheduling)</SelectItem>
                  <SelectItem value="break">Break (lunch, coffee, etc.)</SelectItem>
                  <SelectItem value="locked">Locked (opening/closing ceremonies)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(slotType === 'break' || slotType === 'locked') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Input
                  placeholder="e.g., Lunch Break"
                  value={slotLabel}
                  onChange={(e) => setSlotLabel(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetSlotForm}>
                Cancel
              </Button>
              <Button onClick={handleSaveSlot} disabled={!slotStart || !slotEnd}>
                <Save className="h-4 w-4 mr-1" />
                {editingSlot ? 'Save Changes' : 'Add Slot'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  )
}
