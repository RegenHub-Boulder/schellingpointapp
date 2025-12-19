import { randomBytes } from 'crypto'

// In-memory challenge store (in production, use Redis with TTL)
const challenges = new Map<string, { challenge: string; expires: number }>()

export function generateChallenge(): { challengeId: string; challenge: string } {
  // Generate random challenge
  const challenge = randomBytes(32).toString('hex')
  const challengeId = randomBytes(16).toString('hex')

  // Store with 5-minute expiry
  challenges.set(challengeId, {
    challenge,
    expires: Date.now() + 5 * 60 * 1000
  })

  // Clean up expired challenges
  const now = Date.now()
  challenges.forEach((data, id) => {
    if (data.expires < now) {
      challenges.delete(id)
    }
  })

  return { challengeId, challenge }
}

export function getAndConsumeChallenge(challengeId: string): string | null {
  const data = challenges.get(challengeId)
  if (!data || data.expires < Date.now()) {
    challenges.delete(challengeId)
    return null
  }
  challenges.delete(challengeId)
  return data.challenge
}
