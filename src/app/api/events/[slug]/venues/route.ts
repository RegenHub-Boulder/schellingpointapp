import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/events/:slug/venues - List venues for an event
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

  // Get venues
  const { data: venues, error } = await supabase
    .from('venues')
    .select('*')
    .eq('event_id', event.id)
    .order('display_order', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ venues })
}

// POST /api/events/:slug/venues - Create a venue (admin only)
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
      { error: 'Only event admins can create venues' },
      { status: 403 }
    )
  }

  // Validate required fields
  const { name, capacity, features, description } = body

  if (!name || typeof name !== 'string') {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    )
  }

  if (!capacity || typeof capacity !== 'number' || capacity < 1) {
    return NextResponse.json(
      { error: 'Capacity must be a positive number' },
      { status: 400 }
    )
  }

  // Get max display order
  const { data: maxOrderResult } = await supabase
    .from('venues')
    .select('display_order')
    .eq('event_id', event.id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrderResult?.display_order || 0) + 1

  // Create venue
  const { data: venue, error: insertError } = await supabase
    .from('venues')
    .insert({
      event_id: event.id,
      name,
      capacity,
      features: features || [],
      description,
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

  return NextResponse.json({ venue }, { status: 201 })
}
