import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// GET /api/events/:slug/sessions/:id - Get a single session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params
  const supabase = await createClient()

  // Get the event
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

  // Get the session with all related data
  const { data: session, error } = await supabase
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
          avatar_url,
          bio
        )
      ),
      venue:venues (
        id,
        name,
        capacity,
        features,
        description
      ),
      time_slot:time_slots (
        id,
        start_time,
        end_time,
        label
      ),
      pre_vote_stats:session_pre_vote_stats (
        total_votes,
        total_voters,
        total_credits_spent,
        vote_distribution
      ),
      attendance_stats:session_attendance_stats (
        total_votes,
        total_voters,
        qf_score,
        vote_distribution
      )
    `)
    .eq('id', id)
    .eq('event_id', event.id)
    .single()

  if (error || !session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    )
  }

  // Transform response
  const transformedSession = {
    id: session.id,
    eventId: session.event_id,
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
    venue: session.venue,
    timeSlot: session.time_slot
  }

  const hosts = session.session_hosts?.map((h: {
    id: string;
    is_primary: boolean | null;
    status: string | null;
    user: { id: string; display_name: string | null; avatar_url: string | null; bio: string | null } | null
  }) => ({
    id: h.user?.id,
    name: h.user?.display_name,
    avatar: h.user?.avatar_url,
    bio: h.user?.bio,
    isPrimary: h.is_primary,
    status: h.status
  }))

  const preVoteStats = session.pre_vote_stats as {
    total_votes: number | null;
    total_voters: number | null;
    total_credits_spent: number | null;
    vote_distribution: unknown;
  } | null

  const attendanceStats = session.attendance_stats as {
    total_votes: number | null;
    total_voters: number | null;
    qf_score: number | null;
    vote_distribution: unknown;
  } | null

  const votes = {
    preVote: preVoteStats ? {
      totalVotes: preVoteStats.total_votes || 0,
      totalVoters: preVoteStats.total_voters || 0,
      totalCreditsSpent: preVoteStats.total_credits_spent || 0,
      voteDistribution: preVoteStats.vote_distribution || {}
    } : {
      totalVotes: 0,
      totalVoters: 0,
      totalCreditsSpent: 0,
      voteDistribution: {}
    },
    attendance: attendanceStats ? {
      totalVotes: attendanceStats.total_votes || 0,
      totalVoters: attendanceStats.total_voters || 0,
      qfScore: attendanceStats.qf_score || 0,
      voteDistribution: attendanceStats.vote_distribution || {}
    } : {
      totalVotes: 0,
      totalVoters: 0,
      qfScore: 0,
      voteDistribution: {}
    }
  }

  return NextResponse.json({ session: transformedSession, hosts, votes })
}

// PATCH /api/events/:slug/sessions/:id - Update a session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  // JWT validation
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await verifyJWT(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { slug, id } = await params
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
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  // Get the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*, session_hosts(user_id, is_primary)')
    .eq('id', id)
    .eq('event_id', event.id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    )
  }

  // Check if user is a host or admin
  const isHost = session.session_hosts?.some(
    (h: { user_id: string | null }) => h.user_id === user.id
  )

  // Check if user is event admin
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  const isAdmin = accessRecord?.is_admin === true

  if (!isHost && !isAdmin) {
    return NextResponse.json(
      { error: 'Only hosts and admins can update sessions' },
      { status: 403 }
    )
  }

  // Check if session is locked (non-admins cannot edit)
  if (session.is_locked && !isAdmin) {
    return NextResponse.json(
      { error: 'Session is locked and cannot be edited' },
      { status: 403 }
    )
  }

  // Check if session is scheduled (non-admins cannot edit)
  if (session.status === 'scheduled' && !isAdmin) {
    return NextResponse.json(
      { error: 'Scheduled sessions cannot be edited' },
      { status: 403 }
    )
  }

  // Build update object (only allow certain fields)
  const allowedFields = [
    'title', 'description', 'format', 'duration',
    'max_participants', 'technical_requirements', 'topic_tags'
  ]

  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    if (body[camelField] !== undefined) {
      updateData[field] = body[camelField]
    }
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  // Validate format if provided
  if (updateData.format) {
    const validFormats = ['talk', 'workshop', 'discussion', 'panel', 'demo']
    if (!validFormats.includes(updateData.format as string)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }
  }

  // Validate duration if provided
  if (updateData.duration) {
    const validDurations = [30, 60, 90]
    if (!validDurations.includes(updateData.duration as number)) {
      return NextResponse.json(
        { error: `Invalid duration. Must be one of: ${validDurations.join(', ')} minutes` },
        { status: 400 }
      )
    }
  }

  // Update the session
  const { data: updatedSession, error: updateError } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ session: updatedSession })
}

// DELETE /api/events/:slug/sessions/:id - Delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  // JWT validation
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await verifyJWT(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { slug, id } = await params
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
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  // Get the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*, session_hosts(user_id, is_primary)')
    .eq('id', id)
    .eq('event_id', event.id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    )
  }

  // Check if user is the primary host
  const isPrimaryHost = session.session_hosts?.some(
    (h: { user_id: string | null; is_primary: boolean | null }) =>
      h.user_id === user.id && h.is_primary
  )

  // Check if user is event admin
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  const isAdmin = accessRecord?.is_admin === true

  // Only primary host (before approval) or admin can delete
  if (!isAdmin) {
    if (!isPrimaryHost) {
      return NextResponse.json(
        { error: 'Only the primary host or admin can delete sessions' },
        { status: 403 }
      )
    }

    // Non-admin hosts can only delete pending sessions
    if (session.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending sessions can be deleted by hosts' },
        { status: 403 }
      )
    }
  }

  // Delete the session (cascade will handle session_hosts)
  const { error: deleteError } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
