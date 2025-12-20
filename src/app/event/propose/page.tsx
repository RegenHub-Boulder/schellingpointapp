'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Mic,
  Wrench,
  MessageSquare,
  Users,
  Monitor,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SessionTrack, trackConfig, SessionFormat } from '@/types'
import { EVENT_SLUG } from '@/lib/config'
import { useAuth } from '@/hooks'

const steps = [
  { id: 1, title: 'Basic Info' },
  { id: 2, title: 'Format' },
  { id: 3, title: 'Details' },
  { id: 4, title: 'Review' },
]

const formatOptions: { value: SessionFormat; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'talk', label: 'Talk', description: 'One speaker presents', icon: Mic },
  { value: 'workshop', label: 'Workshop', description: 'Hands-on activity', icon: Wrench },
  { value: 'discussion', label: 'Discussion', description: 'Facilitated conversation', icon: MessageSquare },
  { value: 'panel', label: 'Panel', description: 'Multiple speakers', icon: Users },
  { value: 'demo', label: 'Demo', description: 'Show how something works', icon: Monitor },
]

const durationOptions = [
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
]

const trackOptions = Object.entries(trackConfig).map(([value, config]) => ({
  value: value as SessionTrack,
  label: config.label,
  color: config.color,
}))

const technicalRequirements = [
  { id: 'projector', label: 'Projector/screen' },
  { id: 'whiteboard', label: 'Whiteboard' },
  { id: 'audio', label: 'Audio system' },
  { id: 'seating', label: 'Specific seating arrangement' },
]

const suggestedTags = [
  'Governance', 'DAOs', 'DeFi', 'NFTs', 'Layer 2', 'Scaling',
  'Security', 'Privacy', 'UX', 'ReFi', 'Cryptography', 'Community',
]

export default function ProposeSessionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = React.useState(1)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Form data
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [format, setFormat] = React.useState<SessionFormat | null>(null)
  const [duration, setDuration] = React.useState<number | null>(null)
  const [track, setTrack] = React.useState<SessionTrack | null>(null)
  const [requirements, setRequirements] = React.useState<string[]>([])
  const [maxParticipants, setMaxParticipants] = React.useState('')
  const [tags, setTags] = React.useState<string[]>([])
  const [customTag, setCustomTag] = React.useState('')

  const toggleRequirement = (req: string) => {
    setRequirements((prev) =>
      prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]
    )
  }

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag])
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleAddCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim())
      setCustomTag('')
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return title.trim().length >= 5 && description.trim().length >= 50
      case 2:
        return format !== null && duration !== null && track !== null
      case 3:
        return true // Optional fields
      case 4:
        return true
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      setError('You must be signed in to propose a session')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Map technical requirements to human-readable format
      const techRequirementsMap: Record<string, string> = {
        projector: 'projector',
        whiteboard: 'whiteboard',
        audio: 'audio',
        seating: 'seating',
      }

      const response = await fetch(`/api/events/${EVENT_SLUG}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          format,
          duration,
          maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
          technicalRequirements: requirements.map(r => techRequirementsMap[r] || r),
          topicTags: tags,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit session proposal')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Session Proposed!</h1>
        <p className="text-muted-foreground mb-8">
          "{title}" has been submitted for review. You'll be notified when it's approved.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/event/my-sessions">View My Sessions</Link>
          </Button>
          <Button onClick={() => {
            setIsSubmitted(false)
            setCurrentStep(1)
            setTitle('')
            setDescription('')
            setFormat(null)
            setDuration(null)
            setTrack(null)
            setRequirements([])
            setMaxParticipants('')
            setTags([])
            setError(null)
          }}>
            Propose Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/event/sessions">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Propose a Session</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step {currentStep} of {steps.length}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                currentStep === step.id
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > step.id
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > step.id ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{step.id}</span>
              )}
              <span className="hidden sm:inline">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5',
                currentStep > step.id ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Session Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                placeholder="Building DAOs That Actually Work"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">
                Keep it clear and specific (5-80 characters)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="description"
                placeholder="We'll explore practical governance frameworks that have worked for DAOs at different scales. I'll share case studies from MakerDAO, Gitcoin, and smaller community DAOs..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-32"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                What will happen? Who should attend? (50-500 characters) •{' '}
                {description.length}/500
              </p>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Session Format <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {formatOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => setFormat(option.value)}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-colors',
                        format === option.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      )}
                    >
                      <Icon className="h-5 w-5 mb-2" />
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
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
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDuration(option.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg border transition-colors',
                      duration === option.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">
                Track <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {trackOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTrack(option.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-sm flex items-center gap-1.5 transition-colors',
                      track === option.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', option.color)} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Technical Requirements
              </label>
              <div className="space-y-2">
                {technicalRequirements.map((req) => (
                  <label
                    key={req.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={requirements.includes(req.id)}
                      onChange={() => toggleRequirement(req.id)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{req.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="maxParticipants" className="text-sm font-medium">
                Maximum Participants
              </label>
              <Input
                id="maxParticipants"
                type="number"
                placeholder="Leave blank for no limit"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Optional - defaults to venue capacity
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">
                Topic Tags ({tags.length}/5)
              </label>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {suggestedTags
                  .filter((t) => !tags.includes(t))
                  .slice(0, 8)
                  .map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      disabled={tags.length >= 5}
                      className="px-3 py-1 text-xs rounded-full border hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCustomTag()
                    }
                  }}
                  disabled={tags.length >= 5}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomTag}
                  disabled={!customTag.trim() || tags.length >= 5}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg mb-1">{title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                {format && (
                  <>
                    {React.createElement(formatOptions.find((f) => f.value === format)?.icon || Mic, {
                      className: 'h-4 w-4',
                    })}
                    <span>{formatOptions.find((f) => f.value === format)?.label}</span>
                    <span>•</span>
                  </>
                )}
                {duration && <span>{duration} min</span>}
                {track && (
                  <>
                    <span>•</span>
                    <span className={cn('w-2 h-2 rounded-full', trackConfig[track].color)} />
                    <span>{trackConfig[track].label}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {requirements.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Technical needs:{' '}
                    {requirements
                      .map((r) => technicalRequirements.find((tr) => tr.id === r)?.label)
                      .join(', ')}
                  </p>
                </div>
              )}

              {maxParticipants && (
                <p className="text-xs text-muted-foreground mt-2">
                  Max participants: {maxParticipants}
                </p>
              )}
            </div>

            <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <p className="text-sm">
                Your session will be reviewed by the event organizers before
                appearing to other participants.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-lg border bg-destructive/5 border-destructive/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {!user && (
              <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  You must be signed in to submit a session proposal.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {currentStep < 4 ? (
          <Button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
          </Button>
        )}
      </div>
    </div>
  )
}
