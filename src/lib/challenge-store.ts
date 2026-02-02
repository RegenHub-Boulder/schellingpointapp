import { randomBytes, createHmac } from 'crypto'

const CHALLENGE_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production'
const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Signed challenge approach - no server-side storage needed
// Challenge format: timestamp:nonce:signature

export function generateChallenge(): { challengeId: string; challenge: string } {
  const timestamp = Date.now().toString()
  const nonce = randomBytes(16).toString('hex')
  const challenge = `${timestamp}:${nonce}`

  const signature = createHmac('sha256', CHALLENGE_SECRET)
    .update(challenge)
    .digest('hex')

  const challengeId = `${challenge}:${signature}`

  return { challengeId, challenge: nonce }
}

export function getAndConsumeChallenge(challengeId: string): string | null {
  const parts = challengeId.split(':')

  if (parts.length !== 3) {
    console.error('[challenge] invalid format, parts:', parts.length)
    return null
  }

  const [timestamp, nonce, signature] = parts
  const challenge = `${timestamp}:${nonce}`

  const expectedSignature = createHmac('sha256', CHALLENGE_SECRET)
    .update(challenge)
    .digest('hex')

  if (signature !== expectedSignature) {
    console.error('[challenge] signature mismatch')
    return null
  }

  const age = Date.now() - parseInt(timestamp, 10)
  if (age > CHALLENGE_TTL_MS) {
    console.error('[challenge] expired, age:', Math.round(age / 1000), 's')
    return null
  }

  return nonce
}
