import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/events/:slug/schedule/lock - Lock the schedule (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
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
    .eq('user_id', user.id)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json(
      { error: 'Only event admins can lock the schedule' },
      { status: 403 }
    )
  }

  // Check if already locked
  if (event.schedule_locked) {
    return NextResponse.json(
      { error: 'Schedule is already locked' },
      { status: 400 }
    )
  }

  // Schedule should be published before locking
  if (!event.schedule_published) {
    return NextResponse.json(
      { error: 'Schedule must be published before it can be locked' },
      { status: 400 }
    )
  }

  // Lock the schedule
  const lockedAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('events')
    .update({ schedule_locked: true })
    .eq('id', event.id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  // Also lock all scheduled sessions
  await supabase
    .from('sessions')
    .update({ is_locked: true })
    .eq('event_id', event.id)
    .eq('status', 'scheduled')

  return NextResponse.json({
    success: true,
    lockedAt
  })
}
