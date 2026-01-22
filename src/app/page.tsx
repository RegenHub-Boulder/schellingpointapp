'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, ArrowRight, Vote, Users, CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { AuthModal } from '@/components/auth/auth-modal'
import { ProfileSetup } from '@/components/auth/profile-setup'
import { OnboardingTutorial } from '@/components/auth/onboarding-tutorial'
import { AnimatedGradient } from '@/components/landing/animated-gradient'
import { ThemeToggle } from '@/components/landing/theme-toggle'
import { StatsRibbon } from '@/components/landing/stats-ribbon'
import { AddToCalendar } from '@/components/landing/add-to-calendar'
import { Footer } from '@/components/layout/footer'
import { getAssetPath } from '@/lib/asset-path'
import { useEvent, useSessions } from '@/hooks'

type AuthStep = 'none' | 'auth' | 'profile' | 'onboarding'

const howItWorks = [
  {
    icon: Sparkles,
    title: 'Propose Sessions',
    description: "Share your ideas for talks, workshops, or discussions you'd like to lead or see.",
  },
  {
    icon: Vote,
    title: 'Vote with Credits',
    description: 'Use quadratic voting to signal your interest. More votes = higher cost, ensuring fair distribution.',
  },
  {
    icon: CheckCircle2,
    title: 'Attend & Connect',
    description: 'Top-voted sessions get scheduled. Show up, learn, and connect with fellow builders.',
  },
]

const faqs = [
  {
    question: 'What is quadratic voting?',
    answer: 'Quadratic voting is a collective decision-making system where the cost of votes increases quadratically. Your first vote costs 1 credit, 2 votes cost 4 credits, 3 votes cost 9 credits, and so on. This prevents any single person from dominating the vote while still allowing strong preferences.',
  },
  {
    question: 'How do I get voting credits?',
    answer: 'Every registered attendee receives 100 voting credits upon check-in at the event. You can distribute these credits across any sessions you\'re interested in.',
  },
  {
    question: 'Can I propose multiple sessions?',
    answer: 'Yes! You can propose as many sessions as you\'d like. However, keep in mind that quality over quantity tends to result in more votes from the community.',
  },
  {
    question: 'When are sessions scheduled?',
    answer: 'Sessions are scheduled based on vote counts at the end of Day 1. The schedule for Day 2 and 3 will be announced that evening, with top-voted sessions getting prime time slots.',
  },
  {
    question: 'What if my session doesn\'t get scheduled?',
    answer: "Even if your session isn't officially scheduled, you're welcome to host it in one of our open spaces. Many great connections happen in these informal sessions!",
  },
]

// Format date range for display
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const startDay = start.getDate()
  const endDay = end.getDate()

  return `${startMonth} ${startDay}-${endDay}`
}

