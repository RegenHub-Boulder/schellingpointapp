/**
 * Constraint checking utilities for the scheduling algorithm
 */

import {
  SessionData,
  VenueData,
  TimeSlotData,
  VoterOverlapData,
  Assignment,
  OverlapMap,
  SlotOccupancy,
  SchedulerConfig,
} from './types'

// ============================================================================
// Overlap Map Building
// ============================================================================

/**
 * Build a fast lookup map for voter overlap between sessions
 * Key format: sorted session IDs joined with '-'
 */
export function buildOverlapMap(overlaps: VoterOverlapData[]): OverlapMap {
  const map: OverlapMap = new Map()

  for (const overlap of overlaps) {
    const key = getOverlapKey(overlap.sessionAId, overlap.sessionBId)
    map.set(key, overlap.overlapPercentage)
  }

  return map
}

/**
 * Get the overlap percentage between two sessions
 */
export function getOverlap(
  sessionAId: string,
  sessionBId: string,
  overlapMap: OverlapMap
): number {
  if (sessionAId === sessionBId) return 100
  const key = getOverlapKey(sessionAId, sessionBId)
  return overlapMap.get(key) ?? 0
}

/**
 * Generate a consistent key for two session IDs (sorted alphabetically)
 */
export function getOverlapKey(sessionAId: string, sessionBId: string): string {
  return sessionAId < sessionBId
    ? `${sessionAId}-${sessionBId}`
    : `${sessionBId}-${sessionAId}`
}

// ============================================================================
// Slot Occupancy Tracking
// ============================================================================

/**
 * Build initial slot occupancy from existing assignments
 */
export function buildSlotOccupancy(assignments: Assignment[]): SlotOccupancy {
  const occupancy: SlotOccupancy = new Map()

  for (const assignment of assignments) {
    if (!occupancy.has(assignment.timeSlotId)) {
      occupancy.set(assignment.timeSlotId, new Set())
    }
    occupancy.get(assignment.timeSlotId)!.add(assignment.venueId)
  }

  return occupancy
}

/**
 * Check if a venue is available in a specific time slot
 */
export function isSlotVenueAvailable(
  timeSlotId: string,
  venueId: string,
  occupancy: SlotOccupancy
): boolean {
  const venuesInSlot = occupancy.get(timeSlotId)
  if (!venuesInSlot) return true
  return !venuesInSlot.has(venueId)
}

// ============================================================================
// Venue Compatibility
// ============================================================================

export interface VenueCompatibilityResult {
  compatible: boolean
  score: number // 0-1, higher is better
  missingFeatures: string[]
  capacityRatio: number // expected/capacity, <1 means venue is larger
}

/**
 * Check if a venue is compatible with a session's requirements
 */
export function checkVenueCompatibility(
  session: SessionData,
  venue: VenueData
): VenueCompatibilityResult {
  // Check feature requirements
  const missingFeatures: string[] = []
  for (const requirement of session.technicalRequirements) {
    if (!venue.features.includes(requirement)) {
      missingFeatures.push(requirement)
    }
  }

  // Estimate expected attendance from vote data
  const expectedAttendance = estimateAttendance(session)
  const capacityRatio = expectedAttendance / venue.capacity

  // Calculate compatibility score
  let score = 1.0

  // Penalize missing features heavily
  if (missingFeatures.length > 0) {
    score -= 0.3 * missingFeatures.length
  }

  // Penalize capacity mismatch (both over and under)
  if (capacityRatio > 1.2) {
    // Session too big for venue
    score -= 0.3 * (capacityRatio - 1.2)
  } else if (capacityRatio < 0.3) {
    // Session too small for venue (wasteful)
    score -= 0.1 * (0.3 - capacityRatio)
  }

  score = Math.max(0, Math.min(1, score))

  return {
    compatible: missingFeatures.length === 0 && capacityRatio <= 1.5,
    score,
    missingFeatures,
    capacityRatio,
  }
}

/**
 * Estimate expected attendance based on vote data
 */
