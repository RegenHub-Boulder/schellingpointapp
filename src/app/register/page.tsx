'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Fingerprint, CheckCircle, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/layout/container'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { extractPublicKey, arrayBufferToBase64Url } from '@/lib/webauthn'
import { useAuthFlow } from '@/hooks/useAuthFlow'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

const IS_PREVIEW = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'

type PageMode = 'loading' | 'email' | 'email-sent' | 'passkey'

function RegisterContent() {
  const router = useRouter()
  const { status, error: authError, completeAuthFlow, isLoading: isAuthLoading } = useAuthFlow()
  const { isLoggedIn, refreshSession } = useAuth()
  const supabase = createClient()

  const [mode, setMode] = React.useState<PageMode>('loading')
  const [verifiedEmail, setVerifiedEmail] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState('')
  const [isSendingEmail, setIsSendingEmail] = React.useState(false)
  const [emailError, setEmailError] = React.useState<string | null>(null)
  const [isCreatingPasskey, setIsCreatingPasskey] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Check for existing Supabase session on mount
  React.useEffect(() => {
    if (IS_PREVIEW) {
      setVerifiedEmail('preview@test.local')
      setMode('passkey')
      return
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setVerifiedEmail(user.email)
        setMode('passkey')
      } else {
        setMode('email')
      }
    })
  }, [supabase.auth])

  // After auth flow completes, sign out of Supabase and refresh session
  React.useEffect(() => {
    if (status === 'success') {
      if (IS_PREVIEW) {
        refreshSession()
      } else {
        supabase.auth.signOut().then(() => {
          refreshSession()
        })
      }
    }
  }, [status, refreshSession, supabase.auth])

  // Redirect only when AuthContext confirms we're logged in
  React.useEffect(() => {
    if (status === 'success' && isLoggedIn) {
      router.push('/event')
    }
  }, [status, isLoggedIn, router])

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address')
      return
    }

    setIsSendingEmail(true)
    setEmailError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        throw error
      }

      setMode('email-sent')
    } catch (err) {
      console.error('Magic link error:', err)
      setEmailError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleCreatePasskey = async () => {
    if (!verifiedEmail) {
      setError('Email not verified')
      return
    }

    setIsCreatingPasskey(true)
    setError(null)

    try {
      // Step 1: Create WebAuthn passkey
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: {
            name: 'Schelling Point',
            id: window.location.hostname
          },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: verifiedEmail,
            displayName: verifiedEmail.split('@')[0]
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

  // Step tracking for UI
  const getCurrentStep = () => {
    if (isCreatingPasskey) return 1
    if (status === 'authorizing') return 2
    if (status === 'logging-in' || status === 'success') return 2
    return 0
  }
  const currentStep = getCurrentStep()
  const totalSteps = 2

  const getStatusMessage = () => {
    if (isCreatingPasskey) return 'Creating passkey...'
    if (status === 'authorizing') return 'Authorizing session...'
    if (status === 'logging-in') return 'Logging in...'
    if (status === 'success') return 'Success!'
    return 'Create Account with Passkey'
  }

  const getStepDescription = () => {
    if (isCreatingPasskey) return 'Creating your passkey...'
    if (status === 'authorizing') return 'Authorize your session for voting'
    if (status === 'logging-in') return 'Completing setup...'
    return null
  }

  // Loading state
  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // Email input mode
  if (mode === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Container size="sm">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Create Your Account</CardTitle>
              <CardDescription>
                Enter your email to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {emailError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                  {emailError}
                </div>
              )}

              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSendingEmail}
                    error={!!emailError}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  loading={isSendingEmail}
                  disabled={isSendingEmail || !email}
                >
                  Send Magic Link
                </Button>
              </form>

              <div className="text-xs text-center text-muted-foreground space-y-2">
                <p>
                  We&apos;ll send you a magic link to verify your email address.
                </p>
                <p>
                  After verification, you&apos;ll create a passkey to secure your account.
                </p>
                <p>
                  Already have a passkey?{' '}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </Container>
      </div>
    )
  }

  // Email sent confirmation
  if (mode === 'email-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Container size="sm">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We sent a magic link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted p-4 text-sm text-center">
                <p>Click the link in your email to continue registration.</p>
                <p className="mt-2 text-muted-foreground">
                  The link will expire in 1 hour.
                </p>
              </div>

              <div className="text-xs text-center text-muted-foreground">
                <p>
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setMode('email')}
                  >
                    try again
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </Container>
      </div>
    )
  }

  // Passkey creation mode
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
              {status === 'success' ? 'Account Created!' : 'Create Your Passkey'}
            </CardTitle>
            <CardDescription>
              {status === 'success'
                ? 'Redirecting to event...'
                : 'Create a passkey to complete setup'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {displayError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {displayError}
              </div>
            )}

            {/* Step indicator */}
            {currentStep > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${step < currentStep ? 'bg-green-600 text-white' : ''}
                        ${step === currentStep ? 'bg-primary text-primary-foreground animate-pulse' : ''}
                        ${step > currentStep ? 'bg-muted text-muted-foreground' : ''}
                      `}>
                        {step < currentStep ? '✓' : step}
                      </div>
                      {step < totalSteps && (
                        <div className={`w-8 h-0.5 ${step < currentStep ? 'bg-green-600' : 'bg-muted'}`} />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  {getStepDescription()}
                </p>
              </div>
            )}

            {verifiedEmail && status !== 'success' && currentStep === 0 && (
              <div className="rounded-lg bg-muted p-4 text-sm">
                <div className="font-medium mb-1">Email Verified</div>
                <div className="text-muted-foreground">{verifiedEmail}</div>
              </div>
            )}

            {status !== 'success' && (
              <Button
                size="lg"
                variant="secondary"
                className="w-full"
                onClick={handleCreatePasskey}
                loading={isLoading}
                disabled={!verifiedEmail || isLoading}
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
              <p>
                Already have a passkey?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
