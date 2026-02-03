import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getUserByPasskey } from '@/lib/db/users'
import { signJWT } from '@/lib/jwt'
import { SCHELLING_POINT_QV_ABI as SCHELLING_POINT_VOTES_ABI } from '@/lib/contracts/SchellingPointQV'
import { getAndConsumeChallenge } from '@/lib/challenge-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pubKeyX, pubKeyY, signer, challengeId, signature } = body

    // Validate required fields
    if (!pubKeyX || !pubKeyY || !signer || !challengeId || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: pubKeyX, pubKeyY, signer, challengeId, signature' },
        { status: 400 }
      )
    }

    // Step 1: Verify challenge exists and hasn't expired
    const challenge = getAndConsumeChallenge(challengeId)
    if (!challenge) {
      return NextResponse.json(
        { error: 'Invalid or expired challenge' },
        { status: 401 }
      )
    }

    // Step 2: Verify signature over challenge
    // Message format: keccak256("login:" + challenge)
    const messageHash = ethers.keccak256(
      ethers.toUtf8Bytes(`login:${challenge}`)
    )

    const recoveredAddress = ethers.recoverAddress(messageHash, signature)
    if (recoveredAddress.toLowerCase() !== signer.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Step 3: Gate 1 - Check passkey is registered in DB
    const user = await getUserByPasskey(pubKeyX, pubKeyY)
    if (!user) {
      return NextResponse.json(
        { error: 'Passkey not registered' },
        { status: 401 }
      )
    }

    // Step 4: Gate 2 - Check signer is authorized on-chain
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL)
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS!,
      SCHELLING_POINT_VOTES_ABI,
      provider
    )

    const identityHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256'],
        [pubKeyX, pubKeyY]
      )
    )

    const signerExpiry = await contract.signers(identityHash, signer)
    const currentTime = Math.floor(Date.now() / 1000)

    if (!signerExpiry || Number(signerExpiry) <= currentTime) {
      return NextResponse.json(
        { error: 'Signer not authorized or expired' },
        { status: 403 }
      )
    }

    // Step 5: Generate JWT
    const token = await signJWT({
      sub: user.id,
      pubKeyX,
      pubKeyY,
      displayName: user.display_name || undefined,
      email: user.email || undefined,
      signerAddress: signer,
      signerExpiry: Number(signerExpiry)
    })

    // Return JWT and user info
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        payoutAddress: user.payout_address
      }
    })

  } catch (error: unknown) {
    console.error('Login error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
