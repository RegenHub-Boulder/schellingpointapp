'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fingerprint, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/layout/container'
import { extractPublicKey, arrayBufferToBase64Url } from '@/lib/webauthn'
import { useAuthFlow } from '@/hooks/useAuthFlow'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status, error: authError, completeAuthFlow, isLoading: isAuthLoading } = useAuthFlow()

  const [isCreatingPasskey, setIsCreatingPasskey] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const inviteCode = searchParams.get('code')

  React.useEffect(() => {
    if (!inviteCode) {
      setError('No invite code provided')
    }
  }, [inviteCode])

  // Redirect on success
  React.useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        router.push('/event')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [status, router])

  const handleCreatePasskey = async () => {
    if (!inviteCode) {
      setError('No invite code provided')
      return
    }

    setIsCreatingPasskey(true)
    setError(null)

    try {
      // Step 1: Create WebAuthn passkey
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

      // Step 2: Register with backend
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: inviteCode,
          pubKeyX,
          pubKeyY,
          credentialId
        })
      })

      const data = await registerResponse.json()

      if (!registerResponse.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Store passkey info in localStorage
      const passkeyInfo = {
        credentialId,
        userId: data.userId,
        pubKeyX,
        pubKeyY
      }
      localStorage.setItem('passkeyInfo', JSON.stringify(passkeyInfo))

      setIsCreatingPasskey(false)

      // Step 3: Complete auth flow (authorize signer + get JWT)
      await completeAuthFlow(passkeyInfo)

    } catch (err) {
      console.error('Registration error:', err)
      setIsCreatingPasskey(false)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to create account. Please try again.')
      }
    }
  }

  const displayError = error || authError
  const isLoading = isCreatingPasskey || isAuthLoading

  const getStatusMessage = () => {
    if (isCreatingPasskey) return 'Creating passkey...'
    if (status === 'authorizing') return 'Authorizing session...'
    if (status === 'logging-in') return 'Logging in...'
    if (status === 'success') return 'Success!'
    return 'Create Account with Face ID / Touch ID'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Container size="sm">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                {status === 'success' ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : (
                  <Fingerprint className="h-12 w-12 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {status === 'success' ? 'Account Created!' : 'Create Your Account'}
            </CardTitle>
            <CardDescription>
              {status === 'success'
                ? 'Redirecting to event...'
                : 'Register with Face ID or Touch ID to get started'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {displayError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {displayError}
              </div>
            )}

            {inviteCode && status !== 'success' && (
              <div className="rounded-lg bg-muted p-4 text-sm">
                <div className="font-medium mb-1">Invite Code</div>
                <div className="font-mono text-muted-foreground">{inviteCode}</div>
              </div>
            )}

            {status !== 'success' && (
              <Button
                size="lg"
                className="w-full"
                onClick={handleCreatePasskey}
                loading={isLoading}
                disabled={!inviteCode || isLoading}
              >
                {getStatusMessage()}
              </Button>
            )}

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
