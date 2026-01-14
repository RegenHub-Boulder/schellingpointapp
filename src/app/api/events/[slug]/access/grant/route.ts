import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// POST /api/events/:slug/access/grant - Grant access to a user (admin only)
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

  const { email, walletAddress, isAdmin = false } = body

  if (!email && !walletAddress) {
    return NextResponse.json(
      { error: 'Either email or walletAddress is required' },
      { status: 400 }
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
      { error: 'Only event admins can grant access' },
      { status: 403 }
    )
  }

  // Try to find existing user by email or wallet
  let targetUserId: string | null = null

  if (email) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      targetUserId = existingUser.id
    }
  }

  if (!targetUserId && walletAddress) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('smart_wallet_address', walletAddress)
      .single()

    if (existingUser) {
      targetUserId = existingUser.id
    }
  }

  // Check if access already exists
  if (targetUserId) {
    const { data: existingAccess } = await supabase
      .from('event_access')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', targetUserId)
      .single()

    if (existingAccess) {
      // Update existing access
      const { data: updatedAccess, error: updateError } = await supabase
        .from('event_access')
        .update({
          access_granted: true,
          is_admin: isAdmin
        })
        .eq('id', existingAccess.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ access: updatedAccess })
    }
  }

  // Create new access record
  const accessData: Record<string, unknown> = {
    event_id: event.id,
    access_granted: true,
    is_admin: isAdmin
  }

  if (targetUserId) {
    accessData.user_id = targetUserId
  }
  if (email) {
    accessData.email = email
  }
  if (walletAddress) {
    accessData.wallet_address = walletAddress
  }

  const { data: newAccess, error: insertError } = await supabase
    .from('event_access')
    .insert(accessData)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ access: newAccess }, { status: 201 })
}
