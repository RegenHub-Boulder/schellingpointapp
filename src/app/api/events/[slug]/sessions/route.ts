import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/events/:slug/sessions - List sessions for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status')
  const format = searchParams.get('format')
  const tags = searchParams.get('tags')?.split(',')
  const mine = searchParams.get('mine') === 'true'

  const supabase = await createClient()

  // If filtering by user's sessions, get current user
  let currentUserId: string | null = null
  if (mine) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - login required to view your sessions' },
        { status: 401 }
      )
    }
    currentUserId = user.id
  }

  // First get the event by slug
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  // Build the sessions query
  let query = supabase
    .from('sessions')
    .select(`
      *,
      session_hosts (
        id,
        is_primary,
        status,
        user:users (
          id,
          display_name,
          avatar_url
        )
      ),
      venue:venues (
        id,
        name,
        capacity,
        features
      ),
      time_slot:time_slots (
        id,
        start_time,
        end_time,
        label
      ),
      pre_vote_stats:session_pre_vote_stats (
        total_votes,
        total_voters
      ),
      attendance_stats:session_attendance_stats (
        total_votes,
        qf_score
      )
    `)
    .eq('event_id', event.id)
    .order('created_at', { ascending: false })

  // Apply filters
  if (status) {
    query = query.eq('status', status)
  }
  if (format) {
    query = query.eq('format', format)
  }
  if (tags && tags.length > 0) {
    query = query.overlaps('topic_tags', tags)
  }

  // If filtering for current user's sessions, we need a different approach
  // We'll filter after fetching since Supabase doesn't support filtering by nested relation
  let userSessionIds: string[] | null = null
  if (currentUserId) {
    const { data: hostRecords } = await supabase
      .from('session_hosts')
      .select('session_id')
      .eq('user_id', currentUserId)

    if (hostRecords) {
      userSessionIds = hostRecords.map(h => h.session_id)
      if (userSessionIds.length === 0) {
        // User has no sessions
        return NextResponse.json({ sessions: [] })
      }
      query = query.in('id', userSessionIds)
    }
  }

  const { data: sessions, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // Transform the response to match the expected format
  const transformedSessions = sessions?.map(session => ({
    id: session.id,
    title: session.title,
    description: session.description,
    format: session.format,
    duration: session.duration,
    maxParticipants: session.max_participants,
    technicalRequirements: session.technical_requirements,
    topicTags: session.topic_tags,
    status: session.status,
    rejectionReason: session.rejection_reason,
    isLocked: session.is_locked,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    hosts: session.session_hosts
      ?.filter((h: { status: string | null }) => h.status === 'accepted')
      .map((h: { id: string; is_primary: boolean | null; user: { id: string; display_name: string | null; avatar_url: string | null } | null }) => ({
        id: h.user?.id,
        name: h.user?.display_name,
        avatar: h.user?.avatar_url,
        isPrimary: h.is_primary
      })),
    venue: session.venue,
    timeSlot: session.time_slot,
    preVoteStats: session.pre_vote_stats ? {
      totalVotes: (session.pre_vote_stats as { total_votes: number | null }).total_votes || 0,
      totalVoters: (session.pre_vote_stats as { total_voters: number | null }).total_voters || 0
    } : { totalVotes: 0, totalVoters: 0 },
    attendanceStats: session.attendance_stats ? {
      totalVotes: (session.attendance_stats as { total_votes: number | null }).total_votes || 0,
      qfScore: (session.attendance_stats as { qf_score: number | null }).qf_score || 0
    } : { totalVotes: 0, qfScore: 0 }
  }))

  return NextResponse.json({ sessions: transformedSessions })
}

// POST /api/events/:slug/sessions - Create a new session proposal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()

  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, proposal_deadline')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  // Check proposal deadline
  if (event.proposal_deadline && new Date(event.proposal_deadline) < new Date()) {
    return NextResponse.json(
      { error: 'Proposal deadline has passed' },
      { status: 400 }
    )
  }

  // Validate required fields
  const { title, description, format, duration, maxParticipants, technicalRequirements, topicTags, coHosts } = body

  if (!title || !description || !format || !duration) {
    return NextResponse.json(
      { error: 'Missing required fields: title, description, format, duration' },
      { status: 400 }
    )
  }

  // Validate format
  const validFormats = ['talk', 'workshop', 'discussion', 'panel', 'demo']
  if (!validFormats.includes(format)) {
    return NextResponse.json(
      { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate duration
  const validDurations = [30, 60, 90]
  if (!validDurations.includes(duration)) {
    return NextResponse.json(
      { error: `Invalid duration. Must be one of: ${validDurations.join(', ')} minutes` },
      { status: 400 }
    )
  }

  // Create the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      event_id: event.id,
      title,
      description,
      format,
      duration,
      max_participants: maxParticipants,
      technical_requirements: technicalRequirements || [],
      topic_tags: topicTags || [],
      status: 'pending'
    })
    .select()
    .single()

  if (sessionError) {
    return NextResponse.json(
      { error: sessionError.message },
      { status: 500 }
    )
  }

  // Get user record from users table
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!userRecord) {
    // Clean up the session if we can't add the host
    await supabase.from('sessions').delete().eq('id', session.id)
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 400 }
    )
  }

  // Add the primary host
  const { error: hostError } = await supabase
    .from('session_hosts')
    .insert({
      session_id: session.id,
      user_id: userRecord.id,
      is_primary: true,
      status: 'accepted'
    })

  if (hostError) {
    // Clean up on error
    await supabase.from('sessions').delete().eq('id', session.id)
    return NextResponse.json(
      { error: hostError.message },
      { status: 500 }
    )
  }

  // Add co-hosts if specified (with pending status)
  if (coHosts && coHosts.length > 0) {
    const coHostInserts = coHosts.map((userId: string) => ({
      session_id: session.id,
      user_id: userId,
      is_primary: false,
      status: 'pending'
    }))

    await supabase.from('session_hosts').insert(coHostInserts)
    // Note: In production, send notifications to co-hosts here
  }

  return NextResponse.json({ session }, { status: 201 })
}
