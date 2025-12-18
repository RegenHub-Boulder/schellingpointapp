/**
 * Type definitions for the scheduling algorithm
 */

// ============================================================================
// Input Types
// ============================================================================

export interface ScheduleInput {
  eventId: string
  sessions: SessionData[]
  venues: VenueData[]
  timeSlots: TimeSlotData[]
  voterOverlap: VoterOverlapData[]
}

export interface SessionData {
  id: string
  title: string
  duration: number // minutes (30, 60, 90)
  status: string
  isLocked: boolean
  venueId: string | null // Pre-assigned if locked
  timeSlotId: string | null // Pre-assigned if locked
  technicalRequirements: string[]
  totalVotes: number
  totalVoters: number
}

export interface VenueData {
  id: string
  name: string
  capacity: number
  features: string[]
}

export interface TimeSlotData {
  id: string
  startTime: Date
  endTime: Date
  durationMinutes: number
  isAvailable: boolean
  label: string | null
}

export interface VoterOverlapData {
  sessionAId: string
  sessionBId: string
  overlapPercentage: number // 0-100
  sharedVoters: number
}

// ============================================================================
// Output Types
// ============================================================================

export interface Assignment {
  sessionId: string
  venueId: string
  timeSlotId: string
}

export interface ScheduleResult {
  success: boolean
  assignments: Assignment[]
  qualityScore: number
  metrics: ScheduleMetrics
  warnings: ScheduleWarning[]
  unassignedSessions: string[]
  executionTimeMs: number
}

export interface ScheduleMetrics {
  totalSessions: number
  assignedSessions: number
  lockedSessions: number
  conflictCount: number
  avgCapacityUtilization: number
  demandBalanceScore: number // 0-1, higher is more balanced
}

export interface ScheduleWarning {
  type: 'conflict' | 'capacity' | 'feature' | 'unassigned' | 'duration'
  severity: 'low' | 'medium' | 'high'
  sessionIds: string[]
  message: string
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SchedulerConfig {
  /** Overlap percentage above which sessions should not be in same time slot (default: 60) */
  conflictThreshold: number
  /** Maximum optimization iterations (default: 1000) */
  maxIterations: number
  /** Target quality score to stop optimization early (default: 70) */
  targetQualityScore: number
  /** Scoring weights for quality calculation */
  weights: ScoringWeights
}

export interface ScoringWeights {
  /** Weight for overlap violations (default: 40) */
  conflictPenalty: number
  /** Weight for capacity fit (default: 30) */
  capacityMatch: number
  /** Weight for even distribution (default: 20) */
  demandBalance: number
  /** Bonus for feature match (default: 10) */
  featureBonus: number
}

export const DEFAULT_CONFIG: SchedulerConfig = {
  conflictThreshold: 60,
  maxIterations: 1000,
  targetQualityScore: 70,
  weights: {
    conflictPenalty: 40,
    capacityMatch: 30,
    demandBalance: 20,
    featureBonus: 10,
  },
}

// ============================================================================
// Internal Types
// ============================================================================

export interface ScoreBreakdown {
  conflictScore: number
  capacityScore: number
  balanceScore: number
  featureScore: number
  total: number
}

export interface SlotAssignment {
  timeSlotId: string
  venueId: string
  sessionId: string
}

/** Map key format: `${sessionAId}-${sessionBId}` (sorted alphabetically) */
export type OverlapMap = Map<string, number>

/** Map of timeSlotId -> Set of venueIds that are occupied */
export type SlotOccupancy = Map<string, Set<string>>
