'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Fingerprint, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/layout/container'
import { useAuth } from '@/hooks/useAuth'
import { useVoting } from '@/hooks/useVoting'
import { arrayBufferToBase64Url } from '@/lib/webauthn'

type LoginStatus = 'idle' | 'checking' | 'authorizing' | 'logging-in' | 'success' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoggedIn, user } = useAuth()
  const { hasValidSession, authorizeSession, isAuthorizing } = useVoting()

  const [status, setStatus] = React.useState<LoginStatus>('checking')
  const [error, setError] = React.useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = React.useState(false)
  const [needsPasskeySelect, setNeedsPasskeySelect] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  // Wait for client-side hydration
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check if already logged in
  React.useEffect(() => {
    if (isLoggedIn) {
      router.push('/event')
    }
  }, [isLoggedIn, router])

  // Check session status after mount (localStorage only available client-side)
  React.useEffect(() => {
    if (!isMounted) return

    // Check localStorage directly to avoid stale closure issues
    const passkeyInfo = localStorage.getItem('passkeyInfo')
    const sessionKey = localStorage.getItem('sessionKey')

    console.log('Login page check:', { passkeyInfo: !!passkeyInfo, sessionKey: !!sessionKey })

    if (!passkeyInfo) {
      // No local passkey info - need to use discoverable credentials
      setNeedsPasskeySelect(true)
      setNeedsAuth(true)
      setStatus('idle')
      return
    }

    // Check if session is valid
    if (sessionKey) {
      try {
        const session = JSON.parse(sessionKey)
        const isValid = session.expiry > Math.floor(Date.now() / 1000)
        if (!isValid) {
          setNeedsAuth(true)
        }
      } catch {
        setNeedsAuth(true)
      }
    } else {
      setNeedsAuth(true)
    }

    setStatus('idle')
  }, [isMounted])

  // Recover passkey info using discoverable credentials
  async function recoverPasskeyInfo(): Promise<boolean> {
    try {
      // Use discoverable credentials - let user select their passkey
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000
          // No allowCredentials - this makes it discoverable
        }
      }) as PublicKeyCredential

      if (!assertion) {
        throw new Error('Authentication cancelled')
      }

      // Get credential ID
      const credentialId = arrayBufferToBase64Url(assertion.rawId)

      // Look up user by credential ID
      const lookupResponse = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId })
      })

      if (!lookupResponse.ok) {
        const data = await lookupResponse.json()
        throw new Error(data.error || 'User not found. Please register first.')
      }

      const userData = await lookupResponse.json()

      // Restore passkeyInfo to localStorage
      localStorage.setItem('passkeyInfo', JSON.stringify({
        credentialId: userData.credentialId,
        userId: userData.userId,
        pubKeyX: userData.pubKeyX,
        pubKeyY: userData.pubKeyY
      }))

      setNeedsPasskeySelect(false)
      return true

    } catch (err) {
      console.error('Passkey recovery error:', err)
      if (err instanceof Error) {
        throw err
      }
      throw new Error('Failed to authenticate with passkey')
    }
  }

  const handleLogin = async () => {
    setError(null)

    try {
      // Step 0: If no passkeyInfo, recover it first using discoverable credentials
      if (needsPasskeySelect) {
        setStatus('authorizing')
        await recoverPasskeyInfo()
      }

      // Step 1: If no valid session, authorize first (requires Face ID)
      if (!hasValidSession()) {
        setStatus('authorizing')
        await authorizeSession()
      }

      // Step 2: Login with ephemeral signer (no Face ID)
      setStatus('logging-in')
      await login()

      setStatus('success')

      // Redirect after brief delay to show success
      setTimeout(() => {
        router.push('/event')
      }, 1000)

    } catch (err) {
      console.error('Login error:', err)
      setStatus('error')
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Login failed. Please try again.')
      }
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return 'Checking session...'
      case 'authorizing':
        return 'Authenticating with Face ID / Touch ID...'
      case 'logging-in':
        return 'Logging in...'
      case 'success':
        return 'Success! Redirecting...'
      default:
        if (needsPasskeySelect) {
          return 'Sign in with Passkey'
        }
        return needsAuth
          ? 'Login with Face ID / Touch ID'
          : 'Login'
    }
  }

  const isLoading = !isMounted || status === 'checking' || status === 'authorizing' || status === 'logging-in' || isAuthorizing

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Container size="sm">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                {status === 'success' ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : needsAuth ? (
                  <Fingerprint className="h-12 w-12 text-primary" />
                ) : (
                  <LogIn className="h-12 w-12 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {status === 'success' ? 'Welcome Back!' : 'Login'}
            </CardTitle>
            <CardDescription>
              {status === 'success'
                ? `Logged in as ${user?.displayName || 'User'}`
                : needsPasskeySelect
                  ? 'Select your passkey to sign in'
                  : needsAuth
                    ? 'Your session expired. Please authenticate again.'
                    : 'Continue to Schelling Point'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {status !== 'success' && status !== 'error' && (
              <>
                {needsAuth && (
                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    <p>
                      {needsAuth
                        ? 'You\'ll need to use Face ID / Touch ID to verify your identity.'
                        : 'Click below to continue.'
                      }
                    </p>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleLogin}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {getStatusMessage()}
                </Button>
              </>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStatus('idle')
                    setError(null)
                  }}
                >
                  Try Again
                </Button>

                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push('/')}
                >
                  Go to Home
                </Button>
              </div>
            )}

            <div className="text-xs text-center text-muted-foreground">
              <p>
                Your passkey is stored securely on your device.
              </p>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}
