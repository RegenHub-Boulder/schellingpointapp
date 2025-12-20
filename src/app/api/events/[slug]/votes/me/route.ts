import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/events/:slug/votes/me - Get current user's votes and balance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
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
  const { data: votes, error: votesError } = await supabase
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
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (votesError) {
    return NextResponse.json(
      { error: votesError.message },
      { status: 500 }
    )
  }

  // Get user's balance
  const { data: balance } = await supabase
    .from('user_pre_vote_balance')
    .select('credits_spent, credits_remaining')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  // Transform votes to include session info
  const transformedVotes = votes?.map(vote => ({
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
      totalVotes: transformedVotes.reduce((sum, v) => sum + v.voteCount, 0),
      sessionsVoted: transformedVotes.length,
    }
  })
}
