import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyJWT } from '@/lib/jwt'

// GET /api/events/:slug/votes/me - Get current user's votes and balance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
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
  const userId = payload.sub as string

  const { slug } = await params
  const supabase = await createClient()

  // Get the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, pre_vote_credits')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  const maxCredits = event.pre_vote_credits || 100

  // Get user's votes
  // Note: pre_votes table not yet in generated types, using type assertion
  const { data: votes, error: votesError } = await (supabase as any)
    .from('pre_votes')
    .select(`
      session_id,
      vote_count,
      credits_spent,
      updated_at,
      session:sessions(
        id,
        title,
        format,
        duration
      )
    `)
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (votesError) {
    return NextResponse.json(
      { error: votesError.message },
      { status: 500 }
    )
  }

  // Get user's balance
  // Note: user_pre_vote_balance table not yet in generated types
  const { data: balance } = await (supabase as any)
    .from('user_pre_vote_balance')
    .select('credits_spent, credits_remaining')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .single()

  // Transform votes to include session info
  const transformedVotes = votes?.map((vote: any) => ({
    sessionId: vote.session_id,
    voteCount: vote.vote_count,
    creditsSpent: vote.credits_spent,
    updatedAt: vote.updated_at,
    session: vote.session,
  })) || []

  return NextResponse.json({
    votes: transformedVotes,
    balance: {
      creditsSpent: balance?.credits_spent || 0,
      creditsRemaining: balance?.credits_remaining || maxCredits,
      totalCredits: maxCredits,
    },
    summary: {
      totalVotes: transformedVotes.reduce((sum: number, v: any) => sum + v.voteCount, 0),
      sessionsVoted: transformedVotes.length,
    }
  })
}
