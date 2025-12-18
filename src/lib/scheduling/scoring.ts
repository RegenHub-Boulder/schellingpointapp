/**
 * Quality score calculation for the scheduling algorithm
 */

import {
  ScheduleInput,
  Assignment,
  SchedulerConfig,
  ScoreBreakdown,
  OverlapMap,
  SessionData,
  VenueData,
  TimeSlotData,
  SlotOccupancy,
} from './types'
import {
  findAllConflicts,
  checkVenueCompatibility,
  estimateAttendance,
  getOverlap,
  isSlotVenueAvailable,
  checkDurationFit,
} from './constraints'

// ============================================================================
// Quality Score Calculation
// ============================================================================

/**
 * Calculate the overall quality score for a complete schedule
 * Returns a score from 0-100, where higher is better
 */
export function calculateQualityScore(
  assignments: Assignment[],
  input: ScheduleInput,
  overlapMap: OverlapMap,
  config: SchedulerConfig
): { score: number; breakdown: ScoreBreakdown } {
  const weights = config.weights

  // 1. Conflict Score (penalize audience conflicts)
  const conflictScore = calculateConflictScore(
    assignments,
    overlapMap,
    config
  )

  // 2. Capacity Score (reward good venue-demand fit)
  const capacityScore = calculateCapacityScore(assignments, input)

  // 3. Balance Score (reward even distribution across time slots)
  const balanceScore = calculateBalanceScore(assignments, input)

  // 4. Feature Score (bonus for meeting feature requirements)
  const featureScore = calculateFeatureScore(assignments, input)

  // Calculate weighted total
  // Start with 100 and subtract penalties, add bonuses
  const conflictPenalty = (1 - conflictScore) * weights.conflictPenalty
  const capacityPenalty = (1 - capacityScore) * weights.capacityMatch
  const balancePenalty = (1 - balanceScore) * weights.demandBalance
  const featureBonus = featureScore * weights.featureBonus

  const total = Math.max(
    0,
    Math.min(100, 100 - conflictPenalty - capacityPenalty - balancePenalty + featureBonus)
  )

  return {
    score: Math.round(total * 10) / 10, // Round to 1 decimal
    breakdown: {
      conflictScore: Math.round(conflictScore * 100) / 100,
      capacityScore: Math.round(capacityScore * 100) / 100,
      balanceScore: Math.round(balanceScore * 100) / 100,
      featureScore: Math.round(featureScore * 100) / 100,
      total: Math.round(total * 10) / 10,
    },
  }
}

/**
 * Calculate conflict score (0-1, higher means fewer conflicts)
 */
function calculateConflictScore(
  assignments: Assignment[],
  overlapMap: OverlapMap,
  config: SchedulerConfig
): number {
  if (assignments.length <= 1) return 1

  const conflicts = findAllConflicts(assignments, overlapMap, config)

  if (conflicts.length === 0) return 1

  // Calculate maximum possible conflicts (all pairs)
  const maxPairs = (assignments.length * (assignments.length - 1)) / 2

  // Weight by overlap severity
  const totalSeverity = conflicts.reduce(
    (sum, c) => sum + c.overlapPercentage / 100,
    0
  )

  // Score decreases with more/severe conflicts
  const conflictRatio = totalSeverity / maxPairs
  return Math.max(0, 1 - conflictRatio * 2) // Scale factor of 2 for sensitivity
}

/**
 * Calculate capacity score (0-1, higher means better venue-demand fit)
 */
function calculateCapacityScore(
  assignments: Assignment[],
  input: ScheduleInput
): number {
  if (assignments.length === 0) return 1

  const sessionMap = new Map(input.sessions.map((s) => [s.id, s]))
  const venueMap = new Map(input.venues.map((v) => [v.id, v]))

  let totalFit = 0

  for (const assignment of assignments) {
    const session = sessionMap.get(assignment.sessionId)
    const venue = venueMap.get(assignment.venueId)

    if (!session || !venue) continue

    const expected = estimateAttendance(session)
    const ratio = expected / venue.capacity

    // Ideal ratio is between 0.5 and 1.0 (50-100% capacity utilization)
    // Score based on how close to ideal
    let fit: number
    if (ratio >= 0.5 && ratio <= 1.0) {
      fit = 1.0
    } else if (ratio < 0.5) {
      // Under-utilized: gradual penalty
      fit = 0.5 + ratio
    } else if (ratio <= 1.5) {
      // Slightly over: moderate penalty
      fit = 1.5 - ratio * 0.5
    } else {
      // Way over: heavy penalty
      fit = Math.max(0, 0.5 - (ratio - 1.5) * 0.5)
    }

    totalFit += fit
  }

  return totalFit / assignments.length
}

/**
 * Calculate balance score (0-1, higher means more even distribution)
 */
