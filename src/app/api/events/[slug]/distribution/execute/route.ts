import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// POST /api/events/:slug/distribution/execute - Execute the budget distribution
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

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient()

    // Get the event
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, total_budget_pool, platform_fee_percent, treasury_wallet_address, payment_token_symbol')
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

    // Check if distribution already executed
    const { data: existingDistribution } = await adminClient
      .from('distributions')
      .select('id, status')
      .eq('event_id', event.id)
      .eq('status', 'completed')
      .single()

    if (existingDistribution) {
      return NextResponse.json(
        { error: 'Distribution already completed for this event' },
        { status: 400 }
      )
    }

    // Get all scheduled sessions with attendance stats
    const { data: sessions, error: sessionsError } = await adminClient
      .from('sessions')
      .select(`
        id,
        title,
        session_hosts (
          user_id,
          is_primary,
          status,
          user:users (
            id,
            payout_address,
            display_name
          )
        ),
        attendance_stats:session_attendance_stats (
          total_votes,
          qf_score
        )
      `)
      .eq('event_id', event.id)
      .eq('status', 'scheduled')

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    // Filter sessions with attendance votes
    const sessionsWithVotes = sessions?.filter(s => {
      const stats = s.attendance_stats as { total_votes: number; qf_score: number } | null
      return stats && stats.total_votes > 0
    }) || []

    if (sessionsWithVotes.length === 0) {
      return NextResponse.json(
        { error: 'No sessions with attendance votes to distribute to' },
        { status: 400 }
      )
    }

    // Calculate distribution
    const totalPool = event.total_budget_pool || 0
    const platformFeePercent = event.platform_fee_percent || 5
    const platformFee = Math.round(totalPool * platformFeePercent / 100)
    const distributableAmount = totalPool - platformFee

    // Calculate total QF score
    const totalQfScore = sessionsWithVotes.reduce((sum, s) => {
      const stats = s.attendance_stats as { qf_score: number } | null
      return sum + (stats?.qf_score || 0)
    }, 0)

    if (totalQfScore === 0) {
      return NextResponse.json(
        { error: 'No QF scores calculated yet' },
        { status: 400 }
      )
    }

    // Create distribution record
    const { data: distribution, error: distError } = await adminClient
      .from('distributions')
      .insert({
        event_id: event.id,
        total_pool: totalPool,
        platform_fee: platformFee,
        distributable_amount: distributableAmount,
        status: 'processing',
      })
      .select()
      .single()

    if (distError || !distribution) {
      return NextResponse.json({ error: 'Failed to create distribution record' }, { status: 500 })
    }

    // Calculate and create distribution items for each session
    const distributionItems = []
    for (const session of sessionsWithVotes) {
      const stats = session.attendance_stats as { qf_score: number } | null
      const qfScore = stats?.qf_score || 0
      const percentage = (qfScore / totalQfScore) * 100
      const amount = Math.round(distributableAmount * (qfScore / totalQfScore))

      // Get primary host's payout address
      const hosts = session.session_hosts as Array<{
        user_id: string | null
        is_primary: boolean | null
        status: string | null
        user: { id: string; payout_address: string | null; display_name: string | null } | null
      }> | null

      const primaryHost = hosts?.find(h => h.is_primary && h.status === 'accepted')
      const recipientAddress = primaryHost?.user?.payout_address || event.treasury_wallet_address || '0x0000000000000000000000000000000000000000'

      distributionItems.push({
        distribution_id: distribution.id,
        session_id: session.id,
        qf_score: qfScore,
        percentage: Math.round(percentage * 10) / 10,
        amount,
        recipient_address: recipientAddress,
      })
    }

    // Insert all distribution items
    const { error: itemsError } = await adminClient
      .from('distribution_items')
      .insert(distributionItems)

    if (itemsError) {
      // Rollback distribution record
      await adminClient.from('distributions').delete().eq('id', distribution.id)
      return NextResponse.json({ error: 'Failed to create distribution items' }, { status: 500 })
    }

    // In a production system, this is where you would:
    // 1. Call a smart contract to execute batch payments
    // 2. Wait for transaction confirmation
    // 3. Store the transaction hash

    // For now, we simulate a successful execution
    // TODO: Integrate with actual on-chain distribution
    const simulatedTxHash = `0x${Date.now().toString(16)}${'0'.repeat(48)}`

    // Update distribution as completed
    const { error: updateError } = await adminClient
      .from('distributions')
      .update({
        status: 'completed',
        executed_at: new Date().toISOString(),
        tx_hash: simulatedTxHash,
      })
      .eq('id', distribution.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update distribution status' }, { status: 500 })
    }

    // Return success with distribution details
    return NextResponse.json({
      success: true,
      distribution: {
        id: distribution.id,
        totalPool,
        platformFee,
        distributableAmount,
        recipientCount: distributionItems.length,
        txHash: simulatedTxHash,
        items: distributionItems.map(item => ({
          sessionId: item.session_id,
          amount: item.amount,
          percentage: item.percentage,
          recipientAddress: item.recipient_address,
        })),
      },
    })

  } catch (error) {
    console.error('Distribution execution error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/events/:slug/distribution/execute - Get distribution status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
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

    // Get distribution with items
    const { data: distribution, error: distError } = await adminClient
      .from('distributions')
      .select(`
        *,
        items:distribution_items (
          id,
          session_id,
          qf_score,
          percentage,
          amount,
          recipient_address,
          session:sessions (
            title
          )
        )
      `)
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (distError && distError.code !== 'PGRST116') {
      return NextResponse.json({ error: distError.message }, { status: 500 })
    }

    if (!distribution) {
      return NextResponse.json({ distribution: null })
    }

    return NextResponse.json({ distribution })

  } catch (error) {
    console.error('Get distribution error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