export default function LandingPage() {
  const router = useRouter()
  const [authStep, setAuthStep] = React.useState<AuthStep>('none')

  // Fetch event data and sessions
  const { event, votingConfig, budgetConfig, loading: eventLoading } = useEvent()
  const { sessions, loading: sessionsLoading } = useSessions({ status: 'approved' })

  const handleEnterEvent = () => {
    setAuthStep('auth')
  }

  const handleAuthComplete = () => {
    setAuthStep('profile')
  }

  const handleProfileComplete = () => {
    setAuthStep('onboarding')
  }

  const handleOnboardingComplete = () => {
    setAuthStep('none')
    router.push('/event/sessions')
  }

  return (
    <div className="min-h-screen bg-background gradient-radial overflow-x-hidden">
      {/* Auth Modal */}
      <AuthModal
        open={authStep === 'auth'}
        onOpenChange={(open) => {
          if (!open) setAuthStep('none')
        }}
        onComplete={handleAuthComplete}
        eventName={event?.name || 'Event'}
      />

      {/* Profile Setup Modal */}
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/20 dark:bg-black/30 backdrop-blur-xl border-b border-white/30 dark:border-white/10">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={getAssetPath('ethboulder_wordmark.svg')}
              alt="EthBoulder"
              width={140}
              height={24}
              className="h-6 w-auto"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-primary-foreground bg-primary"
            >
              Home
            </Link>
            <Link
              href="/event/sessions"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Sessions
            </Link>
            <Link
              href="/event/dashboard"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Dashboard
            </Link>
            <Link
              href="/event/propose"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Propose
            </Link>
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            <Button size="sm" className="neon-glow-sm" onClick={handleEnterEvent} data-testid="header-enter-btn">
              Enter Event
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={handleEnterEvent}
            data-testid="mobile-enter-btn"
          >
            Enter Event
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-[80vh] flex items-center">
          <AnimatedGradient />

          <div className="container relative py-16 sm:py-24 lg:py-32">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              {/* Event badge with calendar popover */}
              <AddToCalendar
                eventName={event?.name || 'EthBoulder 2026'}
                startDate={event?.startDate || '2026-02-13'}
                endDate={event?.endDate || '2026-02-15'}
                location={event?.location || 'Boulder, Colorado'}
                description={event?.description || undefined}
              />

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight">
                Shape the{' '}
                <span className="text-foreground font-normal">Unconference</span>
                {' '}Agenda
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-foreground dark:text-white font-light max-w-xl mx-auto">
                Propose sessions, vote on what matters, and help build the most relevant conversations in Web3.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  size="lg"
                  className="w-full sm:w-auto neon-glow text-base px-8"
                  onClick={handleEnterEvent}
                  data-testid="hero-enter-btn"
                >
                  Enter Event
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Link href="/event/sessions">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-base px-8 bg-white dark:bg-white text-foreground dark:text-black border-white hover:bg-white/90 dark:hover:bg-white/90"
                    data-testid="view-sessions-btn"
                  >
                    View Sessions
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <StatsRibbon
          sessionsCount={sessionsLoading ? 0 : sessions.length}
          participantsCount={156}
          creditsPool={budgetConfig?.totalBudgetPool || 15600}
          votesCast={2847}
        />

        {/* How It Works */}
        <section className="py-16 sm:py-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Three simple steps to participate in community-driven agenda setting.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              {howItWorks.map(({ icon: Icon, title, description }, index) => (
                <div key={title} className="relative glass-card rounded-2xl p-6 sm:p-8 text-center group hover:border-primary/30 transition-colors">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-primary dark:bg-primary/10 flex items-center justify-center mx-auto mt-4 mb-4 group-hover:bg-primary/90 dark:group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-7 w-7 text-primary-foreground dark:text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-24 bg-secondary/20">
          <div className="container max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground">
                Everything you need to know about the unconference.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map(({ question, answer }, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="glass-card rounded-xl px-6 border-none"
                  data-testid={`faq-${index}`}
                >
                  <AccordionTrigger className="text-left hover:no-underline py-5">
                    <span className="font-medium">{question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    {answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-16 sm:py-24">
          <div className="container">
            <div className="glass-card rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
              {/* Animated gradient for CTA */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute w-[600px] h-[400px] rounded-full blur-[80px] animate-gradient-drift"
                  style={{
                    background: 'radial-gradient(circle, hsl(78.1 100% 50% / 0.2) 0%, hsl(78.1 100% 50% / 0.08) 50%, transparent 70%)',
                    top: '-50%',
                    left: '40%',
                  }}
                />
                <div
                  className="absolute w-[400px] h-[300px] rounded-full blur-[60px] animate-gradient-drift-reverse"
                  style={{
                    background: 'radial-gradient(circle, hsl(170 80% 50% / 0.15) 0%, transparent 60%)',
                    bottom: '-30%',
                    right: '15%',
                  }}
                />
                <div
                  className="absolute w-[350px] h-[350px] rounded-full blur-[70px] animate-gradient-flow"
                  style={{
                    background: 'radial-gradient(circle, hsl(50 100% 55% / 0.12) 0%, transparent 60%)',
                    top: '20%',
                    left: '10%',
                  }}
                />
              </div>
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">
                  Ready to Shape the Agenda?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                  Join 150+ builders already proposing and voting on sessions for {event?.name || 'EthBoulder 2026'}.
                </p>
                <Button size="lg" className="neon-glow px-8" onClick={handleEnterEvent}>
                  <Users className="mr-2 h-5 w-5" />
                  Join Now
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer className="pb-24 md:pb-8" />
      <ThemeToggle />
    </div>
  )
}
