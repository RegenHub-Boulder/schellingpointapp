import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// GET /api/events/:slug/settings - Get event settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const adminClient = await createAdminClient()

    // Get event settings
    const { data: event, error } = await adminClient
      .from('events')
      .select(`
        id,
        name,
        description,
        start_date,
        end_date,
        location,
        pre_vote_credits,
        attendance_vote_credits,
        pre_vote_deadline,
        proposal_deadline,
        voting_opens_at,
        total_budget_pool,
        platform_fee_percent,
        payment_token_symbol,
        treasury_wallet_address,
        schedule_locked,
        schedule_published,
        distribution_executed
      `)
      .eq('slug', slug)
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Transform to frontend-friendly format
    return NextResponse.json({
      settings: {
        // Event Info
        eventName: event.name,
        description: event.description,
        startDate: event.start_date,
        endDate: event.end_date,
        location: event.location,

        // Voting Settings
        preVoteCredits: event.pre_vote_credits || 100,
        attendanceVoteCredits: event.attendance_vote_credits || 100,
        preVoteDeadline: event.pre_vote_deadline,
        proposalDeadline: event.proposal_deadline,
        votingOpensAt: event.voting_opens_at,

        // Budget Settings
        totalBudgetPool: event.total_budget_pool || 0,
        platformFeePercent: event.platform_fee_percent || 5,
        paymentTokenSymbol: event.payment_token_symbol || 'USDC',
        treasuryWalletAddress: event.treasury_wallet_address,

        // Status Flags
        scheduleLocked: event.schedule_locked || false,
        schedulePublished: event.schedule_published || false,
        distributionExecuted: event.distribution_executed || false,
      },
    })

  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/events/:slug/settings - Update event settings
export async function PATCH(
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

    // Verify user is admin for this event
    const { data: accessRecord } = await adminClient
      .from('event_access')
      .select('is_admin')
      .eq('event_id', event.id)
      .eq('user_id', userId)
      .single()

    if (!accessRecord?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Map frontend field names to database columns
    const updateData: Record<string, any> = {}

    // Event Info
    if (body.eventName !== undefined) updateData.name = body.eventName
    if (body.description !== undefined) updateData.description = body.description
    if (body.startDate !== undefined) updateData.start_date = body.startDate
    if (body.endDate !== undefined) updateData.end_date = body.endDate
    if (body.location !== undefined) updateData.location = body.location

    // Voting Settings
    if (body.preVoteCredits !== undefined) updateData.pre_vote_credits = body.preVoteCredits
    if (body.attendanceVoteCredits !== undefined) updateData.attendance_vote_credits = body.attendanceVoteCredits
    if (body.preVoteDeadline !== undefined) updateData.pre_vote_deadline = body.preVoteDeadline
    if (body.proposalDeadline !== undefined) updateData.proposal_deadline = body.proposalDeadline
    if (body.votingOpensAt !== undefined) updateData.voting_opens_at = body.votingOpensAt

    // Budget Settings
    if (body.totalBudgetPool !== undefined) updateData.total_budget_pool = body.totalBudgetPool
    if (body.platformFeePercent !== undefined) updateData.platform_fee_percent = body.platformFeePercent
    if (body.paymentTokenSymbol !== undefined) updateData.payment_token_symbol = body.paymentTokenSymbol
    if (body.treasuryWalletAddress !== undefined) updateData.treasury_wallet_address = body.treasuryWalletAddress

    // Status Flags
    if (body.scheduleLocked !== undefined) updateData.schedule_locked = body.scheduleLocked
    if (body.schedulePublished !== undefined) updateData.schedule_published = body.schedulePublished

    // Only update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Add updated_at
    updateData.updated_at = new Date().toISOString()

    // Update the event
    const { error: updateError } = await adminClient
      .from('events')
      .update(updateData)
      .eq('id', event.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: Object.keys(updateData) })

  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
