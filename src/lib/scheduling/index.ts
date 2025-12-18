/**
 * Schedule generation algorithm for unconference session scheduling
 *
 * This module provides an intelligent scheduling algorithm that assigns
 * sessions to venue + time slot combinations while:
 * - Minimizing audience conflicts (based on voter overlap)
 * - Matching venue capacity to expected demand
 * - Respecting locked sessions and venue requirements
 * - Balancing sessions across time slots
 */

// Main scheduler
export { ScheduleGenerator } from './scheduler'

// Types
export type {
  ScheduleInput,
  ScheduleResult,
  SchedulerConfig,
  Assignment,
  ScheduleWarning,
  ScheduleMetrics,
  SessionData,
  VenueData,
  TimeSlotData,
  VoterOverlapData,
  ScoringWeights,
  ScoreBreakdown,
} from './types'

export { DEFAULT_CONFIG } from './types'

// Utilities (for testing/debugging)
export {
  buildOverlapMap,
  checkVenueCompatibility,
  estimateAttendance,
  findAllConflicts,
} from './constraints'

export { calculateQualityScore } from './scoring'
