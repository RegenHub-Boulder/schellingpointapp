'use client'

import * as React from 'react'
import { MapPin, Calendar, Clock, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'

interface SelfHostedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionTitle: string
  onConfirm: (details: {
    venue: string
    date: string
    time: string
    notes?: string
  }) => void
}

export function SelfHostedModal({
  open,
  onOpenChange,
  sessionTitle,
  onConfirm,
}: SelfHostedModalProps) {
  const [venue, setVenue] = React.useState('')
  const [date, setDate] = React.useState('')
  const [time, setTime] = React.useState('')
  const [notes, setNotes] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm({
      venue,
      date,
      time,
      notes: notes || undefined,
    })
    // Reset form
    setVenue('')
    setDate('')
    setTime('')
    setNotes('')
  }

  const isValid = venue.trim() && date.trim() && time.trim()

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-md">
        <ModalHeader>
          <ModalTitle>Make Self-Hosted</ModalTitle>
          <ModalDescription>
            Your session wasn't scheduled in an official venue, but you can still host it!
            Add your self-hosted session details below.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="p-3 rounded-lg bg-muted">
            <div className="font-medium text-sm">{sessionTitle}</div>
          </div>

          <div className="space-y-2">
            <label htmlFor="venue" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Venue / Location <span className="text-destructive">*</span>
            </label>
            <Input
              id="venue"
              placeholder="e.g., Coffee shop next door, Park across the street"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date <span className="text-destructive">*</span>
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="time" className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time <span className="text-destructive">*</span>
            </label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Additional notes{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="notes"
              placeholder="Any additional details attendees should know..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20"
            />
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">
              Your self-hosted session will appear in the public schedule with a "Community
              Session" badge. Attendees who favorited your session will be notified.
            </p>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid} className="flex-1">
              Confirm Self-Hosted
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  )
}
