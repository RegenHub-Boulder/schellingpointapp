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
  Check
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

interface Venue {
  id: string
  name: string
  capacity: number
  features: string[]
}

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

const initialVenues: Venue[] = [
  { id: '1', name: 'Main Hall', capacity: 150, features: ['projector', 'microphone', 'av_support'] },
  { id: '2', name: 'Workshop A', capacity: 40, features: ['projector', 'whiteboard', 'power_outlets'] },
  { id: '3', name: 'Workshop B', capacity: 30, features: ['projector', 'whiteboard'] },
  { id: '4', name: 'Breakout 1', capacity: 25, features: ['whiteboard'] },
]

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
  const [venues, setVenues] = React.useState(initialVenues)
  const [timeSlots, setTimeSlots] = React.useState(initialTimeSlots)
  const [editingVenue, setEditingVenue] = React.useState<Venue | null>(null)
  const [editingSlot, setEditingSlot] = React.useState<TimeSlot | null>(null)
  const [showAddVenue, setShowAddVenue] = React.useState(false)
  const [showAddSlot, setShowAddSlot] = React.useState(false)
  const [selectedDay, setSelectedDay] = React.useState(1)

  // Form state for venues
  const [venueName, setVenueName] = React.useState('')
  const [venueCapacity, setVenueCapacity] = React.useState('')
  const [venueFeatures, setVenueFeatures] = React.useState<string[]>([])

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

  const handleSaveVenue = () => {
    if (!venueName || !venueCapacity) return

    if (editingVenue) {
      setVenues(prev => prev.map(v =>
        v.id === editingVenue.id
          ? { ...v, name: venueName, capacity: parseInt(venueCapacity), features: venueFeatures }
          : v
      ))
    } else {
      setVenues(prev => [...prev, {
        id: Date.now().toString(),
        name: venueName,
        capacity: parseInt(venueCapacity),
        features: venueFeatures,
      }])
    }
    resetVenueForm()
  }

  const handleDeleteVenue = (id: string) => {
    setVenues(prev => prev.filter(v => v.id !== id))
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

  const daySlots = timeSlots.filter(s => s.day === selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0)
  const sessionSlots = timeSlots.filter(s => s.type === 'session')

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
                {allFeatures.map(feature => {
                  const Icon = featureIcons[feature]
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
                      <span className="text-sm">{featureLabels[feature]}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetVenueForm}>
                Cancel
              </Button>
              <Button onClick={handleSaveVenue} disabled={!venueName || !venueCapacity}>
                <Save className="h-4 w-4 mr-1" />
                {editingVenue ? 'Save Changes' : 'Add Venue'}
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
