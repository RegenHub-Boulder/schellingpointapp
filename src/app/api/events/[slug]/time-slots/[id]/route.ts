import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/events/:slug/time-slots/:id - Update a time slot (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
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

  // Check if user is event admin
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json(
      { error: 'Only event admins can update time slots' },
      { status: 403 }
    )
  }

  // Check if time slot exists
  const { data: timeSlot, error: slotError } = await supabase
    .from('time_slots')
    .select('id')
    .eq('id', id)
    .eq('event_id', event.id)
    .single()

  if (slotError || !timeSlot) {
    return NextResponse.json(
      { error: 'Time slot not found' },
      { status: 404 }
    )
  }

  // Build update object
  const updateData: Record<string, unknown> = {}

  if (body.startTime !== undefined) {
    const start = new Date(body.startTime)
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startTime format' },
        { status: 400 }
      )
    }
    updateData.start_time = start.toISOString()
  }

  if (body.endTime !== undefined) {
    const end = new Date(body.endTime)
    if (isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid endTime format' },
        { status: 400 }
      )
    }
    updateData.end_time = end.toISOString()
  }

  if (body.label !== undefined) {
    updateData.label = body.label
  }

  if (body.isAvailable !== undefined) {
    updateData.is_available = body.isAvailable
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  // Update time slot
  const { data: updatedSlot, error: updateError } = await supabase
    .from('time_slots')
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

  return NextResponse.json({ timeSlot: updatedSlot })
}

// DELETE /api/events/:slug/time-slots/:id - Delete a time slot (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
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

  // Check if user is event admin
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json(
      { error: 'Only event admins can delete time slots' },
      { status: 403 }
    )
  }

  // Check if any sessions are scheduled in this time slot
  const { data: scheduledSessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('time_slot_id', id)
    .limit(1)

  if (scheduledSessions && scheduledSessions.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete time slot with scheduled sessions' },
      { status: 400 }
    )
  }

  // Delete time slot
  const { error: deleteError } = await supabase
    .from('time_slots')
    .delete()
    .eq('id', id)
    .eq('event_id', event.id)

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
