import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// GET /api/events/:slug/favorites - Get user's favorites for this event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = payload.sub as string
    const { slug } = await params

    const adminClient = await createAdminClient()

    // Get the event
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get user's favorites with session details
    const { data: favorites, error: favError } = await adminClient
      .from('favorites')
      .select(`
        id,
        session_id,
        created_at,
        session:sessions (
          id,
          title,
          description,
          format,
          duration,
          track,
          status,
          venue:venues (
            id,
            name
          ),
          time_slot:time_slots (
            id,
            start_time,
            end_time,
            label
          ),
          session_hosts (
            user:users (
              id,
              display_name
            ),
            is_primary
          )
        )
      `)
      .eq('user_id', userId)
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })

    if (favError) {
      console.error('Error fetching favorites:', favError)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }

    // Transform the response
    const transformedFavorites = favorites?.map(fav => ({
      id: fav.id,
      sessionId: fav.session_id,
      createdAt: fav.created_at,
      session: fav.session ? {
        id: (fav.session as any).id,
        title: (fav.session as any).title,
        description: (fav.session as any).description,
        format: (fav.session as any).format,
        duration: (fav.session as any).duration,
        track: (fav.session as any).track,
        status: (fav.session as any).status,
        venue: (fav.session as any).venue,
        timeSlot: (fav.session as any).time_slot,
        hosts: (fav.session as any).session_hosts?.map((h: any) => ({
          name: h.user?.display_name,
          isPrimary: h.is_primary
        }))
      } : null
    })) || []

    return NextResponse.json({
      favorites: transformedFavorites,
      sessionIds: transformedFavorites.map(f => f.sessionId)
    })

  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/events/:slug/favorites - Add a session to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = payload.sub as string
    const { slug } = await params
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    // Get the event
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify the session exists and belongs to this event
    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('event_id', event.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Add to favorites (upsert to handle duplicates gracefully)
    const { data: favorite, error: insertError } = await adminClient
      .from('favorites')
      .upsert({
        user_id: userId,
        session_id: sessionId,
        event_id: event.id,
      }, {
        onConflict: 'user_id,session_id'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding favorite:', insertError)
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 })
    }

    return NextResponse.json({ success: true, favorite }, { status: 201 })

  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/:slug/favorites - Remove a session from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = payload.sub as string
    const { slug } = await params

    // Get sessionId from query params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    // Get the event
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Delete the favorite
    const { error: deleteError } = await adminClient
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('event_id', event.id)

    if (deleteError) {
      console.error('Error removing favorite:', deleteError)
      return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
