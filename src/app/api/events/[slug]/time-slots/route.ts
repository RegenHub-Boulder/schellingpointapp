import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// GET /api/events/:slug/time-slots - List time slots for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
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

  // Get time slots
  const { data: timeSlots, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('event_id', event.id)
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // Transform response
  const transformedSlots = timeSlots?.map(slot => ({
    id: slot.id,
    startTime: slot.start_time,
    endTime: slot.end_time,
    label: slot.label,
    isAvailable: slot.is_available,
    displayOrder: slot.display_order
  }))

  return NextResponse.json({ timeSlots: transformedSlots })
}

// POST /api/events/:slug/time-slots - Create a time slot (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
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
      { error: 'Only event admins can create time slots' },
      { status: 403 }
    )
  }

  // Validate required fields
  const { startTime, endTime, label, isAvailable = true } = body

  if (!startTime || !endTime) {
    return NextResponse.json(
      { error: 'startTime and endTime are required' },
      { status: 400 }
    )
  }

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format for startTime or endTime' },
      { status: 400 }
    )
  }

  if (start >= end) {
    return NextResponse.json(
      { error: 'startTime must be before endTime' },
      { status: 400 }
    )
  }

  // Check for overlapping time slots
  const { data: overlapping } = await supabase
    .from('time_slots')
    .select('id')
    .eq('event_id', event.id)
    .or(`and(start_time.lt.${end.toISOString()},end_time.gt.${start.toISOString()})`)
    .limit(1)

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json(
      { error: 'Time slot overlaps with existing slot' },
      { status: 400 }
    )
  }

  // Get max display order
  const { data: maxOrderResult } = await supabase
    .from('time_slots')
    .select('display_order')
    .eq('event_id', event.id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrderResult?.display_order || 0) + 1

  // Create time slot
  const { data: timeSlot, error: insertError } = await supabase
    .from('time_slots')
    .insert({
      event_id: event.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      label,
      is_available: isAvailable,
      display_order: nextOrder
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ timeSlot }, { status: 201 })
}
