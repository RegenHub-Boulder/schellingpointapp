import { NextRequest, NextResponse } from 'next/server'
import { getUserByPasskey } from '@/lib/db/users'
import { ethers } from 'ethers'
import { SCHELLING_POINT_VOTES_ABI } from '@/lib/contracts/SchellingPointVotes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pubKeyX, pubKeyY, signer, topicId, value, signature } = body

    // Validate input
    if (!pubKeyX || !pubKeyY || !signer || !topicId || value === undefined || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: pubKeyX, pubKeyY, signer, topicId, value, signature' },
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

    // Gate 2: Check signer is authorized on-chain
    // Calculate identity hash (keccak256 of pubkey)
    const identityHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256'],
        [pubKeyX, pubKeyY]
      )
    )

    console.log('Vote check:')
    console.log('  identityHash:', identityHash)
    console.log('  signer:', signer)

    const signerExpiry = await contract.signers(identityHash, signer)
    const currentTime = Math.floor(Date.now() / 1000)

    console.log('  expiry:', signerExpiry.toString())
    console.log('  currentTime:', currentTime)

    if (!signerExpiry || Number(signerExpiry) <= currentTime) {
      return NextResponse.json(
        { error: 'Signer not authorized or authorization expired' },
        { status: 403 }
      )
    }

    // Call vote on contract
    const tx = await contract.vote(
      [pubKeyX, pubKeyY],
      signer,
      topicId,
      value,
      signature
    )

    // Wait for transaction to be mined
    const receipt = await tx.wait()

    return NextResponse.json({
      success: true,
      txHash: receipt.hash
    })
  } catch (error: any) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
