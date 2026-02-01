import { randomBytes, createHmac } from 'crypto'

const CHALLENGE_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production'
const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Signed challenge approach - no server-side storage needed
// Challenge format: timestamp:nonce:signature

export function generateChallenge(): { challengeId: string; challenge: string } {
  const timestamp = Date.now().toString()
  const nonce = randomBytes(16).toString('hex')
  const challenge = `${timestamp}:${nonce}`

  // Sign the challenge
  const signature = createHmac('sha256', CHALLENGE_SECRET)
    .update(challenge)
    .digest('hex')

  const challengeId = `${challenge}:${signature}`

  // TODO: DIAGNOSTIC - remove after debugging "Invalid or expired challenge" bug
  console.log('[challenge-generate] timestamp:', timestamp)
  console.log('[challenge-generate] nonce:', nonce.substring(0, 8) + '...')
  console.log('[challenge-generate] sig (first 16):', signature.substring(0, 16))
  console.log('[challenge-generate] secret defined:', !!process.env.JWT_SECRET)
  console.log('[challenge-generate] secret length:', CHALLENGE_SECRET.length)

  return { challengeId, challenge: nonce }
}

export function getAndConsumeChallenge(challengeId: string): string | null {
  // Parse challengeId: timestamp:nonce:signature
  const parts = challengeId.split(':')

  // TODO: DIAGNOSTIC - remove after debugging "Invalid or expired challenge" bug
  console.log('[challenge-validate] parts count:', parts.length)
  console.log('[challenge-validate] challengeId length:', challengeId.length)
  console.log('[challenge-validate] secret defined:', !!process.env.JWT_SECRET)
  console.log('[challenge-validate] secret length:', CHALLENGE_SECRET.length)

  if (parts.length !== 3) {
    console.log('[challenge-validate] FAIL: expected 3 parts, got', parts.length)
    return null
  }

  const [timestamp, nonce, signature] = parts
  const challenge = `${timestamp}:${nonce}`

  // Verify signature
  const expectedSignature = createHmac('sha256', CHALLENGE_SECRET)
    .update(challenge)
    .digest('hex')

  // TODO: DIAGNOSTIC - remove after debugging
  console.log('[challenge-validate] timestamp:', timestamp)
  console.log('[challenge-validate] nonce:', nonce.substring(0, 8) + '...')
  console.log('[challenge-validate] signature match:', signature === expectedSignature)
  console.log('[challenge-validate] received sig (first 16):', signature.substring(0, 16))
  console.log('[challenge-validate] expected sig (first 16):', expectedSignature.substring(0, 16))

  if (signature !== expectedSignature) {
    console.log('[challenge-validate] FAIL: signature mismatch')
    return null
  }

  // Check expiry
  const challengeTime = parseInt(timestamp, 10)
  const age = Date.now() - challengeTime
  // TODO: DIAGNOSTIC - remove after debugging
  console.log('[challenge-validate] challenge age ms:', age)
  console.log('[challenge-validate] ttl ms:', CHALLENGE_TTL_MS)
  console.log('[challenge-validate] expired:', age > CHALLENGE_TTL_MS)

  if (age > CHALLENGE_TTL_MS) {
    console.log('[challenge-validate] FAIL: expired (age:', age, 'ms)')
    return null
  }

  console.log('[challenge-validate] SUCCESS')
  return nonce
}
