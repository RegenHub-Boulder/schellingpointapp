'use client'

import * as React from 'react'
import { Plus, ArrowDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'
import { cn } from '@/lib/utils'

interface MergerProposalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  yourSession: {
    id: string
    title: string
    format: string
    duration: number
  }
  theirSession: {
    id: string
    title: string
    format: string
    duration: number
    host: string
  }
  onSubmit: (data: MergerData) => void
}

interface MergerData {
  proposedTitle: string
  mergerType: string
  duration: number
  message: string
}

const mergerTypes = [
  { value: 'co-presentation', label: 'Co-presentation', description: 'Split time equally' },
  { value: 'panel', label: 'Panel discussion', description: 'Moderated multi-voice' },
  { value: 'workshop-progression', label: 'Workshop progression', description: 'Sequential activities' },
  { value: 'dialogue', label: 'Structured dialogue', description: 'Back-and-forth' },
]

export function MergerProposalModal({
  open,
  onOpenChange,
  yourSession,
  theirSession,
  onSubmit,
}: MergerProposalModalProps) {
  const [title, setTitle] = React.useState('')
  const [mergerType, setMergerType] = React.useState('')
  const [duration, setDuration] = React.useState(90)
  const [message, setMessage] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      proposedTitle: title,
      mergerType,
      duration,
      message,
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setTitle('')
      setMergerType('')
      setDuration(90)
      setMessage('')
    }, 200)
  }

  const isValid = title.trim().length >= 5 && mergerType && message.trim().length >= 20

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-lg">
        <ModalHeader>
          <ModalTitle>Propose Merger</ModalTitle>
          <ModalDescription>
            Combine your session with another for a richer experience
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sessions Being Merged */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Combining
            </div>

            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">Your Session</div>
              <div className="font-medium text-sm">{yourSession.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {yourSession.format} • {yourSession.duration} min
              </div>
            </Card>

            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </div>
            </div>

            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">Their Session</div>
              <div className="font-medium text-sm">{theirSession.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {theirSession.host} • {theirSession.format} • {theirSession.duration} min
              </div>
            </Card>

            <div className="flex justify-center">
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Merged Session Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Proposed Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="DAO Governance: Patterns & Practices"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Merger Type <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {mergerTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setMergerType(type.value)}
                    className={cn(
                      'flex flex-col items-start p-3 rounded-lg border text-left transition-all',
                      mergerType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                          mergerType === type.value
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/50'
                        )}
                      >
                        {mergerType === type.value && (
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 ml-6">
                      {type.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <div className="flex gap-2">
                {[60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg border font-medium transition-all',
                      duration === mins
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'hover:border-muted-foreground/50'
                    )}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Why merge? <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Our sessions cover similar ground and I think our different perspectives would create a richer experience together..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                This message will be visible to the other host
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!isValid}>
              Send Proposal
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  )
}
