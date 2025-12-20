'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Users, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout/container'
import { Footer } from '@/components/layout/footer'
import { AuthModal } from '@/components/auth/auth-modal'
import { ProfileSetup } from '@/components/auth/profile-setup'
import { OnboardingTutorial } from '@/components/auth/onboarding-tutorial'
import { getAssetPath } from '@/lib/asset-path'
import { useEvent, useSessions } from '@/hooks'

type AuthStep = 'none' | 'auth' | 'profile' | 'onboarding'

// Format date range for display
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const year = start.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

// Calculate time remaining until deadline
function getTimeRemaining(deadline: string | null): string {
  if (!deadline) return ''

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate.getTime() - now.getTime()

  if (diff <= 0) return 'Closed'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

// Format budget for display
function formatBudget(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount}`
}

export default function LandingPage() {
  const router = useRouter()
  const [openFaq, setOpenFaq] = React.useState<number | null>(null)
  const [authStep, setAuthStep] = React.useState<AuthStep>('none')

  // Fetch event data and sessions
  const { event, votingConfig, budgetConfig, loading: eventLoading } = useEvent()
  const { sessions, loading: sessionsLoading } = useSessions({ status: 'approved' })

  const handleEnterEvent = () => {
    setAuthStep('auth')
  }

  const handleAuthComplete = () => {
    // In a real app, this would be triggered after successful auth
    setAuthStep('profile')
  }

  const handleProfileComplete = () => {
    setAuthStep('onboarding')
  }

  const handleOnboardingComplete = () => {
    setAuthStep('none')
    router.push('/event/sessions')
  }

  const faqs = [
    {
      question: 'What is quadratic voting?',
      answer: 'Quadratic voting is a mechanism where each additional vote for the same item costs exponentially more credits. Your first vote costs 1 credit, but giving 2 votes costs 4 credits total (2²), 3 votes costs 9 credits (3²), and so on. This captures how strongly you feel about each session while encouraging you to spread your votes across multiple sessions.',
    },
    {
      question: 'How do I propose a session?',
      answer: 'Once you enter the event, click the "Propose Session" button. You\'ll be guided through a simple form where you can describe your session topic, format (talk, workshop, discussion, etc.), and any technical requirements.',
    },
    {
      question: 'How is the session budget distributed?',
      answer: 'During the event, participants vote on sessions they attend by tapping. After the event, the total budget pool is distributed to session hosts based on the quadratic funding formula - which rewards sessions that received broad support from many voters.',
    },
    {
      question: 'What if two sessions cover similar topics?',
      answer: 'Participants can propose merging similar sessions. If both hosts agree, the sessions combine into a collaborative format, and votes transfer to the merged session with a 10% bonus to incentivize collaboration.',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Auth Modal */}
      <AuthModal
        open={authStep === 'auth'}
        onOpenChange={(open) => {
          if (!open) setAuthStep('none')
        }}
        onComplete={handleAuthComplete}
        eventName={event?.name || 'Event'}
      />

      {/* Profile Setup Modal - For demo, auto-trigger after auth modal closes */}
      <ProfileSetup
        open={authStep === 'profile'}
        onComplete={handleProfileComplete}
        eventName={event?.name || 'Event'}
      />

      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        open={authStep === 'onboarding'}
        onComplete={handleOnboardingComplete}
      />

      {/* Header */}
      <header className="border-b">
        <Container>
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <Image
              src={getAssetPath('ethboulder_wordmark.svg')}
              alt="EthBoulder"
              width={140}
              height={24}
              className="h-5 sm:h-6 w-auto"
              priority
            />
            <Button size="sm" onClick={handleEnterEvent} data-testid="header-enter-btn">
              Enter Event
            </Button>
          </div>
        </Container>
      </header>

      {/* Hero Section */}
      <section className="py-20 sm:py-32">
        <Container size="sm">
          <div className="text-center space-y-8">
            {votingConfig?.preVoteDeadline && new Date(votingConfig.preVoteDeadline) > new Date() && (
              <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Voting Now Open
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              {event?.name || 'Loading...'}
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              {event?.description || 'A community-driven unconference where participants vote on sessions and collectively determine how the budget is distributed to speakers.'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              {event?.startDate && event?.endDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDateRange(event.startDate, event.endDate)}</span>
                </div>
              )}
              {event?.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
              {/* Participant count would go here when available in the API */}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl" className="w-full sm:w-auto" onClick={handleEnterEvent} data-testid="hero-enter-btn">
                Enter Event
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto"
                onClick={() => router.push('/event/sessions')}
                data-testid="view-sessions-btn"
              >
                View Sessions
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Two phases of quadratic voting create a complete picture of demand and delivered value.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-background rounded-xl border p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  1
                </div>
                <h3 className="font-semibold">Pre-Event Voting</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Signal which sessions you want to attend. Your votes influence the schedule
                so high-demand sessions don't conflict.
              </p>
              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-1">Example</div>
                <div className="text-sm">
                  3 votes = 9 credits spent (3²)
                </div>
              </div>
            </div>

            <div className="bg-background rounded-xl border p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  2
                </div>
                <h3 className="font-semibold">Attendance Voting</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Tap to vote during sessions. Your votes determine how the session budget
                is distributed to hosts.
              </p>
              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-1">Fresh credits</div>
                <div className="text-sm">
                  100 new credits at event start
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats */}
      <section className="py-20">
        <Container>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold">
                {sessionsLoading ? '...' : sessions.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Sessions Proposed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold">
                {eventLoading ? '...' : '---'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold">
                {eventLoading ? '...' : formatBudget(budgetConfig?.totalBudgetPool || 0)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Session Budget</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold">
                {votingConfig?.preVoteDeadline ? getTimeRemaining(votingConfig.preVoteDeadline) : 'TBD'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Until Voting Closes</div>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <Container size="sm">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border rounded-lg bg-background overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex items-center justify-between w-full px-6 py-4 text-left"
                  data-testid={`faq-${index}`}
                >
                  <span className="font-medium">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-sm text-muted-foreground animate-slide-down">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}
