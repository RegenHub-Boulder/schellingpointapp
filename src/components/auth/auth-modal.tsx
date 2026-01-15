'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
  eventName?: string
}

export function AuthModal({ open, onOpenChange, eventName = 'the event' }: AuthModalProps) {
  const router = useRouter()

  const handlePasskeyLogin = () => {
    onOpenChange(false)
    router.push('/login')
  }

  const handleRegister = () => {
    onOpenChange(false)
    router.push('/register')
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md" data-testid="auth-modal">
        <ModalHeader>
          <ModalTitle>Join {eventName}</ModalTitle>
          <ModalDescription>
            Sign in with your passkey to vote and participate in sessions.
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4 pt-4">
          <Button
            className="w-full justify-start gap-3"
            size="lg"
            onClick={handlePasskeyLogin}
            data-testid="passkey-auth-btn"
          >
            <KeyRound className="h-5 w-5" />
            <span className="flex-1 text-left">Sign in with Passkey</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                New here?
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            size="lg"
            onClick={handleRegister}
          >
            <Mail className="h-5 w-5" />
            <span className="flex-1 text-left">Register with Email</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </ModalContent>
    </Modal>
  )
}
