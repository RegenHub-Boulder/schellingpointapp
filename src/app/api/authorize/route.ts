import { NextRequest, NextResponse } from 'next/server'
import { getUserByPasskey } from '@/lib/db/users'
import { ethers } from 'ethers'
import { SCHELLING_POINT_VOTES_ABI } from '@/lib/contracts/SchellingPointVotes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pubKeyX, pubKeyY, signer, expiry, signature } = body

    // Validate input
    if (!pubKeyX || !pubKeyY || !signer || !expiry || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: pubKeyX, pubKeyY, signer, expiry, signature' },
        { status: 400 }
      )
    }

    // Gate 1: Check passkey is registered in DB
    const user = await getUserByPasskey(pubKeyX, pubKeyY)
    if (!user) {
      return NextResponse.json(
        { error: 'Passkey not registered' },
        { status: 401 }
      )
    }

    // Connect to contract
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL)
    const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider)
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS!,
      SCHELLING_POINT_VOTES_ABI,
      wallet
    )

    // Call authorizeSigner on contract
    const tx = await contract.authorizeSigner(
      [pubKeyX, pubKeyY],
      signer,
      expiry,
      signature
    )

    // Wait for transaction to be mined
    const receipt = await tx.wait()

    return NextResponse.json({
      success: true,
      txHash: receipt.hash
    })
  } catch (error: any) {
    console.error('Authorization error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
