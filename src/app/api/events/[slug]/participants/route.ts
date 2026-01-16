import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// GET /api/events/:slug/participants - List participants (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)

  const checkedIn = searchParams.get('checkedIn')
  const isAdmin = searchParams.get('isAdmin')

  // JWT authentication
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
      { error: 'Only event admins can view participants' },
      { status: 403 }
    )
  }

  // Use admin client to bypass RLS for fetching all participants
  const adminClient = await createAdminClient()

  // Build query
  let query = adminClient
    .from('event_access')
    .select(`
      id,
      access_granted,
      is_admin,
      checked_in,
      checked_in_at,
      email,
      wallet_address,
      burner_card_id,
      created_at,
      user:users (
        id,
        email,
        display_name,
        avatar_url,
        smart_wallet_address
      )
    `)
    .eq('event_id', event.id)
    .eq('access_granted', true)

  // Apply filters
  if (checkedIn !== null) {
    query = query.eq('checked_in', checkedIn === 'true')
  }
  if (isAdmin !== null) {
    query = query.eq('is_admin', isAdmin === 'true')
  }

  const { data: accessRecords, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // Transform response
  const participants = accessRecords?.map(record => ({
    user: record.user ? {
      id: record.user.id,
      email: record.user.email,
      displayName: record.user.display_name,
      avatar: record.user.avatar_url,
      walletAddress: record.user.smart_wallet_address
    } : {
      email: record.email,
      walletAddress: record.wallet_address
    },
    checkedIn: record.checked_in,
    checkedInAt: record.checked_in_at,
    isAdmin: record.is_admin,
    burnerCardId: record.burner_card_id,
    grantedAt: record.created_at
  }))

  return NextResponse.json({ participants })
}
