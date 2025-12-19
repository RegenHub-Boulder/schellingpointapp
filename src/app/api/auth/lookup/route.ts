import { NextRequest, NextResponse } from 'next/server'
import { getUserWithPasskeyByCredentialId } from '@/lib/db/users'

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

    const result = await getUserWithPasskeyByCredentialId(credentialId)
    if (!result) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Return user and passkey info needed to restore passkeyInfo
    return NextResponse.json({
      success: true,
      userId: result.user.id,
      pubKeyX: result.passkey.pubkey_x,
      pubKeyY: result.passkey.pubkey_y,
      credentialId: result.passkey.credential_id
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
