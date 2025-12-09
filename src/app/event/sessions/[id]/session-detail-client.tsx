'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Vote,
  Heart,
  Share2,
  Calendar,
  Mic,
  Wrench,
  MessageSquare,
  Monitor,
  User,
  ExternalLink,
  GitMerge,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VoteCounter } from '@/components/voting/vote-counter'

export function SessionDetailClient() {
  const router = useRouter()
  const [isFavorited, setIsFavorited] = React.useState(false)
  const [userVotes, setUserVotes] = React.useState(3)

  // Mock data - in real app, this would come from API based on session ID
  const session = {
    id: '1',
    title: 'Decentralized Identity Solutions',
    description:
      'Deep dive into self-sovereign identity systems and their implementation using DIDs and verifiable credentials. We\'ll explore current standards like did:web, did:key, and did:ion, along with practical implementations in wallets and applications.',
    longDescription: `In this comprehensive workshop, we'll explore the fundamentals of decentralized identity and how it's reshaping digital authentication and authorization.

We'll start with the basics of DIDs (Decentralized Identifiers) and VCs (Verifiable Credentials), then move into practical implementations. You'll learn:

• How DIDs work across different methods and networks
• Creating and managing verifiable credentials
• Integration patterns with existing applications
• Privacy considerations and selective disclosure
• Real-world use cases and adoption challenges

Participants will get hands-on experience creating their own DIDs and issuing verifiable credentials. We'll also discuss the broader ecosystem including wallets, issuers, and verifiers.

This session is ideal for developers, product managers, and anyone interested in building identity solutions for Web3 and beyond.`,
    format: 'Workshop',
    duration: 90,
    host: {
      name: 'Alice Chen',
      avatar: '',
      bio: 'Product designer passionate about decentralized governance and community-driven decision making.',
      role: 'Product Designer @ Consensus Labs',
      socials: {
        twitter: '@alicechen',
        github: 'alicechen',
      },
    },
    tags: ['Identity', 'Privacy', 'Web3', 'Standards'],
    track: 'Technical',
    votes: 89,
    credits: 1247,
    venue: {
      name: 'Main Hall',
      capacity: 100,
      features: ['Projector', 'Whiteboard', 'Sound System', 'Recording Equipment'],
    },
    scheduledTime: 'March 15, 2024 at 10:00 AM',
    requirements: [
      'Laptop with Node.js installed',
      'Basic understanding of public-key cryptography',
      'Familiarity with JSON and web APIs',
    ],
    agenda: [
      { time: '10:00', topic: 'Introduction to DIDs and VCs', duration: 15 },
      { time: '10:15', topic: 'DID Methods Overview', duration: 20 },
      { time: '10:35', topic: 'Hands-on: Creating Your First DID', duration: 25 },
      { time: '11:00', topic: 'Break', duration: 10 },
      { time: '11:10', topic: 'Verifiable Credentials Deep Dive', duration: 20 },
      { time: '11:30', topic: 'Building an Identity Wallet', duration: 20 },
      { time: '11:50', topic: 'Q&A and Wrap-up', duration: 10 },
    ],
    relatedSessions: [
      {
        id: '15',
        title: 'Privacy-Preserving Authentication',
        similarityScore: 78,
      },
      {
        id: '22',
        title: 'Web3 Wallet Security',
        similarityScore: 65,
      },
    ],
  }

  const formatIcons = {
    Talk: Mic,
    Workshop: Wrench,
    Discussion: MessageSquare,
    Panel: Users,
    Demo: Monitor,
  }

  const FormatIcon = formatIcons[session.format as keyof typeof formatIcons]

  const totalCredits = 100
  const spentCredits = 18
  const remainingCredits = totalCredits - spentCredits

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <FormatIcon className="h-4 w-4" />
                  <span>{session.format}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{session.duration} min</span>
                  <span className="text-muted-foreground/50">•</span>
                  <Badge variant="secondary">{session.track}</Badge>
                </div>

                <h1 className="text-3xl font-bold mb-4">{session.title}</h1>

                <p className="text-lg text-muted-foreground">
                  {session.description}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={isFavorited ? 'text-red-500' : ''}
                >
                  <Heart className={isFavorited ? 'fill-current' : ''} />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {session.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Venue & Schedule */}
          {session.venue && (
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Location</h3>
                  </div>
                  <p className="text-lg font-medium">{session.venue.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Capacity: {session.venue.capacity} people
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {session.venue.features.map((feature, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Schedule</h3>
                  </div>
                  <p className="text-lg font-medium">{session.scheduledTime}</p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {session.duration} minutes
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Full Description */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">About This Session</h2>
            <div className="prose prose-sm max-w-none">
              {session.longDescription.split('\n').map((paragraph, i) => (
                <p key={i} className="text-muted-foreground mb-3">
                  {paragraph}
                </p>
              ))}
            </div>
          </Card>

          {/* Requirements */}
          {session.requirements && session.requirements.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">What to Bring</h2>
              <ul className="space-y-2">
                {session.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary mt-1">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Agenda */}
          {session.agenda && session.agenda.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Agenda</h2>
              <div className="space-y-3">
                {session.agenda.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="text-sm font-medium text-muted-foreground w-16">
                      {item.time}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.topic}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.duration} minutes
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Related Sessions */}
          {session.relatedSessions && session.relatedSessions.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <GitMerge className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Related Sessions</h2>
              </div>
              <div className="space-y-2">
                {session.relatedSessions.map((related) => (
                  <div
                    key={related.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{related.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {related.similarityScore}% similar topics
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Host Info */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Session Host</h3>
            <div className="flex items-start gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {session.host.avatar ? (
                  <img
                    src={session.host.avatar}
                    alt={session.host.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{session.host.name}</div>
                <div className="text-xs text-muted-foreground">{session.host.role}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{session.host.bio}</p>
            <div className="flex gap-2">
              {session.host.socials.twitter && (
                <Button variant="outline" size="sm" className="flex-1">
                  Twitter
                </Button>
              )}
              {session.host.socials.github && (
                <Button variant="outline" size="sm" className="flex-1">
                  GitHub
                </Button>
              )}
            </div>
          </Card>

          {/* Voting */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Cast Your Votes</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total votes</span>
                <div className="flex items-center gap-1">
                  <Vote className="h-4 w-4" />
                  <span className="font-medium">{session.votes}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Credits allocated</span>
                <span className="font-medium">{session.credits}</span>
              </div>
              <div className="pt-4 border-t">
                <VoteCounter
                  votes={userVotes}
                  onVote={setUserVotes}
                  remainingCredits={remainingCredits}
                />
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button className="w-full" variant="outline">
                <Heart className="h-4 w-4 mr-2" />
                Add to My Schedule
              </Button>
              <Button className="w-full" variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share Session
              </Button>
              <Button className="w-full" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
