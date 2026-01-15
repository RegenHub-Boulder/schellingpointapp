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
  const { isLoggedIn, user, refreshSession } = useAuth()
  const { status, error, loginFlow, reset, isLoading } = useAuthFlow()

  const [isMounted, setIsMounted] = React.useState(false)
  const [hasLocalPasskey, setHasLocalPasskey] = React.useState(false)

  // Wait for client-side hydration
  React.useEffect(() => {
    setIsMounted(true)
    setHasLocalPasskey(!!localStorage.getItem('passkeyInfo'))
  }, [])

  // After auth flow completes, refresh session so AuthContext knows we're logged in
  React.useEffect(() => {
    if (status === 'success') {
      refreshSession()
    }
  }, [status, refreshSession])

  // Redirect when AuthContext confirms we're logged in
  React.useEffect(() => {
    if (isLoggedIn) {
      router.push('/event')
    }
  }, [isLoggedIn, router])

  const handleLogin = async () => {
    try {
      await loginFlow()
    } catch {
      // Error is already set in the hook
    }
  }

  // Step tracking - 2 steps if no local passkey (need to discover), 1 step if has local
  const totalSteps = hasLocalPasskey ? 1 : 2
  const getCurrentStep = () => {
    if (status === 'idle') return 0
    if (status === 'recovering') return 1 // Step 1: passkey discovery
    if (status === 'authorizing') return hasLocalPasskey ? 1 : 2 // Step 2 if recovering, Step 1 if has local
    if (status === 'logging-in' || status === 'success') return totalSteps
    return 0
  }
  const currentStep = getCurrentStep()

  const getStatusMessage = () => {
    if (status === 'recovering') return 'Selecting passkey...'
    if (status === 'authorizing') return 'Authorizing...'
    if (status === 'logging-in') return 'Logging in...'
    if (status === 'success') return 'Success!'
    if (hasLocalPasskey) return 'Login with Face ID / Touch ID'
    return 'Sign in with Passkey'
  }

  const getStepDescription = () => {
    if (status === 'recovering') return 'Select your passkey'
    if (status === 'authorizing') {
      return hasLocalPasskey ? 'Authorize your session' : 'Authorize your session'
    }
    if (status === 'logging-in') return 'Completing login...'
    return null
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
                {/* Step indicator */}
                {currentStep > 0 && totalSteps > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
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

                {/* Simple description for single-step flow */}
                {currentStep > 0 && totalSteps === 1 && getStepDescription() && (
                  <div className="rounded-lg bg-primary/10 p-4 text-sm text-center text-primary">
                    {getStepDescription()}
                  </div>
                )}

                {currentStep === 0 && (
                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    <p>
                      {hasLocalPasskey
                        ? 'Use Face ID / Touch ID to verify your identity.'
                        : 'Your device will show available passkeys for this site.'
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
