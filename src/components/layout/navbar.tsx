'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu, X, User, LogOut, Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CreditBar } from '@/components/voting/credit-bar'

interface NavbarProps {
  eventName?: string
  user?: {
    name: string
    avatar?: string
  }
  credits?: {
    total: number
    spent: number
  }
  onSignOut?: () => void
  className?: string
}

export function Navbar({
  eventName,
  user,
  credits,
  onSignOut,
  className,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)

  return (
    <header className={cn('sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}>
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              SP
            </div>
            <span className="font-semibold hidden sm:inline-block">
              Schelling Point
            </span>
          </Link>

          {eventName && (
            <>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <span className="text-sm text-muted-foreground hidden sm:block">
                {eventName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {credits && (
            <div className="hidden sm:block w-32">
              <CreditBar
                total={credits.total}
                spent={credits.spent}
                size="sm"
                showLabel={false}
              />
            </div>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full border p-1 pr-3 hover:bg-accent transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {user.name}
                </span>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-background p-1 shadow-lg z-20 animate-slide-down">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        onSignOut?.()
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button size="sm">Enter Event</Button>
          )}

          <button
            className="sm:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden border-t bg-background p-4 animate-slide-down">
          {credits && (
            <div className="mb-4">
              <CreditBar total={credits.total} spent={credits.spent} />
            </div>
          )}
          <nav className="space-y-2">
            <Link
              href="/sessions"
              className="block rounded-md px-3 py-2 hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sessions
            </Link>
            <Link
              href="/schedule"
              className="block rounded-md px-3 py-2 hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              Schedule
            </Link>
            <Link
              href="/my-votes"
              className="block rounded-md px-3 py-2 hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              My Votes
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
