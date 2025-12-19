import { SignJWT, jwtVerify, errors } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-change-in-production')
const JWT_ISSUER = 'schelling-point'
const JWT_AUDIENCE = 'schelling-point-app'

export interface JWTPayload {
  sub: string           // user.id
  pubKeyX: string       // passkey X coordinate
  pubKeyY: string       // passkey Y coordinate
  displayName?: string  // user.display_name
  email?: string        // user.email
  signerAddress: string // ephemeral signer address
  signerExpiry: number  // when signer expires (unix timestamp)
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    return payload as unknown as JWTPayload
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      console.log('JWT expired')
    }
    return null
  }
}
