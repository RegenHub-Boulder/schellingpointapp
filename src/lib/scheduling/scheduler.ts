/**
 * Main schedule generator class
 */

import {
  ScheduleInput,
  ScheduleResult,
  SchedulerConfig,
  Assignment,
  ScheduleWarning,
  ScheduleMetrics,
  OverlapMap,
  SlotOccupancy,
  SessionData,
  DEFAULT_CONFIG,
} from './types'
import {
  buildOverlapMap,
  buildSlotOccupancy,
  isSlotVenueAvailable,
  checkVenueCompatibility,
  checkDurationFit,
  findAllConflicts,
  estimateAttendance,
} from './constraints'
import {
  calculateQualityScore,
  scoreAssignment,
  calculatePriority,
} from './scoring'
import { optimizeSchedule } from './optimizer'

export class ScheduleGenerator {
  private input: ScheduleInput
  private config: SchedulerConfig
  private overlapMap: OverlapMap
  private assignments: Assignment[]
  private occupancy: SlotOccupancy
  private warnings: ScheduleWarning[]
  private startTime: number

  constructor(input: ScheduleInput, config?: Partial<SchedulerConfig>) {
    this.input = input
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.overlapMap = buildOverlapMap(input.voterOverlap)
    this.assignments = []
    this.occupancy = new Map()
    this.warnings = []
    this.startTime = Date.now()
  }

  /**
   * Generate an optimized schedule
   */
  generate(): ScheduleResult {
    this.startTime = Date.now()

    // Validate input
    const validationResult = this.validateInput()
    if (!validationResult.valid) {
      return this.buildErrorResult(validationResult.error!)
    }

    // Phase 1: Assign locked sessions first
    this.assignLockedSessions()

    // Phase 2: Sort remaining sessions by priority and assign greedily
    const unassigned = this.getUnassignedSessions()
    const sorted = this.sortByPriority(unassigned)

    for (const session of sorted) {
      const best = this.findBestAssignment(session)
      if (best) {
        this.assign(session.id, best.venueId, best.timeSlotId)
      } else {
        this.warnings.push({
          type: 'unassigned',
          severity: 'high',
          sessionIds: [session.id],
          message: `Could not find a valid slot for session "${session.title}"`,
        })
      }
    }

    // Phase 3: Optimize the schedule
    const optimizationResult = optimizeSchedule(
      this.assignments,
      this.input,
      this.overlapMap,
      this.config
    )
    this.assignments = optimizationResult.assignments

    // Phase 4: Generate final result
    return this.buildResult()
  }

  /**
   * Validate that input data is sufficient for scheduling
   */
  private validateInput(): { valid: boolean; error?: string } {
    if (this.input.sessions.length === 0) {
      return { valid: false, error: 'No sessions to schedule' }
    }

    if (this.input.venues.length === 0) {
      return { valid: false, error: 'No venues configured' }
    }

    if (this.input.timeSlots.length === 0) {
      return { valid: false, error: 'No time slots configured' }
    }

    // Check if we have enough capacity
    const totalCapacity = this.input.venues.length * this.input.timeSlots.length
    const sessionsToSchedule = this.input.sessions.filter(
      (s) => !s.isLocked || !s.venueId || !s.timeSlotId
    ).length

    if (sessionsToSchedule > totalCapacity) {
      this.warnings.push({
        type: 'capacity',
        severity: 'high',
        sessionIds: [],
        message: `More sessions (${sessionsToSchedule}) than available slots (${totalCapacity}). Some sessions may not be assigned.`,
      })
    }

    return { valid: true }
  }

