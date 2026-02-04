import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { SCHELLING_POINT_QV_ABI as SCHELLING_POINT_VOTES_ABI } from '@/lib/contracts/SchellingPointQV'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pubKeyX = searchParams.get('pubKeyX')
    const pubKeyY = searchParams.get('pubKeyY')

    // Validate input
    if (!pubKeyX || !pubKeyY) {
      return NextResponse.json(
        { error: 'Missing required query parameters: pubKeyX, pubKeyY' },
        { status: 400 }
      )
    }

    // Connect to contract (read-only, no wallet needed)
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL)
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS!,
      SCHELLING_POINT_VOTES_ABI,
      provider
    )

    // Get nonce from contract
    const nonce = await contract.getNonce([pubKeyX, pubKeyY])

    return NextResponse.json({
      nonce: Number(nonce)
    })
  } catch (error: any) {
    console.error('Nonce retrieval error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
