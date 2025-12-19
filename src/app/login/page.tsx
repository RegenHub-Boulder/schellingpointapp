'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Fingerprint, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/layout/container'
import { useAuth } from '@/hooks/useAuth'
import { useAuthFlow } from '@/hooks/useAuthFlow'

export default function LoginPage() {
  const router = useRouter()
  const { isLoggedIn, user } = useAuth()
  const { status, error, loginFlow, reset, isLoading } = useAuthFlow()

  const [isMounted, setIsMounted] = React.useState(false)
  const [hasLocalPasskey, setHasLocalPasskey] = React.useState(false)

  // Wait for client-side hydration
  React.useEffect(() => {
    setIsMounted(true)
    setHasLocalPasskey(!!localStorage.getItem('passkeyInfo'))
  }, [])

  // Redirect if already logged in
  React.useEffect(() => {
    if (isLoggedIn) {
      router.push('/event')
    }
  }, [isLoggedIn, router])

  // Redirect on success
  React.useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        router.push('/event')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [status, router])

  const handleLogin = async () => {
    try {
      await loginFlow()
    } catch {
      // Error is already set in the hook
    }
  }

  const getStatusMessage = () => {
    if (status === 'authorizing') return 'Authenticating...'
    if (status === 'logging-in') return 'Logging in...'
    if (status === 'success') return 'Success!'
    if (hasLocalPasskey) return 'Login with Face ID / Touch ID'
    return 'Sign in with Passkey'
  }

  const getDescription = () => {
    if (status === 'success') return `Logged in as ${user?.displayName || 'User'}`
    if (hasLocalPasskey) return 'Continue to Schelling Point'
    return 'Select your passkey to sign in'
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
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
                ) : hasLocalPasskey ? (
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
              {getDescription()}
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
                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  <p>
                    {hasLocalPasskey
                      ? 'Use Face ID / Touch ID to verify your identity.'
                      : 'Your device will show available passkeys for this site.'
                    }
                  </p>
                </div>

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
                    reset()
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
