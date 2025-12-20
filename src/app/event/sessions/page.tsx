'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, SlidersHorizontal, Heart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreditBar } from '@/components/voting/credit-bar'
import { SessionCard } from '@/components/sessions/session-card'
import { cn } from '@/lib/utils'
import { useSessions, Session } from '@/hooks/use-sessions'
import { useVotes } from '@/hooks/use-votes'
import { useAuth } from '@/hooks'

// Transform API session to UI format
function transformSession(session: Session) {
  const primaryHost = session.hosts?.find(h => h.isPrimary) || session.hosts?.[0]
  return {
    id: session.id,
    title: session.title,
    description: session.description || '',
    format: session.format as 'talk' | 'workshop' | 'discussion' | 'panel' | 'demo',
    duration: session.duration,
    host: {
      name: primaryHost?.name || 'Unknown Host',
      avatar: primaryHost?.avatar || undefined,
    },
    tags: session.topicTags || [],
    votes: session.preVoteStats?.totalVotes || 0,
    userVotes: 0, // Will be populated from user's votes
    isFavorited: false, // Will be managed locally for now
    venue: session.venue ? {
      name: session.venue.name,
      capacity: session.venue.capacity,
      features: session.venue.features,
    } : undefined,
    scheduledTime: session.timeSlot ? new Date(session.timeSlot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
  }
}

const formats = [
  { value: 'all', label: 'All Formats' },
  { value: 'talk', label: 'Talk' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'panel', label: 'Panel' },
  { value: 'demo', label: 'Demo' },
]

const sortOptions = [
  { value: 'votes', label: 'Most Voted' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'alphabetical', label: 'A to Z' },
]

export default function SessionsPage() {
  const router = useRouter()
  const { user } = useAuth()

  // Fetch sessions with approved status (for public voting)
  const { sessions: apiSessions, loading, error, refetch: refetchSessions } = useSessions({ status: 'approved' })

  // Fetch user's votes
  const { balance, getVoteForSession, castVote } = useVotes()

  // Local state for favorites (will be persisted later)
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set())

  // Transform API sessions and add user votes
  const sessions = React.useMemo(() => {
    return apiSessions.map(session => {
      const transformed = transformSession(session)
      const userVotes = getVoteForSession(session.id)
      return {
        ...transformed,
        userVotes,
        isFavorited: favorites.has(session.id),
      }
    })
  }, [apiSessions, getVoteForSession, favorites])

  const [search, setSearch] = React.useState('')
  const [format, setFormat] = React.useState('all')
  const [sort, setSort] = React.useState('votes')
  const [showFilters, setShowFilters] = React.useState(false)

  // Use real credits from the votes hook
  const totalCredits = balance.totalCredits
  const spentCredits = balance.creditsSpent
  const remainingCredits = balance.creditsRemaining

  const handleVote = async (sessionId: string, votes: number) => {
    if (!user) {
      // Could show a sign-in prompt here
      return
    }

    const result = await castVote(sessionId, votes)
    if (!result.success) {
      // Could show an error toast here
      console.error('Failed to cast vote:', result.error)
    } else {
      // Refetch sessions to get updated vote counts
      refetchSessions()
    }
  }

  const handleToggleFavorite = (sessionId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  // Filter and sort sessions
  const filteredSessions = sessions
    .filter((s) => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (format !== 'all' && s.format !== format) {
        return false
      }
      // Track filtering removed - tracks not in current data model
      return true
    })
    .sort((a, b) => {
      if (sort === 'votes') return b.votes - a.votes
      if (sort === 'alphabetical') return a.title.localeCompare(b.title)
      return 0
    })

  const favoriteCount = sessions.filter((s) => s.isFavorited).length

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Failed to load sessions: {error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pre-Event Voting</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Help decide what gets scheduled • Closes in 2d 14h
          </p>
        </div>

        <div className="flex items-center gap-3">
          {favoriteCount > 0 && (
            <Button variant="outline" asChild>
              <Link href="/event/my-schedule">
                <Heart className="h-4 w-4 mr-2 fill-current text-red-500" />
                My Schedule ({favoriteCount})
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/event/propose">
              <Plus className="h-4 w-4 mr-2" />
              Propose Session
            </Link>
          </Button>
        </div>
      </div>

      {/* Credits Bar */}
      <div className="p-4 rounded-xl border bg-card">
        <CreditBar total={totalCredits} spent={spentCredits} />
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && 'bg-accent')}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 rounded-lg border bg-muted/30 animate-slide-down">
            {/* Format Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Format
              </label>
              <div className="flex flex-wrap gap-1.5">
                {formats.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors',
                      format === f.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border hover:bg-accent'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Sort by
              </label>
              <div className="flex gap-1.5">
                {sortOptions.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSort(s.value)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors',
                      sort === s.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border hover:bg-accent'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            remainingCredits={remainingCredits}
            onVote={handleVote}
            onToggleFavorite={handleToggleFavorite}
            onViewDetail={(id) => router.push(`/event/sessions/${id}`)}
          />
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No sessions match your filters.</p>
          <Button
            variant="link"
            onClick={() => {
              setSearch('')
              setFormat('all')
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
