import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ slug: string }>
}

// GET /api/events/:slug/mergers - Get all merger requests for an event
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient()
  const { slug } = await context.params

  // Get current user (admin only)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Get event by slug
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check if user is admin for this event
  const { data: access } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!access?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Get merger requests with session details
  const { data: mergers, error: mergersError } = await supabase
    .from('merger_requests')
    .select(`
      *,
      requesting_session:sessions!merger_requests_requesting_session_id_fkey (
        id,
        title,
        description,
        format,
        duration,
        topic_tags
      ),
      target_session:sessions!merger_requests_target_session_id_fkey (
        id,
        title,
        description,
        format,
        duration,
        topic_tags
      ),
      requester:users!merger_requests_requested_by_user_id_fkey (
        id,
        display_name,
        email
      )
    `)
    .eq('event_id', event.id)
    .order('created_at', { ascending: false })

  if (mergersError) {
    console.error('Error fetching mergers:', mergersError)
    return NextResponse.json({ error: 'Failed to fetch merger requests' }, { status: 500 })
  }

  // Get vote counts for each session from pre-vote stats
  const sessionIds = Array.from(new Set([
    ...(mergers || []).map(m => m.requesting_session_id),
    ...(mergers || []).map(m => m.target_session_id)
  ])).filter(Boolean) as string[]

  const { data: voteStats } = await supabase
    .from('session_pre_vote_stats')
    .select('session_id, total_votes')
    .in('session_id', sessionIds)

  // Map votes per session
  const votesBySession: Record<string, number> = {}
  for (const stat of voteStats || []) {
    if (stat.session_id) {
      votesBySession[stat.session_id] = stat.total_votes || 0
    }
  }

  // Transform to frontend format
  const transformedMergers = (mergers || []).map(merger => ({
    id: merger.id,
    eventId: merger.event_id,
    sourceSession: merger.requesting_session ? {
      id: merger.requesting_session.id,
      title: merger.requesting_session.title,
      description: merger.requesting_session.description,
      format: merger.requesting_session.format,
      durationMinutes: merger.requesting_session.duration,
      track: (merger.requesting_session.topic_tags?.[0] as string) || 'general',
      host: 'Session Host', // Host info requires separate query via session_hosts
      votes: votesBySession[merger.requesting_session.id] || 0
    } : null,
    targetSession: merger.target_session ? {
      id: merger.target_session.id,
      title: merger.target_session.title,
      description: merger.target_session.description,
      format: merger.target_session.format,
      durationMinutes: merger.target_session.duration,
      track: (merger.target_session.topic_tags?.[0] as string) || 'general',
      host: 'Session Host', // Host info requires separate query via session_hosts
      votes: votesBySession[merger.target_session.id] || 0
    } : null,
    proposedTitle: merger.message?.split('\n')[0] || 'Merged Session', // Use first line of message as title
    proposedDescription: merger.message || '',
    mergerType: 'co-presentation', // Default - not in DB schema
    proposedDuration: (merger.requesting_session?.duration || 45) + (merger.target_session?.duration || 45),
    requestedBy: merger.requester?.display_name || merger.requester?.email || 'Unknown',
    requestMessage: merger.message,
    status: merger.status,
    responseMessage: merger.response_message,
    createdAt: merger.created_at,
    respondedAt: merger.responded_at
  }))

  return NextResponse.json({ mergers: transformedMergers })
}

// POST /api/events/:slug/mergers - Create a new merger request
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient()
  const { slug } = await context.params

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Get event by slug
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const body = await request.json()
  const { sourceSessionId, targetSessionId, message } = body

  if (!sourceSessionId || !targetSessionId) {
    return NextResponse.json({ error: 'Source and target session IDs required' }, { status: 400 })
  }

  // Create merger request
  const { data: merger, error: mergerError } = await supabase
    .from('merger_requests')
    .insert({
      event_id: event.id,
      requesting_session_id: sourceSessionId,
      target_session_id: targetSessionId,
      requested_by_user_id: user.id,
      message,
      status: 'pending'
    })
    .select()
    .single()

  if (mergerError) {
    console.error('Error creating merger:', mergerError)
    return NextResponse.json({ error: 'Failed to create merger request' }, { status: 500 })
  }

  return NextResponse.json({ merger }, { status: 201 })
}
