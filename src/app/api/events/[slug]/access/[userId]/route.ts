import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

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
