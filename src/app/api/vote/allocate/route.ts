import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { ethers } from 'ethers'
import { SCHELLING_POINT_QV_ABI, CONTRACT_ADDRESS } from '@/lib/contracts/SchellingPointQV'

export async function POST(request: NextRequest) {
  try {
    // 1. JWT auth - extract from Authorization: Bearer header
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

    // 2. Extract identity from JWT payload
    const { pubKeyX, pubKeyY, signerAddress } = payload

    // 3. Parse body
    const body = await request.json()
    const { eventId, topicIds, credits, signature } = body as {
      eventId: string
      topicIds: string[]
      credits: number[]
      signature: string
    }

    // 4. Validate input
    if (!eventId || !topicIds || !credits || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, topicIds, credits, signature' },
        { status: 400 }
      )
    }

    if (!Array.isArray(topicIds) || !Array.isArray(credits)) {
      return NextResponse.json(
        { error: 'topicIds and credits must be arrays' },
        { status: 400 }
      )
    }

    if (topicIds.length === 0) {
      return NextResponse.json(
        { error: 'topicIds array must not be empty' },
        { status: 400 }
      )
    }

    if (topicIds.length !== credits.length) {
      return NextResponse.json(
        { error: 'topicIds and credits arrays must have the same length' },
        { status: 400 }
      )
    }

    // Validate all credits are non-negative integers
    for (const c of credits) {
      if (!Number.isInteger(c) || c < 0) {
        return NextResponse.json(
          { error: 'All credits must be non-negative integers' },
          { status: 400 }
        )
      }
    }

    // Validate topicIds are valid bytes32 hex strings
    for (const tid of topicIds) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(tid)) {
        return NextResponse.json(
          { error: `Invalid topicId format: ${tid}. Must be bytes32 hex string.` },
          { status: 400 }
        )
      }
    }

    // 5. Connect to contract via relayer wallet
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL)
    const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider)
    const contractAddress = process.env.CONTRACT_ADDRESS || CONTRACT_ADDRESS
    const contract = new ethers.Contract(contractAddress, SCHELLING_POINT_QV_ABI, wallet)

    // 6. Check signer is authorized on-chain
    const identityHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256'],
        [pubKeyX, pubKeyY]
      )
    )

    const signerExpiry = await contract.signers(identityHash, signerAddress)
    const currentTime = Math.floor(Date.now() / 1000)

    if (!signerExpiry || Number(signerExpiry) <= currentTime) {
      return NextResponse.json(
        { error: 'Signer not authorized or session expired' },
        { status: 403 }
      )
    }

    // 7. Call batchAllocate - always use batch even for single allocation
    console.log('Calling batchAllocate with:')
    console.log('  pubKey:', [pubKeyX, pubKeyY])
    console.log('  signer:', signerAddress)
    console.log('  eventId:', eventId)
    console.log('  topicIds:', topicIds)
    console.log('  credits:', credits)

    const tx = await contract.batchAllocate(
      [pubKeyX, pubKeyY],
      signerAddress,
      eventId,
      topicIds,
      credits,
      signature
    )

    // 8. Wait for tx confirmation
    const receipt = await tx.wait()

    console.log('batchAllocate tx mined:', receipt.hash)

    return NextResponse.json({
      success: true,
      txHash: receipt.hash
    })
  } catch (error: unknown) {
    console.error('Allocate error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
