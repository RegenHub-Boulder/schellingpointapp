'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fingerprint } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/layout/container'
import { extractPublicKey, arrayBufferToBase64Url } from '@/lib/webauthn'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const inviteCode = searchParams.get('code')

  React.useEffect(() => {
    if (!inviteCode) {
      setError('No invite code provided')
    }
  }, [inviteCode])

  const handleCreatePasskey = async () => {
    if (!inviteCode) {
      setError('No invite code provided')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create WebAuthn passkey
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32), // In production, get this from server
          rp: {
            name: 'Schelling Point',
            id: window.location.hostname
          },
          user: {
            id: new Uint8Array(16), // Random user ID
            name: `user-${inviteCode}`,
            displayName: `User ${inviteCode}`
          },
          pubKeyCredParams: [
            {
              type: 'public-key',
              alg: -7 // ES256 (P-256)
            }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Use platform authenticator (Face ID/Touch ID)
            requireResidentKey: true,
            userVerification: 'required'
          },
          timeout: 60000,
          attestation: 'direct'
        }
      }) as PublicKeyCredential

      if (!credential) {
        throw new Error('Failed to create passkey')
      }

      // Extract public key from attestation
      const response = credential.response as AuthenticatorAttestationResponse
      const { pubKeyX, pubKeyY } = await extractPublicKey(response.attestationObject)

      // Store credential ID for later use
      const credentialId = arrayBufferToBase64Url(credential.rawId)

      // Register with backend
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: inviteCode,
          pubKeyX,
          pubKeyY
        })
      })

      const data = await registerResponse.json()

      if (!registerResponse.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Store passkey info in localStorage
      localStorage.setItem('passkeyInfo', JSON.stringify({
        credentialId,
        userId: data.userId,
        pubKeyX,
        pubKeyY
      }))

      // Redirect to event page
      router.push('/event')
    } catch (err) {
      console.error('Registration error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to create account. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Container size="sm">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Fingerprint className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Register with Face ID or Touch ID to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {inviteCode && (
              <div className="rounded-lg bg-muted p-4 text-sm">
                <div className="font-medium mb-1">Invite Code</div>
                <div className="font-mono text-muted-foreground">{inviteCode}</div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleCreatePasskey}
              loading={isLoading}
              disabled={!inviteCode || isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account with Face ID / Touch ID'}
            </Button>

            <div className="text-xs text-center text-muted-foreground space-y-2">
              <p>
                Your device will prompt you to authenticate using Face ID, Touch ID, or your device password.
              </p>
              <p>
                This creates a secure passkey that stays on your device.
              </p>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
