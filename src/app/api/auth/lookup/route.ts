import { NextRequest, NextResponse } from 'next/server'
import { getUserByCredentialId } from '@/lib/db/users'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credentialId } = body

    if (!credentialId) {
      return NextResponse.json(
        { error: 'Missing credentialId' },
        { status: 400 }
      )
    }

    const user = await getUserByCredentialId(credentialId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Return user info needed to restore passkeyInfo
    return NextResponse.json({
      success: true,
      userId: user.id,
      pubKeyX: user.pubkey_x,
      pubKeyY: user.pubkey_y,
      credentialId: user.credential_id
    })

  } catch (error: unknown) {
    console.error('Lookup error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
