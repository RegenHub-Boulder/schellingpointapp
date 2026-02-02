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
  console.log('[challenge-generate]', JSON.stringify({
    timestamp,
    nonce: nonce.substring(0, 8),
    sig: signature.substring(0, 16),
    secretDefined: !!process.env.JWT_SECRET,
    secretLen: CHALLENGE_SECRET.length
  }))

  return { challengeId, challenge: nonce }
}

export function getAndConsumeChallenge(challengeId: string): string | null {
  const parts = challengeId.split(':')

  if (parts.length !== 3) {
    // TODO: DIAGNOSTIC - remove after debugging
    console.log('[challenge-validate] FAIL', JSON.stringify({
      reason: 'wrong part count',
      parts: parts.length,
      idLen: challengeId.length
    }))
    return null
  }

  const [timestamp, nonce, signature] = parts
  const challenge = `${timestamp}:${nonce}`

  const expectedSignature = createHmac('sha256', CHALLENGE_SECRET)
    .update(challenge)
    .digest('hex')

  const challengeTime = parseInt(timestamp, 10)
  const age = Date.now() - challengeTime
  const sigMatch = signature === expectedSignature

  // TODO: DIAGNOSTIC - remove after debugging
  console.log('[challenge-validate]', JSON.stringify({
    sigMatch,
    receivedSig: signature.substring(0, 16),
    expectedSig: expectedSignature.substring(0, 16),
    ageMs: age,
    expired: age > CHALLENGE_TTL_MS,
    secretDefined: !!process.env.JWT_SECRET,
    secretLen: CHALLENGE_SECRET.length
  }))

  if (!sigMatch) {
    return null
  }

  if (age > CHALLENGE_TTL_MS) {
    return null
  }

  return nonce
}
