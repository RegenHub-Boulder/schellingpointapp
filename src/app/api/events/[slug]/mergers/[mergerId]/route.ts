import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ slug: string; mergerId: string }>
}

// PATCH /api/events/:slug/mergers/:mergerId - Update merger request status
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient()
  const { slug, mergerId } = await context.params

  // Get current user (admin only)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Get event by slug
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check if user is admin for this event
  const { data: access } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!access?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { status, responseMessage } = body

  const validStatuses = ['pending', 'accepted', 'declined', 'counter-proposed', 'executed']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Update merger request
  const updateData: Record<string, unknown> = {}
  if (status) {
    updateData.status = status
    updateData.responded_at = new Date().toISOString()
  }
  if (responseMessage !== undefined) {
    updateData.response_message = responseMessage
  }

  const { data: merger, error: mergerError } = await supabase
    .from('merger_requests')
    .update(updateData)
    .eq('id', mergerId)
    .eq('event_id', event.id)
    .select()
    .single()

  if (mergerError) {
    console.error('Error updating merger:', mergerError)
    return NextResponse.json({ error: 'Failed to update merger request' }, { status: 500 })
  }

  return NextResponse.json({ merger })
}

// DELETE /api/events/:slug/mergers/:mergerId - Delete merger request
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient()
  const { slug, mergerId } = await context.params

  // Get current user (admin only)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Get event by slug
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check if user is admin for this event
  const { data: access } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!access?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Delete merger request
  const { error: deleteError } = await supabase
    .from('merger_requests')
    .delete()
    .eq('id', mergerId)
    .eq('event_id', event.id)

  if (deleteError) {
    console.error('Error deleting merger:', deleteError)
    return NextResponse.json({ error: 'Failed to delete merger request' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
