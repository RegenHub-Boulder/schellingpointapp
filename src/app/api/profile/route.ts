import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { createClient } from '@/lib/supabase/server'

export interface ProfileData {
  id: string
  email: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  topics: string[] | null
  smartWalletAddress: string | null
  ensAddress: string | null
  payoutAddress: string | null
  createdAt: string
  updatedAt: string
}

// GET /api/profile - Get current user's profile
export async function GET(request: NextRequest) {
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

  const supabase = await createClient()

  // Get user profile by ID
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    // User might not have a profile yet - return basic info from JWT
    if (error.code === 'PGRST116') {
      return NextResponse.json({
        profile: {
          id: userId,
          email: payload.email || null,
          displayName: payload.displayName || null,
          bio: null,
          avatarUrl: null,
          topics: null,
          smartWalletAddress: null,
          ensAddress: null,
          payoutAddress: null,
          createdAt: null,
          updatedAt: null,
        }
      })
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      topics: profile.topics,
      smartWalletAddress: profile.smart_wallet_address,
      ensAddress: profile.ens_address,
      payoutAddress: profile.payout_address,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }
  })
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
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

  const supabase = await createClient()

  const body = await request.json()
  const { displayName, bio, avatarUrl, topics, payoutAddress, ensAddress } = body

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {}
  if (displayName !== undefined) updateData.display_name = displayName
  if (bio !== undefined) updateData.bio = bio
  if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl
  if (topics !== undefined) updateData.topics = topics
  if (payoutAddress !== undefined) updateData.payout_address = payoutAddress
  if (ensAddress !== undefined) updateData.ens_address = ensAddress

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No fields to update' },
      { status: 400 }
    )
  }

  // Check if user profile exists
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  let profile
  let error

  if (existingProfile) {
    // Update existing profile
    const result = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()
    profile = result.data
    error = result.error
  } else {
    // Create new profile - need to generate a smart wallet address placeholder
    // In production, this would be a real smart wallet creation
    // Note: email is required in the database schema
    if (!payload.email) {
      return NextResponse.json(
        { error: 'Email is required to create a profile' },
        { status: 400 }
      )
    }
    const result = await supabase
      .from('users')
      .insert({
        id: userId,
        email: payload.email,
        smart_wallet_address: `0x${userId.replace(/-/g, '')}`, // Placeholder
        ...updateData,
      })
      .select()
      .single()
    profile = result.data
    error = result.error
  }

  if (error || !profile) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      topics: profile.topics,
      smartWalletAddress: profile.smart_wallet_address,
      ensAddress: profile.ens_address,
      payoutAddress: profile.payout_address,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }
  })
}
