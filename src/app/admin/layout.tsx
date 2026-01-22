'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Presentation,
  Calendar,
  Coins,
  Settings,
  Users,
  ChevronLeft,
  GitMerge,
  MapPin,
  Smartphone,
  UserCheck,
  Star,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getAssetPath } from '@/lib/asset-path'
import { useAuth } from '@/hooks/useAuth'
import { useEventAccess } from '@/hooks/useEventAccess'
import { ShieldAlert } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/sessions', label: 'Sessions', icon: Presentation },
  { href: '/admin/mergers', label: 'Mergers', icon: GitMerge },
  { href: '/admin/schedule', label: 'Schedule', icon: Calendar },
  { href: '/admin/venues', label: 'Venues', icon: MapPin },
  { href: '/admin/distribution', label: 'Distribution', icon: Coins },
  { href: '/admin/participants', label: 'Participants', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const tabletItems = [
  { href: '/admin/tablet/check-in', label: 'Check-In', icon: UserCheck },
  { href: '/admin/tablet/vote', label: 'Value Voting', icon: Star },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const { access, isLoading: accessLoading } = useEventAccess()

  // Route protection: redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace('/login')
    }
  }, [authLoading, isLoggedIn, router])

  // Show loading while checking auth or access
  if (authLoading || !isLoggedIn || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show access denied if not an admin
  if (!access?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have admin privileges for this event. Please contact an event organizer if you believe this is an error.
          </p>
          <Button onClick={() => router.push('/event/sessions')}>
            Return to Event
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/event/sessions" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to Event
          </Link>
        </div>

        <div className="p-4">
          <Image
            src={getAssetPath('ethboulder_wordmark.svg')}
            alt="EthBoulder"
            width={120}
            height={20}
            className="h-4 sm:h-5 w-auto mb-3"
          />
          <h2 className="font-semibold text-sm">Admin Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            EthBoulder 2026
          </p>
        </div>

        <nav className="flex-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}

          {/* Tablet Interfaces Section */}
          <div className="mt-6 mb-2 px-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Smartphone className="h-3 w-3" />
              Tablet Interfaces
            </div>
          </div>

          {tabletItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground">
            Event Status
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium">Voting Open</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container py-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}
