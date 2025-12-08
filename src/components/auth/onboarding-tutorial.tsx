'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Modal, ModalContent } from '@/components/ui/modal'
import { VoteDots } from '@/components/voting/vote-dots'
import { cn } from '@/lib/utils'

interface OnboardingTutorialProps {
  open: boolean
  onComplete: () => void
}

const slides = [
  {
    title: 'How This Unconference Works',
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>Sessions are proposed by participants like you.</p>
        <p>You vote to help decide what gets scheduled.</p>
        <p>You vote again during the event to allocate budget.</p>
      </div>
    ),
  },
  {
    title: 'Quadratic Voting',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You have 100 credits to spend. Each vote costs more:
        </p>
        <div className="space-y-2 bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span>1 vote</span>
            <span className="font-mono">1 credit</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>2 votes</span>
            <span className="font-mono">4 credits</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>3 votes</span>
            <span className="font-mono">9 credits</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>4 votes</span>
            <span className="font-mono">16 credits</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Spreading votes is efficient. Concentrating shows strong preference.
        </p>
      </div>
    ),
  },
  {
    title: 'Two Voting Phases',
    content: (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
              1
            </div>
            <span className="font-medium">Now: Pre-Event Voting</span>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            Vote on proposed sessions to influence the schedule.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
              2
            </div>
            <span className="font-medium">At Event: Tap to Vote</span>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            Vote during sessions to determine who gets paid.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Both phases use fresh 100 credits.
        </p>
      </div>
    ),
  },
  {
    title: 'Ready to Explore',
    content: (
      <div className="space-y-4 text-center">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Browse sessions and cast your votes.</p>
          <p>Propose a session if you have something to share.</p>
        </div>
        <VoteDots votes={5} maxDisplay={10} className="justify-center" size="lg" />
      </div>
    ),
  },
]

export function OnboardingTutorial({ open, onComplete }: OnboardingTutorialProps) {
  const [currentSlide, setCurrentSlide] = React.useState(0)

  const next = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  const prev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleClose = () => {
    onComplete()
    setTimeout(() => setCurrentSlide(0), 200)
  }

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-md p-0 overflow-hidden" data-testid="onboarding-modal">
        <div className="p-6 min-h-[300px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <h2 className="text-lg font-semibold mb-4 text-center">
                {slides[currentSlide].title}
              </h2>
              {slides[currentSlide].content}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="border-t bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={prev}
              disabled={currentSlide === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-1.5">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === currentSlide
                      ? 'w-4 bg-primary'
                      : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                />
              ))}
            </div>

            <Button onClick={next} className="gap-1" data-testid="onboarding-next-btn">
              {currentSlide === slides.length - 1 ? 'Enter Event' : 'Next'}
              {currentSlide < slides.length - 1 && (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}
