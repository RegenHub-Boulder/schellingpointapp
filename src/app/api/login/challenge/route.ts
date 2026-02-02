import { NextResponse } from 'next/server'
import { generateChallenge } from '@/lib/challenge-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { challengeId, challenge } = generateChallenge()
  return NextResponse.json(
    { challengeId, challenge },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