export function estimateAttendance(session: SessionData): number {
  // Heuristic: total voters * multiplier, with a minimum
  // People who voted are likely to attend, plus some walk-ins
  const baseAttendance = session.totalVoters * 1.5
  return Math.max(baseAttendance, 10) // Minimum of 10 expected
}

// ============================================================================
// Time Slot Compatibility
// ============================================================================

/**
 * Check if a session's duration fits in a time slot
 */
export function checkDurationFit(
  session: SessionData,
  timeSlot: TimeSlotData
): { fits: boolean; slackMinutes: number } {
  const slackMinutes = timeSlot.durationMinutes - session.duration
  return {
    fits: slackMinutes >= 0,
    slackMinutes,
  }
}

// ============================================================================
// Conflict Detection
// ============================================================================

export interface ConflictInfo {
  sessionAId: string
  sessionBId: string
  overlapPercentage: number
  timeSlotId: string
}

/**
 * Find all sessions that conflict with a given session in a specific time slot
 */
export function findConflictsInSlot(
  sessionId: string,
  timeSlotId: string,
  assignments: Assignment[],
  overlapMap: OverlapMap,
  config: SchedulerConfig
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = []

  // Find all sessions in the same time slot
  const sessionsInSlot = assignments.filter(
    (a) => a.timeSlotId === timeSlotId && a.sessionId !== sessionId
  )

  for (const other of sessionsInSlot) {
    const overlap = getOverlap(sessionId, other.sessionId, overlapMap)
    if (overlap >= config.conflictThreshold) {
      conflicts.push({
        sessionAId: sessionId,
        sessionBId: other.sessionId,
        overlapPercentage: overlap,
        timeSlotId,
      })
    }
  }

  return conflicts
}

/**
 * Find all conflicts in a complete schedule
 */
export function findAllConflicts(
  assignments: Assignment[],
  overlapMap: OverlapMap,
  config: SchedulerConfig
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = []
  const seen = new Set<string>()

  // Group assignments by time slot
  const bySlot = new Map<string, Assignment[]>()
  for (const assignment of assignments) {
    if (!bySlot.has(assignment.timeSlotId)) {
      bySlot.set(assignment.timeSlotId, [])
    }
    bySlot.get(assignment.timeSlotId)!.push(assignment)
  }

  // Check each pair in each slot
  for (const [timeSlotId, slotAssignments] of Array.from(bySlot.entries())) {
    for (let i = 0; i < slotAssignments.length; i++) {
      for (let j = i + 1; j < slotAssignments.length; j++) {
        const a = slotAssignments[i]
        const b = slotAssignments[j]
        const key = getOverlapKey(a.sessionId, b.sessionId)

        if (!seen.has(key)) {
          seen.add(key)
          const overlap = getOverlap(a.sessionId, b.sessionId, overlapMap)
          if (overlap >= config.conflictThreshold) {
            conflicts.push({
              sessionAId: a.sessionId,
              sessionBId: b.sessionId,
              overlapPercentage: overlap,
              timeSlotId,
            })
          }
        }
      }
    }
  }

  return conflicts
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that an assignment doesn't violate hard constraints
 */
export function validateAssignment(
  session: SessionData,
  venue: VenueData,
  timeSlot: TimeSlotData,
  occupancy: SlotOccupancy
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Check venue availability
  if (!isSlotVenueAvailable(timeSlot.id, venue.id, occupancy)) {
    reasons.push(`Venue "${venue.name}" is already booked in this time slot`)
  }

  // Check time slot availability
  if (!timeSlot.isAvailable) {
    reasons.push(`Time slot is marked as unavailable`)
  }

  // Check duration fit
  const durationFit = checkDurationFit(session, timeSlot)
  if (!durationFit.fits) {
    reasons.push(
      `Session duration (${session.duration}min) exceeds time slot (${timeSlot.durationMinutes}min)`
    )
  }

  // Check venue compatibility (features)
  const venueCompat = checkVenueCompatibility(session, venue)
  if (venueCompat.missingFeatures.length > 0) {
    reasons.push(
      `Venue missing required features: ${venueCompat.missingFeatures.join(', ')}`
    )
  }

  return {
    valid: reasons.length === 0,
    reasons,
  }
}