  /**
   * Assign sessions that are already locked to specific slots
   */
  private assignLockedSessions(): void {
    for (const session of this.input.sessions) {
      if (session.isLocked && session.venueId && session.timeSlotId) {
        // Validate the locked assignment
        const venue = this.input.venues.find((v) => v.id === session.venueId)
        const slot = this.input.timeSlots.find(
          (t) => t.id === session.timeSlotId
        )

        if (!venue || !slot) {
          this.warnings.push({
            type: 'unassigned',
            severity: 'high',
            sessionIds: [session.id],
            message: `Locked session "${session.title}" references invalid venue or time slot`,
          })
          continue
        }

        // Check for conflicts with other locked sessions
        if (!isSlotVenueAvailable(slot.id, venue.id, this.occupancy)) {
          this.warnings.push({
            type: 'conflict',
            severity: 'high',
            sessionIds: [session.id],
            message: `Locked session "${session.title}" conflicts with another locked session in the same venue/slot`,
          })
        }

        this.assign(session.id, venue.id, slot.id)
      }
    }
  }

  /**
   * Get sessions that haven't been assigned yet
   */
  private getUnassignedSessions(): SessionData[] {
    const assignedIds = new Set(this.assignments.map((a) => a.sessionId))
    return this.input.sessions.filter((s) => !assignedIds.has(s.id))
  }

  /**
   * Sort sessions by scheduling priority (highest first)
   */
  private sortByPriority(sessions: SessionData[]): SessionData[] {
    return [...sessions].sort((a, b) => {
      const priorityA = calculatePriority(
        a,
        this.input.sessions,
        this.overlapMap,
        this.config
      )
      const priorityB = calculatePriority(
        b,
        this.input.sessions,
        this.overlapMap,
        this.config
      )
      return priorityB - priorityA
    })
  }

  /**
   * Find the best available assignment for a session
   */
  private findBestAssignment(
    session: SessionData
  ): { venueId: string; timeSlotId: string } | null {
    let bestScore = -Infinity
    let best: { venueId: string; timeSlotId: string } | null = null

    for (const timeSlot of this.input.timeSlots) {
      if (!timeSlot.isAvailable) continue

      // Check duration fit
      const durationFit = checkDurationFit(session, timeSlot)
      if (!durationFit.fits) continue

      for (const venue of this.input.venues) {
        // Check availability
        if (!isSlotVenueAvailable(timeSlot.id, venue.id, this.occupancy)) {
          continue
        }

        // Check compatibility
        const compat = checkVenueCompatibility(session, venue)
        if (!compat.compatible) {
          // Still consider incompatible venues but with lower score
          // This allows scheduling even when no perfect match exists
        }

        // Score this assignment
        const score = scoreAssignment(
          session,
          venue,
          timeSlot,
          this.assignments,
          this.overlapMap,
          this.occupancy,
          this.config
        )

        if (score > bestScore) {
          bestScore = score
          best = { venueId: venue.id, timeSlotId: timeSlot.id }
        }
      }
    }

    // Generate warning if best assignment has issues
    if (best && bestScore < 50) {
      const venue = this.input.venues.find((v) => v.id === best!.venueId)
      const compat = venue
        ? checkVenueCompatibility(session, venue)
        : { missingFeatures: [], compatible: false }

      if (compat.missingFeatures.length > 0) {
        this.warnings.push({
          type: 'feature',
          severity: 'medium',
          sessionIds: [session.id],
          message: `Session "${session.title}" assigned to venue missing features: ${compat.missingFeatures.join(', ')}`,
        })
      }
    }

    return best
  }

  /**
   * Record an assignment
   */
  private assign(
    sessionId: string,
    venueId: string,
    timeSlotId: string
  ): void {
    this.assignments.push({ sessionId, venueId, timeSlotId })

    // Update occupancy
    if (!this.occupancy.has(timeSlotId)) {
      this.occupancy.set(timeSlotId, new Set())
    }
    this.occupancy.get(timeSlotId)!.add(venueId)
  }

