'use client'

import * as React from 'react'
import { Mic, Wrench, MessageSquare, Users, Monitor, Plus, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'
import { cn } from '@/lib/utils'

interface SessionProposalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProposalData) => void
}

interface ProposalData {
  title: string
  description: string
  format: 'talk' | 'workshop' | 'discussion' | 'panel' | 'demo'
  duration: number
  technicalRequirements: string[]
  maxParticipants?: number
  tags: string[]
}

const formats = [
  { value: 'talk', label: 'Talk', description: 'One speaker presents', icon: Mic },
  { value: 'workshop', label: 'Workshop', description: 'Hands-on activity', icon: Wrench },
  { value: 'discussion', label: 'Discussion', description: 'Facilitated conversation', icon: MessageSquare },
  { value: 'panel', label: 'Panel', description: 'Multiple speakers', icon: Users },
  { value: 'demo', label: 'Demo', description: 'Show how something works', icon: Monitor },
] as const

const techOptions = [
  'Projector/screen',
  'Whiteboard',
  'Audio system',
  'Specific seating arrangement',
]

const suggestedTags = [
  'Governance',
  'DeFi',
  'DAOs',
  'NFTs',
  'Layer 2',
  'Privacy',
  'Security',
  'ReFi',
  'Technical',
  'Beginner-friendly',
]

export function SessionProposalForm({ open, onOpenChange, onSubmit }: SessionProposalFormProps) {
  const [step, setStep] = React.useState(1)
  const [data, setData] = React.useState<Partial<ProposalData>>({
    technicalRequirements: [],
    tags: [],
  })

  const totalSteps = 4

  const updateData = (updates: Partial<ProposalData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.title && data.title.length >= 5 && data.description && data.description.length >= 50
      case 2:
        return data.format && data.duration
      case 3:
        return true
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      onSubmit(data as ProposalData)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep(1)
      setData({ technicalRequirements: [], tags: [] })
    }, 200)
  }

  const toggleTag = (tag: string) => {
    const tags = data.tags || []
    if (tags.includes(tag)) {
      updateData({ tags: tags.filter((t) => t !== tag) })
    } else if (tags.length < 5) {
      updateData({ tags: [...tags, tag] })
    }
  }

  const toggleTechReq = (req: string) => {
    const reqs = data.technicalRequirements || []
    if (reqs.includes(req)) {
      updateData({ technicalRequirements: reqs.filter((r) => r !== req) })
    } else {
      updateData({ technicalRequirements: [...reqs, req] })
    }
  }

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-lg">
        <ModalHeader>
          <div className="flex items-center justify-between">
            <ModalTitle>Propose a Session</ModalTitle>
            <span className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
          </div>
        </ModalHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Session Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Building DAOs That Actually Work"
                  value={data.title || ''}
                  onChange={(e) => updateData({ title: e.target.value })}
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground">
                  Keep it clear and specific (5-80 characters)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="What will happen in this session? Who should attend? What will they learn?"
                  value={data.description || ''}
                  onChange={(e) => updateData({ description: e.target.value })}
                  className="min-h-[120px]"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {(data.description?.length || 0)}/500 characters (min 50)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Format */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Session Format <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {formats.map((format) => {
                    const Icon = format.icon
                    const isSelected = data.format === format.value
                    return (
                      <button
                        key={format.value}
                        onClick={() => updateData({ format: format.value })}
                        className={cn(
                          'flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-muted-foreground/50'
                        )}
                      >
                        <Icon className={cn('h-5 w-5 mb-2', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="font-medium">{format.label}</span>
                        <span className="text-xs text-muted-foreground">{format.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Duration <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-3">
                  {[30, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => updateData({ duration: mins })}
                      className={cn(
                        'flex-1 py-3 rounded-lg border-2 font-medium transition-all',
                        data.duration === mins
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-muted hover:border-muted-foreground/50'
                      )}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Technical Requirements{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="space-y-2">
                  {techOptions.map((req) => {
                    const isSelected = data.technicalRequirements?.includes(req)
                    return (
                      <button
                        key={req}
                        onClick={() => toggleTechReq(req)}
                        className={cn(
                          'flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-colors',
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                        )}
                      >
                        <div
                          className={cn(
                            'h-5 w-5 rounded border-2 flex items-center justify-center',
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="text-sm">{req}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Maximum Participants{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  type="number"
                  placeholder="Leave blank for no limit"
                  value={data.maxParticipants || ''}
                  onChange={(e) => updateData({ maxParticipants: parseInt(e.target.value) || undefined })}
                  min={1}
                />
              </div>
            </div>
          )}

          {/* Step 4: Tags & Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Topic Tags</label>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => {
                    const isSelected = data.tags?.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted-foreground/20'
                        )}
                        disabled={!isSelected && (data.tags?.length || 0) >= 5}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select up to 5 tags
                </p>
              </div>

              {/* Preview */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Preview</div>
                <h3 className="font-semibold">{data.title || 'Session Title'}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {data.format && (
                    <>
                      <span>{formats.find((f) => f.value === data.format)?.label}</span>
                      <span>•</span>
                    </>
                  )}
                  {data.duration && <span>{data.duration} min</span>}
                  {data.maxParticipants && (
                    <>
                      <span>•</span>
                      <span>Max {data.maxParticipants} people</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {data.description || 'Session description...'}
                </p>
                {data.tags && data.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {data.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Your session will be reviewed by organizers before appearing to other participants.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button onClick={handleNext} disabled={!canProceed()}>
              {step === totalSteps ? (
                'Submit Proposal'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}
