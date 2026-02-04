import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { ethers } from 'ethers'
import { SCHELLING_POINT_QV_ABI, CONTRACT_ADDRESS, EVENT_ID } from '@/lib/contracts/SchellingPointQV'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. JWT auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // 2. Get query params
    const { searchParams } = new URL(request.url)
    const topicIdsParam = searchParams.get('topicIds')

    if (!topicIdsParam) {
      return NextResponse.json(
        { error: 'Missing required query parameter: topicIds (comma-separated bytes32 hex strings)' },
        { status: 400 }
      )
    }

    // Parse comma-separated topicIds
    const topicIds = topicIdsParam.split(',').map(t => t.trim()).filter(Boolean)

    if (topicIds.length === 0) {
      return NextResponse.json(
        { error: 'topicIds must contain at least one value' },
        { status: 400 }
      )
    }

    // Validate topicIds format
    for (const tid of topicIds) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(tid)) {
        return NextResponse.json(
          { error: `Invalid topicId format: ${tid}. Must be bytes32 hex string.` },
          { status: 400 }
        )
      }
    }

    // 3. Use pubKeyX/pubKeyY from JWT (the active identity)
    const { pubKeyX, pubKeyY } = payload

    // 4. Connect to contract (read-only)
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL)
    const contractAddress = process.env.CONTRACT_ADDRESS || CONTRACT_ADDRESS
    const contract = new ethers.Contract(contractAddress, SCHELLING_POINT_QV_ABI, provider)

    // 5. Call getAllocations for the JWT's identity
    const allocationValues: bigint[] = await contract.getAllocations(
      [pubKeyX, pubKeyY],
      EVENT_ID,
      topicIds
    )

    // 6. Call getRemainingBudget
    const remainingBudget: bigint = await contract.getRemainingBudget(
      [pubKeyX, pubKeyY],
      EVENT_ID
    )

    // 7. Build allocations map: topicId -> credits
    const allocations: Record<string, number> = {}
    for (let i = 0; i < topicIds.length; i++) {
      allocations[topicIds[i]] = Number(allocationValues[i])
    }

    return NextResponse.json({
      allocations,
      remainingBudget: Number(remainingBudget)
    })
  } catch (error: unknown) {
    console.error('Get votes error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
