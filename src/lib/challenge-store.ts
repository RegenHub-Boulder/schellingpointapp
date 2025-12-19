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

  return { challengeId, challenge: nonce }
}

export function getAndConsumeChallenge(challengeId: string): string | null {
  // Parse challengeId: timestamp:nonce:signature
  const parts = challengeId.split(':')
  if (parts.length !== 3) {
    return null
  }

  const [timestamp, nonce, signature] = parts
  const challenge = `${timestamp}:${nonce}`

  // Verify signature
  const expectedSignature = createHmac('sha256', CHALLENGE_SECRET)
    .update(challenge)
    .digest('hex')

  if (signature !== expectedSignature) {
    console.log('Challenge signature mismatch')
    return null
  }

  // Check expiry
  const challengeTime = parseInt(timestamp, 10)
  if (Date.now() - challengeTime > CHALLENGE_TTL_MS) {
    console.log('Challenge expired')
    return null
  }

  return nonce
}
