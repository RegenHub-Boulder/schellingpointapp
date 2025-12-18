/**
 * Local search optimizer for schedule improvement
 */

import {
  ScheduleInput,
  Assignment,
  SchedulerConfig,
  OverlapMap,
  SlotOccupancy,
} from './types'
import { buildSlotOccupancy, validateAssignment } from './constraints'
import { calculateQualityScore } from './scoring'

export interface OptimizationResult {
  assignments: Assignment[]
  initialScore: number
  finalScore: number
  iterations: number
  improved: boolean
}

/**
 * Optimize a schedule using local search (hill climbing with swaps and moves)
 */
export function optimizeSchedule(
  initialAssignments: Assignment[],
  input: ScheduleInput,
  overlapMap: OverlapMap,
  config: SchedulerConfig
): OptimizationResult {
  let current = [...initialAssignments]
  const initialResult = calculateQualityScore(current, input, overlapMap, config)
  let currentScore = initialResult.score

  const sessionMap = new Map(input.sessions.map((s) => [s.id, s]))
  const venueMap = new Map(input.venues.map((v) => [v.id, v]))
  const slotMap = new Map(input.timeSlots.map((t) => [t.id, t]))

  let improved = true
  let iterations = 0
  let totalImproved = false

  while (improved && iterations < config.maxIterations) {
    improved = false
    iterations++

    // Early exit if target score reached
    if (currentScore >= config.targetQualityScore) {
      break
    }

    // Try swap moves (exchange two sessions' assignments)
    const swapResult = trySwapMoves(
      current,
      input,
      overlapMap,
      config,
      sessionMap,
      currentScore
    )
    if (swapResult.improved) {
      current = swapResult.assignments
      currentScore = swapResult.score
      improved = true
      totalImproved = true
      continue // Restart after improvement
    }

    // Try move operations (move a session to a different slot/venue)
    const moveResult = tryMoveMoves(
      current,
      input,
      overlapMap,
      config,
      sessionMap,
      venueMap,
      slotMap,
      currentScore
    )
    if (moveResult.improved) {
      current = moveResult.assignments
      currentScore = moveResult.score
      improved = true
      totalImproved = true
    }
  }

  return {
    assignments: current,
    initialScore: initialResult.score,
    finalScore: currentScore,
    iterations,
    improved: totalImproved,
  }
}

/**
 * Try swapping pairs of sessions
 */
function trySwapMoves(
  assignments: Assignment[],
  input: ScheduleInput,
  overlapMap: OverlapMap,
  config: SchedulerConfig,
  sessionMap: Map<string, (typeof input.sessions)[0]>,
  currentScore: number
): { improved: boolean; assignments: Assignment[]; score: number } {
  const venueMap = new Map(input.venues.map((v) => [v.id, v]))
  const slotMap = new Map(input.timeSlots.map((t) => [t.id, t]))

  for (let i = 0; i < assignments.length; i++) {
    const sessionA = sessionMap.get(assignments[i].sessionId)
    if (!sessionA || sessionA.isLocked) continue

    for (let j = i + 1; j < assignments.length; j++) {
      const sessionB = sessionMap.get(assignments[j].sessionId)
      if (!sessionB || sessionB.isLocked) continue

      // Try swapping their assignments
      const swapped = [...assignments]
      swapped[i] = {
        sessionId: assignments[i].sessionId,
        venueId: assignments[j].venueId,
        timeSlotId: assignments[j].timeSlotId,
      }
      swapped[j] = {
        sessionId: assignments[j].sessionId,
        venueId: assignments[i].venueId,
        timeSlotId: assignments[i].timeSlotId,
      }

      // Validate the swap
      const venueA = venueMap.get(swapped[i].venueId)
      const venueB = venueMap.get(swapped[j].venueId)
      const slotA = slotMap.get(swapped[i].timeSlotId)
      const slotB = slotMap.get(swapped[j].timeSlotId)

      if (!venueA || !venueB || !slotA || !slotB) continue

      // Build occupancy without these two sessions
      const otherAssignments = assignments.filter(
        (_, idx) => idx !== i && idx !== j
      )
      const tempOccupancy = buildSlotOccupancy(otherAssignments)

      const validA = validateAssignment(sessionA, venueA, slotA, tempOccupancy)
      if (!validA.valid) continue

      // Add A's assignment to occupancy before validating B
      if (!tempOccupancy.has(slotA.id)) {
        tempOccupancy.set(slotA.id, new Set())
      }
      tempOccupancy.get(slotA.id)!.add(venueA.id)

      const validB = validateAssignment(sessionB, venueB, slotB, tempOccupancy)
      if (!validB.valid) continue

      // Calculate new score
      const newResult = calculateQualityScore(swapped, input, overlapMap, config)

      if (newResult.score > currentScore) {
        return {
          improved: true,
          assignments: swapped,
          score: newResult.score,
        }
      }
    }
  }

  return { improved: false, assignments, score: currentScore }
}

/**
 * Try moving sessions to different slots/venues
 */
function tryMoveMoves(
  assignments: Assignment[],
  input: ScheduleInput,
  overlapMap: OverlapMap,
  config: SchedulerConfig,
  sessionMap: Map<string, (typeof input.sessions)[0]>,
  venueMap: Map<string, (typeof input.venues)[0]>,
  slotMap: Map<string, (typeof input.timeSlots)[0]>,
  currentScore: number
): { improved: boolean; assignments: Assignment[]; score: number } {
  for (let i = 0; i < assignments.length; i++) {
    const session = sessionMap.get(assignments[i].sessionId)
    if (!session || session.isLocked) continue

    const currentSlotId = assignments[i].timeSlotId
    const currentVenueId = assignments[i].venueId

    // Build occupancy without this session
    const otherAssignments = assignments.filter((_, idx) => idx !== i)
    const tempOccupancy = buildSlotOccupancy(otherAssignments)

    // Try each alternative slot/venue combination
    for (const slot of input.timeSlots) {
      if (!slot.isAvailable) continue

      for (const venue of input.venues) {
        // Skip current assignment
        if (slot.id === currentSlotId && venue.id === currentVenueId) continue

        // Validate the move
        const valid = validateAssignment(session, venue, slot, tempOccupancy)
        if (!valid.valid) continue

        // Create moved schedule
        const moved = [...assignments]
        moved[i] = {
          sessionId: session.id,
          venueId: venue.id,
          timeSlotId: slot.id,
        }

        // Calculate new score
        const newResult = calculateQualityScore(moved, input, overlapMap, config)

        if (newResult.score > currentScore) {
          return {
            improved: true,
            assignments: moved,
            score: newResult.score,
          }
        }
      }
    }
  }

  return { improved: false, assignments, score: currentScore }
}
