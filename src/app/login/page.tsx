'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Fingerprint, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/layout/container'
import { useAuth } from '@/hooks/useAuth'
import { useVoting } from '@/hooks/useVoting'

type LoginStatus = 'idle' | 'checking' | 'authorizing' | 'logging-in' | 'success' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoggedIn, user } = useAuth()
  const { hasPasskey, hasValidSession, authorizeSession, isAuthorizing } = useVoting()

  const [status, setStatus] = React.useState<LoginStatus>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = React.useState(false)

  // Check if already logged in
  React.useEffect(() => {
    if (isLoggedIn) {
      router.push('/event')
    }
  }, [isLoggedIn, router])

  // Check session status on mount
  React.useEffect(() => {
    if (!hasPasskey()) {
      setError('No passkey found. Please register first.')
      setStatus('error')
      return
    }

    if (!hasValidSession()) {
      setNeedsAuth(true)
    }
  }, [hasPasskey, hasValidSession])

  const handleLogin = async () => {
    setError(null)

    try {
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
        return needsAuth
          ? 'Login with Face ID / Touch ID'
          : 'Login'
    }
  }

  const isLoading = status === 'checking' || status === 'authorizing' || status === 'logging-in' || isAuthorizing

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

                {!hasPasskey() && (
                  <Button
                    size="lg"
                    variant="ghost"
                    className="w-full"
                    onClick={() => router.push('/')}
                  >
                    Go to Home
                  </Button>
                )}
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
