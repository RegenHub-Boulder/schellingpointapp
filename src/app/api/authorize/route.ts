import { NextRequest, NextResponse } from 'next/server'
import { getUserByPasskey } from '@/lib/db/users'
import { ethers } from 'ethers'
import { SCHELLING_POINT_VOTES_ABI } from '@/lib/contracts/SchellingPointVotes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      pubKeyX,
      pubKeyY,
      signer,
      expiry,
      authenticatorData,  // hex string
      clientDataJSON,     // raw JSON string
      r,                  // hex string
      s                   // hex string
    } = body

    // Validate input
    if (!pubKeyX || !pubKeyY || !signer || !expiry || !authenticatorData || !clientDataJSON || !r || !s) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    console.log('Calling authorizeSigner with:')
    console.log('  pubKey:', [pubKeyX, pubKeyY])
    console.log('  signer:', signer)
    console.log('  expiry:', expiry)
    console.log('  authenticatorData:', authenticatorData.slice(0, 40) + '...')
    console.log('  clientDataJSON:', clientDataJSON.slice(0, 60) + '...')
    console.log('  r:', r)
    console.log('  s:', s)

    // Call authorizeSigner on contract
    const tx = await contract.authorizeSigner(
      [pubKeyX, pubKeyY],
      signer,
      expiry,
      authenticatorData,
      clientDataJSON,
      r,
      s
    )

    // Wait for transaction to be mined
    const receipt = await tx.wait()

    // Verify authorization is readable on-chain before returning
    // This handles RPC read-replica lag
    const identityHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256'],
        [pubKeyX, pubKeyY]
      )
    )

    let verified = false
    for (let i = 0; i < 5; i++) {
      const storedExpiry = await contract.signers(identityHash, signer)
      if (storedExpiry && Number(storedExpiry) === expiry) {
        verified = true
        break
      }
      // Wait 500ms before retry
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!verified) {
      console.warn('Authorization tx mined but state not yet readable, proceeding anyway')
    }

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
