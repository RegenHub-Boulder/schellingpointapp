'use client'

import * as React from 'react'
import { Plus, X } from 'lucide-react'
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

interface ProfileSetupProps {
  open: boolean
  onComplete: (profile: ProfileData) => void
  eventName?: string
}

interface ProfileData {
  displayName: string
  bio: string
  interests: string[]
}

const suggestedInterests = [
  'Governance',
  'DeFi',
  'DAOs',
  'NFTs',
  'Layer 2',
  'Privacy',
  'Security',
  'UX/UI',
  'Public Goods',
  'ReFi',
]

export function ProfileSetup({ open, onComplete, eventName = 'the event' }: ProfileSetupProps) {
  const [displayName, setDisplayName] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [interests, setInterests] = React.useState<string[]>([])
  const [customInterest, setCustomInterest] = React.useState('')

  const addInterest = (interest: string) => {
    if (!interests.includes(interest) && interests.length < 5) {
      setInterests([...interests, interest])
    }
  }

  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest))
  }

  const handleAddCustom = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      addInterest(customInterest.trim())
      setCustomInterest('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete({
      displayName,
      bio,
      interests,
    })
  }

  const isValid = displayName.trim().length >= 2

  return (
    <Modal open={open} onOpenChange={() => {}}>
      <ModalContent className="sm:max-w-md" showClose={false} data-testid="profile-setup-modal">
        <ModalHeader className="text-center sm:text-center">
          <ModalTitle>Welcome to {eventName}!</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">
              Display name <span className="text-destructive">*</span>
            </label>
            <Input
              id="displayName"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              data-testid="display-name-input"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Short bio{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="bio"
              placeholder="Web3 researcher @ Protocol Labs"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="h-20"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">
              Topics you're interested in
            </label>

            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {suggestedInterests
                .filter((i) => !interests.includes(i))
                .slice(0, 6)
                .map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => addInterest(interest)}
                    className="inline-flex items-center rounded-full border px-3 py-1 text-xs hover:bg-accent transition-colors"
                    disabled={interests.length >= 5}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {interest}
                  </button>
                ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add custom topic"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustom()
                  }
                }}
                className="flex-1"
                disabled={interests.length >= 5}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddCustom}
                disabled={!customInterest.trim() || interests.length >= 5}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {interests.length >= 5 && (
              <p className="text-xs text-muted-foreground">
                Maximum 5 topics reached
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!isValid} data-testid="profile-submit-btn">
            Complete Setup
          </Button>
        </form>
      </ModalContent>
    </Modal>
  )
}
