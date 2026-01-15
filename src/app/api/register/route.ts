import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserByEmail, createUser, registerPasskey } from '@/lib/db/users'

export async function POST(request: NextRequest) {
  try {
    // Authenticate via Supabase session cookie
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const email = supabaseUser.email // Trusted from session

    const body = await request.json()
    const { pubKeyX, pubKeyY, credentialId } = body

    // Validate input
    if (!pubKeyX || !pubKeyY || !credentialId) {
      return NextResponse.json(
        { error: 'Missing required fields: pubKeyX, pubKeyY, credentialId' },
        { status: 400 }
      )
    }

    // Find or create user by email
    let user = await getUserByEmail(email)
    if (!user) {
      user = await createUser(email)
    }

    // Register the passkey
    const success = await registerPasskey(user.id, pubKeyX, pubKeyY, credentialId)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to register passkey' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: user.id
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
