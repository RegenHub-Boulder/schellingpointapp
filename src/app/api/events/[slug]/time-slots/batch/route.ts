import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/events/:slug/time-slots/batch - Batch create time slots (admin only)
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

  // Validate request body
  const { date, slots } = body

  if (!date || typeof date !== 'string') {
    return NextResponse.json(
      { error: 'date is required (format: YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json(
      { error: 'slots array is required and must not be empty' },
      { status: 400 }
    )
  }

  // Parse the date
  const baseDate = new Date(date)
  if (isNaN(baseDate.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
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

  let nextOrder = (maxOrderResult?.display_order || 0) + 1

  // Validate all slots first
  const slotInserts: {
    event_id: string
    start_time: string
    end_time: string
    label: string | null
    is_available: boolean
    display_order: number
  }[] = []

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]

    if (!slot.start || !slot.end) {
      return NextResponse.json(
        { error: `Slot ${i + 1}: start and end times are required` },
        { status: 400 }
      )
    }

    // Parse times (expected format: HH:MM)
    const [startHour, startMin] = slot.start.split(':').map(Number)
    const [endHour, endMin] = slot.end.split(':').map(Number)

    if (
      isNaN(startHour) || isNaN(startMin) ||
      isNaN(endHour) || isNaN(endMin)
    ) {
      return NextResponse.json(
        { error: `Slot ${i + 1}: Invalid time format. Use HH:MM` },
        { status: 400 }
      )
    }

    const startTime = new Date(baseDate)
    startTime.setUTCHours(startHour, startMin, 0, 0)

    const endTime = new Date(baseDate)
    endTime.setUTCHours(endHour, endMin, 0, 0)

    // Handle overnight slots
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1)
    }

    slotInserts.push({
      event_id: event.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      label: slot.label || null,
      is_available: true,
      display_order: nextOrder++
    })
  }

  // Check for overlaps within the batch
  for (let i = 0; i < slotInserts.length; i++) {
    for (let j = i + 1; j < slotInserts.length; j++) {
      const a = slotInserts[i]
      const b = slotInserts[j]

      const aStart = new Date(a.start_time).getTime()
      const aEnd = new Date(a.end_time).getTime()
      const bStart = new Date(b.start_time).getTime()
      const bEnd = new Date(b.end_time).getTime()

      if (aStart < bEnd && aEnd > bStart) {
        return NextResponse.json(
          { error: `Slots ${i + 1} and ${j + 1} overlap with each other` },
          { status: 400 }
        )
      }
    }
  }

  // Insert all slots
  const { data: timeSlots, error: insertError } = await supabase
    .from('time_slots')
    .insert(slotInserts)
    .select()

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ timeSlots }, { status: 201 })
}
