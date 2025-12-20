'use client'

import * as React from 'react'
import { Wallet, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'
import { useAuth } from '@/hooks'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
  eventName?: string
}

type AuthStep = 'choose' | 'email' | 'email-sent' | 'wallet' | 'success' | 'error'

export function AuthModal({ open, onOpenChange, onComplete, eventName = 'the event' }: AuthModalProps) {
  const { signInWithEmail, user } = useAuth()
  const [step, setStep] = React.useState<AuthStep>('choose')
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // If user becomes authenticated, show success
  React.useEffect(() => {
    if (user && open) {
      setStep('success')
      setTimeout(() => {
        handleComplete()
      }, 1000)
    }
  }, [user, open])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError(null)

    const { error } = await signInWithEmail(email)

    setLoading(false)

    if (error) {
      setError(error.message)
      setStep('error')
    } else {
      setStep('email-sent')
    }
  }

  const handleWalletConnect = async () => {
    // Wallet connection will be implemented later (Web3 integration)
    setStep('wallet')
    setLoading(true)
    // For now, show a message that wallet auth is coming soon
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(false)
    setError('Wallet authentication coming soon. Please use email for now.')
    setStep('error')
  }

  const handleComplete = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep('choose')
      setEmail('')
      setLoading(false)
      setError(null)
      onComplete?.()
    }, 200)
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep('choose')
      setEmail('')
      setLoading(false)
      setError(null)
    }, 200)
  }

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-md" data-testid="auth-modal">
        <ModalHeader className="text-center sm:text-center">
          <ModalTitle>Enter {eventName}</ModalTitle>
          {step === 'choose' && (
            <ModalDescription>
              Choose how you'd like to sign in
            </ModalDescription>
          )}
        </ModalHeader>

        <div className="space-y-6">
          {step === 'choose' && (
            <>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start gap-3"
                  onClick={handleWalletConnect}
                  data-testid="connect-wallet-btn"
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 justify-start gap-3"
                  onClick={() => setStep('email')}
                  data-testid="email-auth-btn"
                >
                  <Mail className="h-5 w-5" />
                  Continue with Email
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our{' '}
                <a href="/terms" className="underline hover:text-foreground">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </a>
              </p>
            </>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                  data-testid="email-input"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !email} data-testid="send-magic-link-btn">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Magic Link
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('choose')}
                disabled={loading}
              >
                Back
              </Button>
            </form>
          )}

          {step === 'email-sent' && (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  We sent a magic link to{' '}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Click the link in the email to sign in. The link will expire in 1 hour.
                </p>
              </div>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('email')
                  setEmail('')
                }}
              >
                Use a different email
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Something went wrong</p>
                <p className="text-sm text-muted-foreground">
                  {error || 'An unexpected error occurred. Please try again.'}
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  setStep('choose')
                  setError(null)
                }}
              >
                Try again
              </Button>
            </div>
          )}

          {step === 'wallet' && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Connecting to your wallet...
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setStep('choose')
                  setLoading(false)
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4 py-8" data-testid="auth-success">
              <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium">Successfully authenticated!</p>
              <p className="text-sm text-muted-foreground">
                Redirecting...
              </p>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  )
}
