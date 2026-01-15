import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// POST /api/events/:slug/schedule/publish - Publish the schedule (admin only)
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

  // Get the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, schedule_published, schedule_locked')
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
      { error: 'Only event admins can publish the schedule' },
      { status: 403 }
    )
  }

  // Check if already published
  if (event.schedule_published) {
    return NextResponse.json(
      { error: 'Schedule is already published' },
      { status: 400 }
    )
  }

  // Publish the schedule
  const publishedAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('events')
    .update({ schedule_published: true })
    .eq('id', event.id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  // TODO: Send notifications to all participants

  return NextResponse.json({
    success: true,
    publishedAt
  })
}
