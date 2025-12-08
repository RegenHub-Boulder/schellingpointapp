'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, SlidersHorizontal, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreditBar } from '@/components/voting/credit-bar'
import { SessionCard } from '@/components/sessions/session-card'
import { cn } from '@/lib/utils'
import { SessionTrack } from '@/types'

// Mock data with tracks
const mockSessions = [
  {
    id: '1',
    title: 'Building DAOs That Actually Work',
    description: 'We\'ll explore practical governance frameworks that have worked for DAOs at different scales. I\'ll share case studies from MakerDAO, Gitcoin, and smaller community DAOs.',
    format: 'talk' as const,
    duration: 60,
    host: { name: 'Alice Chen' },
    tags: ['Governance', 'DAOs'],
    track: 'governance' as SessionTrack,
    votes: 127,
    userVotes: 3,
    isFavorited: true,
  },
  {
    id: '2',
    title: 'Zero-Knowledge Proofs Workshop',
    description: 'Hands-on workshop building your first ZK circuit. We\'ll cover the basics of ZK proofs and build a simple proof of concept together.',
    format: 'workshop' as const,
    duration: 90,
    host: { name: 'Bob Smith' },
    tags: ['Cryptography', 'Technical'],
    track: 'technical' as SessionTrack,
    votes: 98,
    userVotes: 1,
    isFavorited: false,
  },
  {
    id: '3',
    title: 'The Future of Regenerative Finance',
    description: 'A facilitated discussion on how ReFi can scale beyond carbon credits to address broader environmental and social challenges.',
    format: 'discussion' as const,
    duration: 60,
    host: { name: 'Carol Williams' },
    tags: ['ReFi', 'Sustainability'],
    track: 'sustainability' as SessionTrack,
    votes: 84,
    userVotes: 2,
    isFavorited: true,
  },
  {
    id: '4',
    title: 'MEV Deep Dive',
    description: 'Understanding Maximal Extractable Value, its impact on users, and the latest solutions being developed to mitigate its effects.',
    format: 'talk' as const,
    duration: 60,
    host: { name: 'David Lee' },
    tags: ['DeFi', 'Security'],
    track: 'defi' as SessionTrack,
    votes: 76,
    userVotes: 0,
    isFavorited: false,
  },
  {
    id: '5',
    title: 'Layer 2 Scaling Solutions Panel',
    description: 'Representatives from various L2 solutions discuss trade-offs, roadmaps, and the future of Ethereum scaling.',
    format: 'panel' as const,
    duration: 90,
    host: { name: 'Eve Martinez' },
    tags: ['Layer 2', 'Scaling'],
    track: 'technical' as SessionTrack,
    votes: 89,
    userVotes: 0,
    isFavorited: false,
  },
  {
    id: '6',
    title: 'Smart Contract Security Demo',
    description: 'Live demonstration of common smart contract vulnerabilities and how to audit for them.',
    format: 'demo' as const,
    duration: 60,
    host: { name: 'Frank Johnson' },
    tags: ['Security', 'Technical'],
    track: 'technical' as SessionTrack,
    votes: 52,
    userVotes: 0,
    isFavorited: false,
  },
  {
    id: '7',
    title: 'NFT Art Showcase & Discussion',
    description: 'Explore the intersection of art and blockchain. Featured artists will present their work and discuss the creative process.',
    format: 'discussion' as const,
    duration: 60,
    host: { name: 'Grace Liu' },
    tags: ['NFTs', 'Art'],
    track: 'creative' as SessionTrack,
    votes: 45,
    userVotes: 0,
    isFavorited: false,
  },
  {
    id: '8',
    title: 'Community Building in Web3',
    description: 'How to build and nurture thriving communities around your protocol or DAO.',
    format: 'workshop' as const,
    duration: 90,
    host: { name: 'Henry Park' },
    tags: ['Community', 'Growth'],
    track: 'social' as SessionTrack,
    votes: 67,
    userVotes: 0,
    isFavorited: false,
  },
]

const formats = [
  { value: 'all', label: 'All Formats' },
  { value: 'talk', label: 'Talk' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'panel', label: 'Panel' },
  { value: 'demo', label: 'Demo' },
]

const tracks = [
  { value: 'all', label: 'All Tracks' },
  { value: 'governance', label: 'Governance', color: 'bg-blue-500' },
  { value: 'technical', label: 'Technical', color: 'bg-purple-500' },
  { value: 'defi', label: 'DeFi', color: 'bg-green-500' },
  { value: 'social', label: 'Social', color: 'bg-orange-500' },
  { value: 'creative', label: 'Creative', color: 'bg-pink-500' },
  { value: 'sustainability', label: 'Sustainability', color: 'bg-emerald-500' },
]

const sortOptions = [
  { value: 'votes', label: 'Most Voted' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'alphabetical', label: 'A to Z' },
]

export default function SessionsPage() {
  const [sessions, setSessions] = React.useState(mockSessions)
  const [search, setSearch] = React.useState('')
  const [format, setFormat] = React.useState('all')
  const [track, setTrack] = React.useState('all')
  const [sort, setSort] = React.useState('votes')
  const [showFilters, setShowFilters] = React.useState(false)

  // Mock user credits
  const totalCredits = 100
  const spentCredits = sessions.reduce((sum, s) => sum + (s.userVotes * s.userVotes), 0)
  const remainingCredits = totalCredits - spentCredits

  const handleVote = (sessionId: string, votes: number) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, userVotes: votes } : s))
    )
  }

  const handleToggleFavorite = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, isFavorited: !s.isFavorited } : s
      )
    )
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
      if (track !== 'all' && s.track !== track) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      if (sort === 'votes') return b.votes - a.votes
      if (sort === 'alphabetical') return a.title.localeCompare(b.title)
      return 0
    })

  const favoriteCount = sessions.filter((s) => s.isFavorited).length

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
            {/* Track Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Track
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tracks.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTrack(t.value)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5',
                      track === t.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border hover:bg-accent'
                    )}
                  >
                    {t.color && (
                      <span className={cn('w-2 h-2 rounded-full', t.color)} />
                    )}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

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
            onViewDetail={(id) => console.log('View', id)}
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
              setTrack('all')
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
