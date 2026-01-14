import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// PATCH /api/events/:slug/venues/:id - Update a venue (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
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

  const { slug, id } = await params
  const body = await request.json()
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

  // Check if user is event admin
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json(
      { error: 'Only event admins can update venues' },
      { status: 403 }
    )
  }

  // Check if venue exists
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id')
    .eq('id', id)
    .eq('event_id', event.id)
    .single()

  if (venueError || !venue) {
    return NextResponse.json(
      { error: 'Venue not found' },
      { status: 404 }
    )
  }

  // Build update object
  const allowedFields = ['name', 'capacity', 'features', 'description', 'display_order']
  const updateData: Record<string, unknown> = {}

  for (const field of allowedFields) {
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

  // Validate capacity if provided
  if (updateData.capacity !== undefined) {
    if (typeof updateData.capacity !== 'number' || updateData.capacity < 1) {
      return NextResponse.json(
        { error: 'Capacity must be a positive number' },
        { status: 400 }
      )
    }
  }

  // Update venue
  const { data: updatedVenue, error: updateError } = await supabase
    .from('venues')
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

  return NextResponse.json({ venue: updatedVenue })
}

// DELETE /api/events/:slug/venues/:id - Delete a venue (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
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

  // Check if user is event admin
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json(
      { error: 'Only event admins can delete venues' },
      { status: 403 }
    )
  }

  // Check if any sessions are scheduled in this venue
  const { data: scheduledSessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('venue_id', id)
    .limit(1)

  if (scheduledSessions && scheduledSessions.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete venue with scheduled sessions' },
      { status: 400 }
    )
  }

  // Delete venue
  const { error: deleteError } = await supabase
    .from('venues')
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
