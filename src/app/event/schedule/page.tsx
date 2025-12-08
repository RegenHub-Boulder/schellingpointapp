'use client'

import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  X,
  Heart,
  Calendar,
  User,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { SessionTrack, trackConfig } from '@/types'

// Mock schedule data with tracks
const venues = [
  { id: '1', name: 'Main Hall', capacity: 150 },
  { id: '2', name: 'Workshop A', capacity: 40 },
  { id: '3', name: 'Workshop B', capacity: 30 },
  { id: '4', name: 'Breakout 1', capacity: 25 },
]

const timeSlots = [
  { id: '1', start: '9:00 AM', end: '9:30 AM', type: 'locked', label: 'Opening' },
  { id: '2', start: '9:45 AM', end: '10:45 AM', type: 'session' },
  { id: '3', start: '11:00 AM', end: '12:00 PM', type: 'session' },
  { id: '4', start: '12:00 PM', end: '1:00 PM', type: 'locked', label: 'Lunch' },
  { id: '5', start: '1:00 PM', end: '2:30 PM', type: 'session' },
  { id: '6', start: '2:45 PM', end: '3:45 PM', type: 'session' },
  { id: '7', start: '4:00 PM', end: '5:00 PM', type: 'session' },
  { id: '8', start: '5:15 PM', end: '6:15 PM', type: 'locked', label: 'Closing' },
]

interface ScheduleSession {
  id: string
  title: string
  description: string
  venue: string
  slot: string
  votes: number
  host: string
  track: SessionTrack
  format: 'talk' | 'workshop' | 'discussion' | 'panel' | 'demo'
  tags: string[]
  maxParticipants?: number
  isFavorited: boolean
}

const sessions: ScheduleSession[] = [
  {
    id: '1',
    title: 'DAO Governance: From Theory to Practice',
    description: 'A deep dive into how DAOs are implementing governance mechanisms in the real world. We\'ll cover voting systems, delegation patterns, and how to balance efficiency with decentralization.',
    venue: '1',
    slot: '2',
    votes: 127,
    host: 'Alice Chen',
    track: 'governance',
    format: 'talk',
    tags: ['DAOs', 'Voting', 'Governance'],
    maxParticipants: 150,
    isFavorited: true
  },
  {
    id: '2',
    title: 'ZK Proofs Workshop: Build Your First Circuit',
    description: 'Hands-on workshop where you\'ll learn to build zero-knowledge circuits using Circom. We\'ll start with basic concepts and work up to building a simple proof of membership.',
    venue: '2',
    slot: '2',
    votes: 98,
    host: 'Bob Smith',
    track: 'technical',
    format: 'workshop',
    tags: ['ZK', 'Cryptography', 'Circom'],
    maxParticipants: 40,
    isFavorited: false
  },
  {
    id: '3',
    title: 'Community DAOs: Building Local Networks',
    description: 'How local communities are using DAO structures to organize mutual aid, local currencies, and neighborhood governance.',
    venue: '4',
    slot: '2',
    votes: 45,
    host: 'Eve Martinez',
    track: 'social',
    format: 'discussion',
    tags: ['Community', 'Local', 'Mutual Aid'],
    maxParticipants: 25,
    isFavorited: false
  },
  {
    id: '4',
    title: 'The Future of Layer 2s',
    description: 'Exploring the L2 landscape: rollups, validiums, and what\'s coming next. We\'ll discuss scalability tradeoffs and emerging solutions.',
    venue: '1',
    slot: '3',
    votes: 89,
    host: 'David Lee',
    track: 'technical',
    format: 'talk',
    tags: ['L2', 'Scaling', 'Rollups'],
    maxParticipants: 150,
    isFavorited: true
  },
  {
    id: '5',
    title: 'MEV Protection Workshop',
    description: 'Learn about MEV, how it affects users, and practical techniques to protect your transactions.',
    venue: '2',
    slot: '3',
    votes: 52,
    host: 'Frank Johnson',
    track: 'defi',
    format: 'workshop',
    tags: ['MEV', 'DeFi', 'Trading'],
    maxParticipants: 40,
    isFavorited: false
  },
  {
    id: '6',
    title: 'NFT Art and Generative Systems',
    description: 'Exploring the intersection of code and art through generative NFT systems. Live demonstrations and creative discussions.',
    venue: '4',
    slot: '3',
    votes: 12,
    host: 'Zara Kim',
    track: 'creative',
    format: 'demo',
    tags: ['NFTs', 'Art', 'Generative'],
    maxParticipants: 25,
    isFavorited: false
  },
  {
    id: '7',
    title: 'Privacy Panel: The Road to Mainstream Adoption',
    description: 'Industry leaders discuss what\'s needed for privacy-preserving technologies to achieve mainstream adoption.',
    venue: '1',
    slot: '5',
    votes: 67,
    host: 'Grace Liu',
    track: 'technical',
    format: 'panel',
    tags: ['Privacy', 'Adoption', 'ZK'],
    maxParticipants: 150,
    isFavorited: false
  },
  {
    id: '8',
    title: 'Smart Contract Security Best Practices',
    description: 'Learn from real-world exploits and how to prevent them. We\'ll cover common vulnerabilities and security patterns.',
    venue: '2',
    slot: '5',
    votes: 71,
    host: 'Henry Park',
    track: 'technical',
    format: 'workshop',
    tags: ['Security', 'Auditing', 'Solidity'],
    maxParticipants: 40,
    isFavorited: true
  },
  {
    id: '9',
    title: 'DAO Legal Structures Discussion',
    description: 'Navigating the legal landscape for DAOs: entity structures, liability, and regulatory considerations.',
    venue: '4',
    slot: '5',
    votes: 34,
    host: 'Iris Chen',
    track: 'governance',
    format: 'discussion',
    tags: ['Legal', 'Compliance', 'DAOs'],
    maxParticipants: 25,
    isFavorited: false
  },
  {
    id: '10',
    title: 'ReFi: Regenerative Finance in Action',
    description: 'How blockchain is being used to fund environmental regeneration and create new models for ecological economics.',
    venue: '1',
    slot: '6',
    votes: 84,
    host: 'Carol Williams',
    track: 'sustainability',
    format: 'talk',
    tags: ['ReFi', 'Climate', 'Impact'],
    maxParticipants: 150,
    isFavorited: false
  },
  {
    id: '11',
    title: 'Wallet UX: Designing for Everyone',
    description: 'Best practices for creating wallet experiences that work for both crypto natives and newcomers.',
    venue: '2',
    slot: '6',
    votes: 43,
    host: 'Jack Miller',
    track: 'creative',
    format: 'talk',
    tags: ['UX', 'Design', 'Wallets'],
    maxParticipants: 40,
    isFavorited: false
  },
  {
    id: '12',
    title: 'Public Goods Funding Mechanisms',
    description: 'Exploring quadratic funding, retroactive public goods funding, and other mechanisms for supporting commons.',
    venue: '1',
    slot: '7',
    votes: 56,
    host: 'Karen Davis',
    track: 'governance',
    format: 'talk',
    tags: ['Public Goods', 'Funding', 'QF'],
    maxParticipants: 150,
    isFavorited: false
  },
  {
    id: '13',
    title: 'Cross-chain Bridging Deep Dive',
    description: 'Understanding bridge architectures, security considerations, and the future of cross-chain communication.',
    venue: '2',
    slot: '7',
    votes: 38,
    host: 'Leo Wilson',
    track: 'technical',
    format: 'talk',
    tags: ['Bridges', 'Interoperability', 'Security'],
    maxParticipants: 40,
    isFavorited: false
  },
]

