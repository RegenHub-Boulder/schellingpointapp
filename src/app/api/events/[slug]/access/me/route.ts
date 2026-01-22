import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// GET /api/events/:slug/access/me - Get current user's access for this event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = payload.sub
    const { slug } = await params
    const supabase = await createClient()

    // Get event by slug
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get user's access record for this event
    const { data: accessRecord, error: accessError } = await supabase
      .from('event_access')
      .select('access_granted, is_admin, checked_in, checked_in_at, burner_card_id')
      .eq('event_id', event.id)
      .eq('user_id', userId)
      .single()

    if (accessError && accessError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is ok
      console.error('Error fetching access:', accessError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Return access info (defaults if no record exists)
    return NextResponse.json({
      hasAccess: accessRecord?.access_granted ?? false,
      isAdmin: accessRecord?.is_admin ?? false,
      isCheckedIn: accessRecord?.checked_in ?? false,
      checkedInAt: accessRecord?.checked_in_at ?? null,
      burnerCardId: accessRecord?.burner_card_id ?? null,
    })

  } catch (error) {
    console.error('Access check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
