import { NextRequest, NextResponse } from 'next/server'
import { getUserByInviteCode, registerPasskey } from '@/lib/db/users'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, pubKeyX, pubKeyY, credentialId } = body

    // Validate input
    if (!code || !pubKeyX || !pubKeyY || !credentialId) {
      return NextResponse.json(
        { error: 'Missing required fields: code, pubKeyX, pubKeyY, credentialId' },
        { status: 400 }
      )
    }

    // Validate invite code and check if not already registered
    const user = await getUserByInviteCode(code)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid invite code or already used' },
        { status: 401 }
      )
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