const formatLabels: Record<string, string> = {
  talk: 'Talk',
  workshop: 'Workshop',
  discussion: 'Discussion',
  panel: 'Panel',
  demo: 'Demo',
}

export default function SchedulePage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [trackFilter, setTrackFilter] = React.useState<string>('all')
  const [venueFilter, setVenueFilter] = React.useState<string>('all')
  const [selectedSession, setSelectedSession] = React.useState<ScheduleSession | null>(null)
  const [favorites, setFavorites] = React.useState<Set<string>>(
    new Set(sessions.filter(s => s.isFavorited).map(s => s.id))
  )
  const [currentDay, setCurrentDay] = React.useState(1)

  const toggleFavorite = (sessionId: string) => {
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

  const filteredSessions = sessions.filter(session => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = session.title.toLowerCase().includes(query)
      const matchesHost = session.host.toLowerCase().includes(query)
      const matchesTrack = trackConfig[session.track].label.toLowerCase().includes(query)
      const matchesTags = session.tags.some(tag => tag.toLowerCase().includes(query))
      const matchesVenue = venues.find(v => v.id === session.venue)?.name.toLowerCase().includes(query)

      if (!matchesTitle && !matchesHost && !matchesTrack && !matchesTags && !matchesVenue) {
        return false
      }
    }

    // Track filter
    if (trackFilter !== 'all' && session.track !== trackFilter) {
      return false
    }

    // Venue filter
    if (venueFilter !== 'all' && session.venue !== venueFilter) {
      return false
    }

    return true
  })

  const getSessionForCell = (venueId: string, slotId: string) => {
    return filteredSessions.find((s) => s.venue === venueId && s.slot === slotId)
  }

  const hasFilters = searchQuery || trackFilter !== 'all' || venueFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setTrackFilter('all')
    setVenueFilter('all')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Day {currentDay} of 2 • March {currentDay === 1 ? '15' : '16'}, 2024
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={currentDay === 1}
            onClick={() => setCurrentDay(1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">Day {currentDay}</span>
          <Button
            variant="outline"
            size="icon"
            disabled={currentDay === 2}
            onClick={() => setCurrentDay(2)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by topic, track, host, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {Object.entries(trackConfig).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={venueFilter} onValueChange={setVenueFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Venue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {venues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Track Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {Object.entries(trackConfig).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => setTrackFilter(trackFilter === key ? 'all' : key)}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded transition-colors',
              trackFilter === key ? 'bg-accent' : 'hover:bg-accent/50'
            )}
          >
            <div className={cn('h-3 w-3 rounded', color)} />
            <span className="text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* Schedule Grid - Desktop */}
      <div className="hidden sm:block border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-[100px_repeat(4,1fr)] border-b bg-muted/50">
              <div className="p-3 border-r" />
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  className={cn(
                    'p-3 border-r last:border-r-0 text-center cursor-pointer transition-colors',
                    venueFilter === venue.id ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                  onClick={() => setVenueFilter(venueFilter === venue.id ? 'all' : venue.id)}
                >
                  <div className="font-medium text-sm">{venue.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {venue.capacity} cap
                  </div>
                </div>
              ))}
            </div>

            {/* Time Slot Rows */}
            {timeSlots.map((slot) => (
              <div
                key={slot.id}
                className="grid grid-cols-[100px_repeat(4,1fr)] border-b last:border-b-0"
              >
                {/* Time Column */}
                <div className="p-3 border-r bg-muted/30">
                  <div className="text-xs font-medium">{slot.start}</div>
                  <div className="text-xs text-muted-foreground">{slot.end}</div>
                </div>

                {/* Venue Columns */}
                {slot.type === 'locked' ? (
                  <div className="col-span-4 p-3 bg-muted/20 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground font-medium">
                      {slot.label}
                    </span>
                  </div>
                ) : (
                  venues.map((venue) => {
                    const session = getSessionForCell(venue.id, slot.id)

                    return (
                      <div
                        key={venue.id}
                        className="p-2 border-r last:border-r-0 min-h-[100px]"
                      >
                        {session ? (
                          <button
                            onClick={() => setSelectedSession(session)}
                            className={cn(
                              'w-full h-full p-2 rounded-lg text-left transition-all hover:ring-2 hover:ring-primary/50 relative',
                              trackConfig[session.track].color
                            )}
                          >
                            {favorites.has(session.id) && (
                              <Heart className="absolute top-1 right-1 h-3 w-3 fill-white text-white" />
                            )}
                            <div className="text-xs font-medium text-white line-clamp-2">
                              {session.title}
                            </div>
                            <div className="text-xs text-white/80 mt-1">
                              {session.host}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">
                                {formatLabels[session.format]}
                              </Badge>
                              <span className="text-[10px] text-white/80 font-mono">
                                {session.votes} votes
                              </span>
                            </div>
                          </button>
                        ) : (
                          <div className="w-full h-full rounded-lg border-2 border-dashed border-muted" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile List View */}
      <div className="sm:hidden space-y-4">
        <h2 className="font-semibold">Today's Sessions</h2>
        {timeSlots
          .filter((slot) => slot.type === 'session')
          .map((slot) => {
            const slotSessions = filteredSessions.filter((s) => s.slot === slot.id)
            if (slotSessions.length === 0) return null

            return (
              <div key={slot.id} className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {slot.start} - {slot.end}
                  </span>
                </div>
                <div className="grid gap-2">
                  {slotSessions.map((session) => {
                    const venue = venues.find((v) => v.id === session.venue)
                    return (
                      <Card
                        key={session.id}
                        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn('w-1 self-stretch rounded-full', trackConfig[session.track].color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-sm">{session.title}</h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(session.id)
                                }}
                                className="shrink-0"
                              >
                                <Heart className={cn(
                                  'h-4 w-4',
                                  favorites.has(session.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                                )} />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {session.host}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {trackConfig[session.track].label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {formatLabels[session.format]}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {session.votes} votes
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {venue?.name}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        {filteredSessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No sessions match your filters
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      <Modal open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <ModalContent className="sm:max-w-lg">
          {selectedSession && (
            <>
              <ModalHeader>
                <div className="flex items-start gap-3">
                  <div className={cn('w-1 self-stretch rounded-full', trackConfig[selectedSession.track].color)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn('text-xs text-white border-0', trackConfig[selectedSession.track].color)}>
                        {trackConfig[selectedSession.track].label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatLabels[selectedSession.format]}
                      </Badge>
                    </div>
                    <ModalTitle className="text-lg">{selectedSession.title}</ModalTitle>
                    <ModalDescription className="mt-1">
                      by {selectedSession.host}
                    </ModalDescription>
                  </div>
                </div>
              </ModalHeader>

              <div className="space-y-4 px-6 pb-6">
                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {selectedSession.description}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {timeSlots.find(s => s.id === selectedSession.slot)?.start} - {timeSlots.find(s => s.id === selectedSession.slot)?.end}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{venues.find(v => v.id === selectedSession.venue)?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedSession.maxParticipants} max</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Day {currentDay}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {selectedSession.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Vote count */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm">
                    <span className="font-semibold">{selectedSession.votes}</span>
                    <span className="text-muted-foreground"> votes received</span>
                  </div>
                  <Button
                    variant={favorites.has(selectedSession.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFavorite(selectedSession.id)}
                    className="gap-2"
                  >
                    <Heart className={cn(
                      'h-4 w-4',
                      favorites.has(selectedSession.id) && 'fill-current'
                    )} />
                    {favorites.has(selectedSession.id) ? 'Favorited' : 'Add to My Schedule'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
