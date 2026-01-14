import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// POST /api/events/:slug/votes - Cast or update a vote
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
  const { sessionId, voteCount } = body

  if (!sessionId || voteCount === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: sessionId, voteCount' },
      { status: 400 }
    )
  }

  if (voteCount < 0 || voteCount > 10) {
    return NextResponse.json(
      { error: 'Vote count must be between 0 and 10' },
      { status: 400 }
    )
  }

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
    .select('id, pre_vote_credits, pre_vote_deadline')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  // Check if voting is still open
  if (event.pre_vote_deadline && new Date(event.pre_vote_deadline) < new Date()) {
    return NextResponse.json(
      { error: 'Voting period has ended' },
      { status: 400 }
    )
  }

  // Check if session exists and is approved
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('id', sessionId)
    .eq('event_id', event.id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    )
  }

  if (session.status !== 'approved') {
    return NextResponse.json(
      { error: 'Can only vote on approved sessions' },
      { status: 400 }
    )
  }

  // Calculate credits for this vote (quadratic)
  const creditsForVote = voteCount * voteCount

  // Get user's current balance
  // Note: tables not yet in generated types, using type assertion
  const { data: balance } = await (supabase as any)
    .from('user_pre_vote_balance')
    .select('credits_spent, credits_remaining')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  // Get user's current vote on this session (if any)
  const { data: existingVote } = await (supabase as any)
    .from('pre_votes')
    .select('vote_count, credits_spent')
    .eq('event_id', event.id)
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single()

  const maxCredits = event.pre_vote_credits || 100
  const currentSpent = balance?.credits_spent || 0
  const creditsFromExistingVote = existingVote?.credits_spent || 0

  // Calculate if user has enough credits
  const netCreditsNeeded = creditsForVote - creditsFromExistingVote
  const availableCredits = maxCredits - currentSpent + creditsFromExistingVote

  if (creditsForVote > availableCredits) {
    return NextResponse.json(
      { error: `Not enough credits. Need ${creditsForVote}, have ${availableCredits}` },
      { status: 400 }
    )
  }

  // Upsert the vote
  if (voteCount === 0) {
    // Delete the vote if voteCount is 0
    await (supabase as any)
      .from('pre_votes')
      .delete()
      .eq('event_id', event.id)
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
  } else {
    // Insert or update the vote
    const { error: voteError } = await (supabase as any)
      .from('pre_votes')
      .upsert({
        event_id: event.id,
        session_id: sessionId,
        user_id: user.id,
        vote_count: voteCount,
        credits_spent: creditsForVote,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'event_id,session_id,user_id'
      })

    if (voteError) {
      return NextResponse.json(
        { error: voteError.message },
        { status: 500 }
      )
    }
  }

  // Get updated balance
  const { data: updatedBalance } = await (supabase as any)
    .from('user_pre_vote_balance')
    .select('credits_spent, credits_remaining')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    success: true,
    vote: {
      sessionId,
      voteCount,
      creditsSpent: creditsForVote,
    },
    balance: {
      creditsSpent: updatedBalance?.credits_spent || 0,
      creditsRemaining: updatedBalance?.credits_remaining || maxCredits,
      totalCredits: maxCredits,
    }
  })
}