function calculateBalanceScore(
  assignments: Assignment[],
  input: ScheduleInput
): number {
  if (assignments.length === 0 || input.timeSlots.length <= 1) return 1

  // Count sessions per time slot
  const countPerSlot = new Map<string, number>()
  for (const slot of input.timeSlots) {
    countPerSlot.set(slot.id, 0)
  }
  for (const assignment of assignments) {
    const current = countPerSlot.get(assignment.timeSlotId) ?? 0
    countPerSlot.set(assignment.timeSlotId, current + 1)
  }

  const counts = Array.from(countPerSlot.values())
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length

  if (mean === 0) return 1

  // Calculate standard deviation
  const variance =
    counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length
  const stdDev = Math.sqrt(variance)

  // Coefficient of variation (lower is more balanced)
  const cv = stdDev / mean

  // Convert to 0-1 score (lower CV = higher score)
  return Math.max(0, 1 - cv)
}

/**
 * Calculate feature score (0-1, based on how well features match)
 */
function calculateFeatureScore(
  assignments: Assignment[],
  input: ScheduleInput
): number {
  if (assignments.length === 0) return 1

  const sessionMap = new Map(input.sessions.map((s) => [s.id, s]))
  const venueMap = new Map(input.venues.map((v) => [v.id, v]))

  let totalScore = 0
  let sessionsWithRequirements = 0

  for (const assignment of assignments) {
    const session = sessionMap.get(assignment.sessionId)
    const venue = venueMap.get(assignment.venueId)

    if (!session || !venue) continue

    if (session.technicalRequirements.length > 0) {
      sessionsWithRequirements++
      const compat = checkVenueCompatibility(session, venue)
      const matchRatio =
        1 -
        compat.missingFeatures.length / session.technicalRequirements.length
      totalScore += matchRatio
    }
  }

  if (sessionsWithRequirements === 0) return 1
  return totalScore / sessionsWithRequirements
}

// ============================================================================
// Assignment Scoring (for greedy selection)
// ============================================================================

/**
 * Score a potential assignment for greedy selection
 * Higher score = better assignment
 */
export function scoreAssignment(
  session: SessionData,
  venue: VenueData,
  timeSlot: TimeSlotData,
  currentAssignments: Assignment[],
  overlapMap: OverlapMap,
  occupancy: SlotOccupancy,
  config: SchedulerConfig
): number {
  // Check hard constraints first
  if (!isSlotVenueAvailable(timeSlot.id, venue.id, occupancy)) {
    return -Infinity
  }

  if (!timeSlot.isAvailable) {
    return -Infinity
  }

  const durationFit = checkDurationFit(session, timeSlot)
  if (!durationFit.fits) {
    return -Infinity
  }

  let score = 100

  // 1. Venue compatibility (features)
  const venueCompat = checkVenueCompatibility(session, venue)
  if (!venueCompat.compatible) {
    score -= 30 // Significant penalty for incompatible venue
  }
  score += venueCompat.score * 20 // Bonus for good venue match

  // 2. Capacity fit
  const expected = estimateAttendance(session)
  const capacityRatio = expected / venue.capacity
  if (capacityRatio > 1.2) {
    score -= 20 * (capacityRatio - 1) // Penalty for overcrowding
  } else if (capacityRatio < 0.3) {
    score -= 10 * (0.3 - capacityRatio) // Small penalty for underuse
  } else {
    score += 10 // Bonus for good fit
  }

  // 3. Conflict avoidance
  const sessionsInSlot = currentAssignments.filter(
    (a) => a.timeSlotId === timeSlot.id
  )
  for (const other of sessionsInSlot) {
    const overlap = getOverlap(session.id, other.sessionId, overlapMap)
    if (overlap >= config.conflictThreshold) {
      score -= 25 * (overlap / 100) // Heavy penalty for conflicts
    } else if (overlap > 30) {
      score -= 5 * (overlap / 100) // Light penalty for moderate overlap
    }
  }

  // 4. Duration fit bonus (prefer exact matches)
  if (durationFit.slackMinutes === 0) {
    score += 5 // Exact fit bonus
  } else if (durationFit.slackMinutes <= 15) {
    score += 2 // Close fit bonus
  }

  return score
}

// ============================================================================
// Priority Calculation
// ============================================================================

/**
 * Calculate scheduling priority for a session
 * Higher priority = schedule first (more constrained sessions)
 */
export function calculatePriority(
  session: SessionData,
  allSessions: SessionData[],
  overlapMap: OverlapMap,
  config: SchedulerConfig
): number {
  // Base priority from votes (popular sessions are harder to place)
  let priority = session.totalVotes

  // Increase priority for sessions with many conflicts
  let highOverlapCount = 0
  for (const other of allSessions) {
    if (other.id === session.id) continue
    const overlap = getOverlap(session.id, other.id, overlapMap)
    if (overlap >= config.conflictThreshold) {
      highOverlapCount++
    }
  }
  priority += highOverlapCount * 10

  // Increase priority for sessions with technical requirements
  priority += session.technicalRequirements.length * 5

  // Increase priority for longer sessions (fewer slots can fit them)
  if (session.duration >= 90) {
    priority += 15
  } else if (session.duration >= 60) {
    priority += 10
  }

  return priority
}
