import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// POST /api/events/:slug/sessions/:id/reject - Reject a session (admin only)
export async function POST(
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
  const userId = payload.sub as string
  const supabase = await createClient()

  // Validate rejection reason
  const { reason } = body
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json(
      { error: 'Rejection reason is required' },
      { status: 400 }
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

  // Check if user is event admin
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json(
      { error: 'Only event admins can reject sessions' },
      { status: 403 }
    )
  }

  // Get the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('event_id', event.id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    )
  }

  // Check if session can be rejected
  if (session.status !== 'pending') {
    return NextResponse.json(
      { error: `Cannot reject session with status: ${session.status}` },
      { status: 400 }
    )
  }

  // Reject the session
  const { data: updatedSession, error: updateError } = await supabase
    .from('sessions')
    .update({
      status: 'rejected',
      rejection_reason: reason.trim()
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  // TODO: Send email notification to hosts with rejection reason

  return NextResponse.json({
    session: {
      ...updatedSession,
      status: 'rejected',
      rejectionReason: reason.trim()
    }
  })
}
