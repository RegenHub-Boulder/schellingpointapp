import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { getUserByPasskey } from '@/lib/db/users'

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Optionally refresh user data from DB
    const user = await getUserByPasskey(payload.pubKeyX, payload.pubKeyY)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        payoutAddress: user.payout_address
      },
      signerAddress: payload.signerAddress,
      signerExpiry: payload.signerExpiry
    })

  } catch (error: unknown) {
    console.error('Auth check error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
