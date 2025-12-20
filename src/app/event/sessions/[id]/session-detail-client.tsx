'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
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
  Loader2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VoteCounter } from '@/components/voting/vote-counter'
import { useSession } from '@/hooks/use-session'
import { useVotes } from '@/hooks/use-votes'
import { useAuth } from '@/hooks'

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

export function SessionDetailClient() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const { user } = useAuth()

  // Fetch session data from API
  const { session, hosts, votes: voteStats, loading, error } = useSession(sessionId)

  // Voting
  const { balance, getVoteForSession, castVote } = useVotes()
  const userVotes = getVoteForSession(sessionId)

  const [isFavorited, setIsFavorited] = React.useState(false)

  const handleVote = async (newVotes: number) => {
    if (!user) {
      // Could show a sign-in prompt
      return
    }
    await castVote(sessionId, newVotes)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error || !session) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Button>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error || 'Session not found'}</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    )
  }

  const FormatIcon = formatIcons[session.format] || Mic
  const primaryHost = hosts?.find(h => h.isPrimary) || hosts?.[0]
  const remainingCredits = balance.creditsRemaining
  const totalVotes = voteStats?.preVote?.totalVotes || 0
  const totalCreditsSpent = voteStats?.preVote?.totalCreditsSpent || 0

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
                  <span className="capitalize">{session.format}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{session.duration} min</span>
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
            {session.topicTags && session.topicTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {session.topicTags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Venue & Schedule */}
          {(session.venue || session.timeSlot) && (
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="grid sm:grid-cols-2 gap-4">
                {session.venue && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Location</h3>
                    </div>
                    <p className="text-lg font-medium">{session.venue.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Capacity: {session.venue.capacity} people
                    </p>
                    {session.venue.features && session.venue.features.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {session.venue.features.map((feature: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {session.timeSlot && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Schedule</h3>
                    </div>
                    <p className="text-lg font-medium">
                      {new Date(session.timeSlot.start_time).toLocaleDateString([], {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })} at {new Date(session.timeSlot.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Duration: {session.duration} minutes
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Full Description */}
          {session.description && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">About This Session</h2>
              <div className="prose prose-sm max-w-none">
                {session.description.split('\n').map((paragraph: string, i: number) => (
                  <p key={i} className="text-muted-foreground mb-3">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Card>
          )}

          {/* Technical Requirements */}
          {session.technicalRequirements && session.technicalRequirements.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Technical Requirements</h2>
              <ul className="space-y-2">
                {session.technicalRequirements.map((req: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary mt-1">•</span>
                    <span className="capitalize">{req.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Host Info */}
          {primaryHost && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Session Host</h3>
              <div className="flex items-start gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {primaryHost.avatar ? (
                    <img
                      src={primaryHost.avatar}
                      alt={primaryHost.name || 'Host'}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{primaryHost.name || 'Anonymous Host'}</div>
                </div>
              </div>
              {primaryHost.bio && (
                <p className="text-sm text-muted-foreground">{primaryHost.bio}</p>
              )}
            </Card>
          )}

          {/* Voting */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Cast Your Votes</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total votes</span>
                <div className="flex items-center gap-1">
                  <Vote className="h-4 w-4" />
                  <span className="font-medium">{totalVotes}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Credits allocated</span>
                <span className="font-medium">{totalCreditsSpent}</span>
              </div>
              <div className="pt-4 border-t">
                <VoteCounter
                  votes={userVotes}
                  onVote={handleVote}
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
