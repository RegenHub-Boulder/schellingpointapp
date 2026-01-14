import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'
import {
  ScheduleGenerator,
  ScheduleInput,
  SessionData,
  VenueData,
  TimeSlotData,
  VoterOverlapData,
} from '@/lib/scheduling'

// POST /api/events/:slug/schedule/generate - Generate optimized schedule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // JWT validation
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const payload = await verifyJWT(token)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = payload.sub as string

  const { slug } = await params
  const supabase = await createClient()

  // Get request body
  let body: {
    dryRun?: boolean
    conflictThreshold?: number
    maxIterations?: number
    targetQualityScore?: number
  } = {}

  try {
    body = await request.json()
  } catch {
    // Empty body is fine, use defaults
  }

  // 2. Get event and verify it exists
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name, schedule_published, schedule_locked')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // 2. Check admin permission
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json(
      { error: 'Only event admins can generate schedules' },
      { status: 403 }
    )
  }

  // 4. Check if schedule is locked
  if (event.schedule_locked) {
    return NextResponse.json(
      { error: 'Schedule is locked and cannot be regenerated' },
      { status: 400 }
    )
  }

  // 5. Load all required data in parallel
  const [sessionsResult, venuesResult, timeSlotsResult, overlapResult] =
    await Promise.all([
      supabase
        .from('sessions')
        .select(
          `
          id, title, duration, status, is_locked, venue_id, time_slot_id,
          technical_requirements,
          pre_vote_stats:session_pre_vote_stats(total_votes, total_voters)
        `
        )
        .eq('event_id', event.id)
        .in('status', ['approved', 'scheduled']),

      supabase
        .from('venues')
        .select('id, name, capacity, features')
        .eq('event_id', event.id),

      supabase
        .from('time_slots')
        .select('id, start_time, end_time, is_available, label')
        .eq('event_id', event.id)
        .eq('is_available', true)
        .order('start_time'),

      supabase
        .from('voter_overlap')
        .select('session_a_id, session_b_id, overlap_percentage, shared_voters')
        .eq('event_id', event.id),
    ])

  // 6. Validate data
  if (!sessionsResult.data || sessionsResult.data.length === 0) {
    return NextResponse.json(
      { error: 'No approved sessions to schedule' },
      { status: 400 }
    )
  }

  if (!venuesResult.data || venuesResult.data.length === 0) {
    return NextResponse.json(
      { error: 'No venues configured for this event' },
      { status: 400 }
    )
  }

  if (!timeSlotsResult.data || timeSlotsResult.data.length === 0) {
    return NextResponse.json(
      { error: 'No available time slots configured for this event' },
      { status: 400 }
    )
  }

  // 7. Transform data for scheduler
  const sessions: SessionData[] = sessionsResult.data.map((s) => {
    const preVoteStats = s.pre_vote_stats as {
      total_votes: number | null
      total_voters: number | null
    } | null

    return {
      id: s.id,
      title: s.title,
      duration: s.duration,
      status: s.status,
      isLocked: s.is_locked || false,
      venueId: s.venue_id,
      timeSlotId: s.time_slot_id,
      technicalRequirements: s.technical_requirements || [],
      totalVotes: preVoteStats?.total_votes || 0,
      totalVoters: preVoteStats?.total_voters || 0,
    }
  })

  const venues: VenueData[] = venuesResult.data.map((v) => ({
    id: v.id,
    name: v.name,
    capacity: v.capacity,
    features: v.features || [],
  }))

  const timeSlots: TimeSlotData[] = timeSlotsResult.data.map((t) => {
    const startTime = new Date(t.start_time)
    const endTime = new Date(t.end_time)
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000

    return {
      id: t.id,
      startTime,
      endTime,
      durationMinutes,
      isAvailable: t.is_available !== false,
      label: t.label,
    }
  })

  const voterOverlap: VoterOverlapData[] = (overlapResult.data || []).map(
    (o) => ({
      sessionAId: o.session_a_id!,
      sessionBId: o.session_b_id!,
      overlapPercentage: o.overlap_percentage || 0,
      sharedVoters: o.shared_voters || 0,
    })
  )

  const input: ScheduleInput = {
    eventId: event.id,
    sessions,
    venues,
    timeSlots,
    voterOverlap,
  }

  // 8. Generate schedule
  const config = {
    conflictThreshold: body.conflictThreshold,
    maxIterations: body.maxIterations,
    targetQualityScore: body.targetQualityScore,
  }

  const generator = new ScheduleGenerator(input, config)
  const result = generator.generate()

  // 9. Apply the schedule if not a dry run
  const dryRun = body.dryRun !== false // Default to true (dry run)

  if (!dryRun && result.success) {
    // Update sessions with assignments
    for (const assignment of result.assignments) {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          venue_id: assignment.venueId,
          time_slot_id: assignment.timeSlotId,
          status: 'scheduled',
        })
        .eq('id', assignment.sessionId)

      if (updateError) {
        console.error(
          `Failed to update session ${assignment.sessionId}:`,
          updateError
        )
      }
    }
  }

  // 10. Build response with enriched data
  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  const venueMap = new Map(venues.map((v) => [v.id, v]))
  const slotMap = new Map(timeSlots.map((t) => [t.id, t]))

  const enrichedAssignments = result.assignments.map((a) => {
    const session = sessionMap.get(a.sessionId)
    const venue = venueMap.get(a.venueId)
    const timeSlot = slotMap.get(a.timeSlotId)

    return {
      sessionId: a.sessionId,
      sessionTitle: session?.title,
      venueId: a.venueId,
      venueName: venue?.name,
      venueCapacity: venue?.capacity,
      timeSlotId: a.timeSlotId,
      startTime: timeSlot?.startTime,
      endTime: timeSlot?.endTime,
      timeSlotLabel: timeSlot?.label,
    }
  })

  return NextResponse.json({
    success: result.success,
    dryRun,
    applied: !dryRun && result.success,
    qualityScore: result.qualityScore,
    metrics: result.metrics,
    warnings: result.warnings,
    assignments: enrichedAssignments,
    unassignedSessions: result.unassignedSessions.map((id) => ({
      id,
      title: sessionMap.get(id)?.title,
    })),
    executionTimeMs: result.executionTimeMs,
  })
}
