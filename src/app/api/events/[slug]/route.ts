import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// GET /api/events/:slug - Get event details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  // Transform to match expected format
  const response = {
    event: {
      id: event.id,
      slug: event.slug,
      name: event.name,
      description: event.description,
      startDate: event.start_date,
      endDate: event.end_date,
      location: event.location,
      bannerImageUrl: event.banner_image_url,
      schedulePublished: event.schedule_published,
      scheduleLocked: event.schedule_locked,
      distributionExecuted: event.distribution_executed,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    },
    accessMode: {
      mode: event.access_mode,
      nftContractAddress: event.nft_contract_address,
      nftChainId: event.nft_chain_id
    },
    votingConfig: {
      preVoteCredits: event.pre_vote_credits,
      attendanceVoteCredits: event.attendance_vote_credits,
      proposalDeadline: event.proposal_deadline,
      preVoteDeadline: event.pre_vote_deadline,
      votingOpensAt: event.voting_opens_at
    },
    budgetConfig: {
      totalBudgetPool: event.total_budget_pool,
      paymentTokenAddress: event.payment_token_address,
      paymentTokenSymbol: event.payment_token_symbol,
      platformFeePercent: event.platform_fee_percent,
      treasuryWalletAddress: event.treasury_wallet_address
    }
  }

  return NextResponse.json(response)
}

// PATCH /api/events/:slug - Update event configuration (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // JWT validation
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const jwtPayload = await verifyJWT(token)
  if (!jwtPayload) {
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

  // Get the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, schedule_locked')
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
      { error: 'Only event admins can update event configuration' },
      { status: 403 }
    )
  }

  // Build update object - map camelCase to snake_case
  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    startDate: 'start_date',
    endDate: 'end_date',
    location: 'location',
    bannerImageUrl: 'banner_image_url',
    accessMode: 'access_mode',
    nftContractAddress: 'nft_contract_address',
    nftChainId: 'nft_chain_id',
    preVoteCredits: 'pre_vote_credits',
    attendanceVoteCredits: 'attendance_vote_credits',
    proposalDeadline: 'proposal_deadline',
    preVoteDeadline: 'pre_vote_deadline',
    votingOpensAt: 'voting_opens_at',
    totalBudgetPool: 'total_budget_pool',
    paymentTokenAddress: 'payment_token_address',
    paymentTokenSymbol: 'payment_token_symbol',
    platformFeePercent: 'platform_fee_percent',
    treasuryWalletAddress: 'treasury_wallet_address'
  }

  const updateData: Record<string, unknown> = {}
  for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
    if (body[camelKey] !== undefined) {
      updateData[snakeKey] = body[camelKey]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  // Validate access_mode if provided
  if (updateData.access_mode) {
    const validModes = ['open', 'email_whitelist', 'nft_gated']
    if (!validModes.includes(updateData.access_mode as string)) {
      return NextResponse.json(
        { error: `Invalid access mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }
  }

  // Update the event
  const { data: updatedEvent, error: updateError } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', event.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ event: updatedEvent })
}