  /**
   * Build the final result
   */
  private buildResult(): ScheduleResult {
    const executionTimeMs = Date.now() - this.startTime

    // Calculate final quality score
    const { score, breakdown } = calculateQualityScore(
      this.assignments,
      this.input,
      this.overlapMap,
      this.config
    )

    // Find any remaining conflicts
    const conflicts = findAllConflicts(
      this.assignments,
      this.overlapMap,
      this.config
    )

    // Add conflict warnings
    for (const conflict of conflicts) {
      const sessionA = this.input.sessions.find(
        (s) => s.id === conflict.sessionAId
      )
      const sessionB = this.input.sessions.find(
        (s) => s.id === conflict.sessionBId
      )

      this.warnings.push({
        type: 'conflict',
        severity: conflict.overlapPercentage >= 80 ? 'high' : 'medium',
        sessionIds: [conflict.sessionAId, conflict.sessionBId],
        message: `Sessions "${sessionA?.title}" and "${sessionB?.title}" have ${conflict.overlapPercentage}% voter overlap but are scheduled concurrently`,
      })
    }

    // Calculate metrics
    const metrics = this.calculateMetrics()

    // Get unassigned sessions
    const assignedIds = new Set(this.assignments.map((a) => a.sessionId))
    const unassignedSessions = this.input.sessions
      .filter((s) => !assignedIds.has(s.id))
      .map((s) => s.id)

    return {
      success: unassignedSessions.length === 0,
      assignments: this.assignments,
      qualityScore: score,
      metrics,
      warnings: this.warnings,
      unassignedSessions,
      executionTimeMs,
    }
  }

  /**
   * Build an error result
   */
  private buildErrorResult(error: string): ScheduleResult {
    return {
      success: false,
      assignments: [],
      qualityScore: 0,
      metrics: {
        totalSessions: this.input.sessions.length,
        assignedSessions: 0,
        lockedSessions: 0,
        conflictCount: 0,
        avgCapacityUtilization: 0,
        demandBalanceScore: 0,
      },
      warnings: [
        {
          type: 'unassigned',
          severity: 'high',
          sessionIds: [],
          message: error,
        },
      ],
      unassignedSessions: this.input.sessions.map((s) => s.id),
      executionTimeMs: Date.now() - this.startTime,
    }
  }

  /**
   * Calculate schedule metrics
   */
  private calculateMetrics(): ScheduleMetrics {
    const venueMap = new Map(this.input.venues.map((v) => [v.id, v]))
    const sessionMap = new Map(this.input.sessions.map((s) => [s.id, s]))

    // Count locked sessions
    const lockedSessions = this.input.sessions.filter((s) => s.isLocked).length

    // Calculate capacity utilization
    let totalUtilization = 0
    for (const assignment of this.assignments) {
      const session = sessionMap.get(assignment.sessionId)
      const venue = venueMap.get(assignment.venueId)
      if (session && venue) {
        const expected = estimateAttendance(session)
        const utilization = Math.min(expected / venue.capacity, 1)
        totalUtilization += utilization
      }
    }
    const avgCapacityUtilization =
      this.assignments.length > 0
        ? totalUtilization / this.assignments.length
        : 0

    // Calculate demand balance
    const countPerSlot = new Map<string, number>()
    for (const slot of this.input.timeSlots) {
      countPerSlot.set(slot.id, 0)
    }
    for (const assignment of this.assignments) {
      const current = countPerSlot.get(assignment.timeSlotId) ?? 0
      countPerSlot.set(assignment.timeSlotId, current + 1)
    }
    const counts = Array.from(countPerSlot.values())
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length
    const variance =
      mean > 0
        ? counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) /
          counts.length
        : 0
    const stdDev = Math.sqrt(variance)
    const demandBalanceScore = mean > 0 ? Math.max(0, 1 - stdDev / mean) : 1

    // Count conflicts
    const conflicts = findAllConflicts(
      this.assignments,
      this.overlapMap,
      this.config
    )

    return {
      totalSessions: this.input.sessions.length,
      assignedSessions: this.assignments.length,
      lockedSessions,
      conflictCount: conflicts.length,
      avgCapacityUtilization: Math.round(avgCapacityUtilization * 100) / 100,
      demandBalanceScore: Math.round(demandBalanceScore * 100) / 100,
    }
  }
}
