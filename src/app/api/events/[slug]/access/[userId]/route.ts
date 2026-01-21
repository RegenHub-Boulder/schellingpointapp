import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// GET /api/events/:slug/access/:userId - Get a specific participant's details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
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
  const currentUserId = payload.sub as string

  const { slug, userId: targetUserId } = await params
  const supabase = await createClient()

  // Get the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check if user is event admin
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', currentUserId)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Get target user's access and profile
  const adminClient = await createAdminClient()
  const { data: targetAccess, error: targetError } = await adminClient
    .from('event_access')
    .select(`
      id,
      access_granted,
      is_admin,
      checked_in,
      checked_in_at,
      burner_card_id,
      user:users (
        id,
        display_name,
        email,
        bio,
        avatar_url,
        payout_address
      )
    `)
    .eq('event_id', event.id)
    .eq('user_id', targetUserId)
    .single()

  if (targetError || !targetAccess) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  return NextResponse.json({ participant: targetAccess })
}

// PATCH /api/events/:slug/access/:userId - Update participant access (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
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
  const currentUserId = payload.sub as string

  const { slug, userId: targetUserId } = await params
  const body = await request.json()
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

  // Check if user is event admin
  const { data: accessRecord } = await adminClient
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', currentUserId)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Build update data for event_access
  const accessUpdate: Record<string, any> = {}
  if (body.isAdmin !== undefined) accessUpdate.is_admin = body.isAdmin
  if (body.accessGranted !== undefined) accessUpdate.access_granted = body.accessGranted
  if (body.checkedIn !== undefined) {
    accessUpdate.checked_in = body.checkedIn
    if (body.checkedIn) {
      accessUpdate.checked_in_at = new Date().toISOString()
    }
  }
  if (body.burnerCardId !== undefined) accessUpdate.burner_card_id = body.burnerCardId

  // Update event_access if there are fields to update
  if (Object.keys(accessUpdate).length > 0) {
    const { error: updateError } = await adminClient
      .from('event_access')
      .update(accessUpdate)
      .eq('event_id', event.id)
      .eq('user_id', targetUserId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  // Build update data for users table (profile info)
  const userUpdate: Record<string, any> = {}
  if (body.displayName !== undefined) userUpdate.display_name = body.displayName
  if (body.email !== undefined) userUpdate.email = body.email
  if (body.payoutAddress !== undefined) userUpdate.payout_address = body.payoutAddress

  // Update users table if there are profile fields to update
  if (Object.keys(userUpdate).length > 0) {
    const { error: userError } = await adminClient
      .from('users')
      .update(userUpdate)
      .eq('id', targetUserId)

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/events/:slug/access/:userId - Remove access for a user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
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
  const currentUserId = payload.sub as string

  const { slug, userId: targetUserId } = await params
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
    .eq('user_id', currentUserId)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json(
      { error: 'Only event admins can remove access' },
      { status: 403 }
    )
  }

  // Cannot remove own access
  if (targetUserId === currentUserId) {
    return NextResponse.json(
      { error: 'Cannot remove your own access' },
      { status: 400 }
    )
  }

  // Remove access
  const { error: deleteError } = await supabase
    .from('event_access')
    .delete()
    .eq('event_id', event.id)
    .eq('user_id', targetUserId)

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
