// Event Types
export type EventStatus =
  | 'draft'
  | 'proposals_open'
  | 'voting_open'
  | 'scheduled'
  | 'live'
  | 'concluded'
  | 'distributed'

export type AccessType = 'nft' | 'email' | 'open'

export interface Event {
  id: string
  name: string
  slug: string
  description?: string
  startDate: Date
  endDate: Date
  timezone: string
  accessType: AccessType
  nftContractAddress?: string
  nftChainId?: number
  preVoteCredits: number
  attendanceVoteCredits: number
  preVoteDeadline?: Date
  sessionBudgetAmount?: number
  sessionBudgetToken?: string
  treasuryContractAddress?: string
  status: EventStatus
  burnerCardsEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

// Session Types
export type SessionFormat = 'talk' | 'workshop' | 'discussion' | 'panel' | 'demo'
export type SessionStatus = 'proposed' | 'approved' | 'declined' | 'merged' | 'scheduled' | 'completed'

// Track type for categorizing sessions
export type SessionTrack =
  | 'governance'
  | 'technical'
  | 'defi'
  | 'social'
  | 'creative'
  | 'sustainability'

export interface Session {
  id: string
  eventId: string
  title: string
  description: string
  format: SessionFormat
  durationMinutes: number
  technicalRequirements: string[]
  maxParticipants?: number
  tags: string[]
  track: SessionTrack
  status: SessionStatus
  mergedIntoId?: string
  mergedFromIds?: string[]
  venueId?: string
  timeSlotId?: string
  createdAt: Date
  updatedAt: Date
}

export interface SessionHost {
  id: string
  sessionId: string
  userId: string
  role: 'host' | 'co-host'
  payoutPercentage: number
  payoutWallet?: string
}

// User Types
export interface User {
  id: string
  privyId: string
  email?: string
  walletAddress?: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

// Voting Types
export interface PreVote {
  id: string
  eventId: string
  sessionId: string
  userId: string
  voteCount: number
  creditsSpent: number
  createdAt: Date
  updatedAt: Date
}

export interface AttendanceVote {
  id: string
  eventId: string
  sessionId: string
  userId: string
  voteCount: number
  creditsSpent: number
  voteMethod: 'app' | 'burner_card' | 'manual'
  burnerCardId?: string
  createdAt: Date
  updatedAt: Date
}

// Scheduling Types
export interface Venue {
  id: string
  eventId: string
  name: string
  capacity: number
  features: string[]
  createdAt: Date
}

export interface TimeSlot {
  id: string
  eventId: string
  startTime: Date
  endTime: Date
  slotType: 'session' | 'break' | 'locked'
  label?: string
  createdAt: Date
}

// Merger Types
export type MergerType = 'co-presentation' | 'panel' | 'workshop-progression' | 'dialogue'
export type MergerStatus = 'pending' | 'counter-proposed' | 'accepted' | 'declined' | 'executed'

export interface MergerRequest {
  id: string
  eventId: string
  sourceSessionId: string
  targetSessionId: string
  proposedTitle: string
  proposedDescription?: string
  mergerType: MergerType
  proposedDuration: number
  requestedBy: string
  requestMessage?: string
  status: MergerStatus
  responseMessage?: string
  resultingSessionId?: string
  createdAt: Date
  updatedAt: Date
}

// Distribution Types
export type DistributionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Distribution {
  id: string
  eventId: string
  totalPool: number
  platformFee: number
  distributedAmount: number
  transactionHash?: string
  chainId?: number
  status: DistributionStatus
  initiatedBy: string
  initiatedAt: Date
  completedAt?: Date
}

export interface DistributionItem {
  id: string
  distributionId: string
  sessionId: string
  userId: string
  walletAddress: string
  voteCount: number
  qfScore: number
  percentage: number
  amount: number
  status: 'pending' | 'sent' | 'confirmed' | 'failed'
}

// Favorite Types
export interface Favorite {
  id: string
  userId: string
  sessionId: string
  createdAt: Date
}

// Computed Types
export interface SessionWithVotes extends Session {
  totalVotes: number
  uniqueVoters: number
  userVotes?: number
  hosts: SessionHost[]
  isFavorited?: boolean
}

export interface ScheduledSession extends SessionWithVotes {
  venue: Venue
  timeSlot: TimeSlot
}

export interface UserVoteBalance {
  userId: string
  eventId: string
  totalCredits: number
  spentCredits: number
  remainingCredits: number
}

// Track display config
export const trackConfig: Record<SessionTrack, { label: string; color: string }> = {
  governance: { label: 'Governance', color: 'bg-blue-500' },
  technical: { label: 'Technical', color: 'bg-purple-500' },
  defi: { label: 'DeFi', color: 'bg-green-500' },
  social: { label: 'Social', color: 'bg-orange-500' },
  creative: { label: 'Creative', color: 'bg-pink-500' },
  sustainability: { label: 'Sustainability', color: 'bg-emerald-500' },
}
