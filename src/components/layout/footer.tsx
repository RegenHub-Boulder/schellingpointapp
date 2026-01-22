'use client'

import * as React from 'react'
import Link from 'next/link'
import { Send, Youtube } from 'lucide-react'
import { cn } from '@/lib/utils'

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('bg-background border-t border-border/50', className)}>
      {/* Top section */}
      <div className="container py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
          {/* Logo */}
          <a
            href="https://ethboulder.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
          </a>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a
              href="https://t.me/ethboulder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Telegram"
            >
              <Send className="h-5 w-5" />
            </a>
            <a
              href="https://x.com/ethboulder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="X (Twitter)"
            >
              <XIcon className="h-5 w-5" />
            </a>
            <a
              href="https://youtube.com/@ethboulder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="YouTube"
            >
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Middle section - credits and links */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-8 pt-8 border-t border-border/30">
          {/* Credits */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>2026 EthBoulder</span>
            <span className="hidden sm:inline">|</span>
            <span>
              Powered by{' '}
              <a
                href="https://regenhub.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                RegenHub.xyz
              </a>
            </span>
            <span className="hidden sm:inline">|</span>
            <span>
              Built w{' '}
              <a
                href="https://local.agency"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Local* Agency
              </a>
            </span>
          </div>

          {/* Legal links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/support"
              className="hover:text-foreground transition-colors"
            >
              Support
            </Link>
          </div>
        </div>
      </div>

      {/* Giant EthBoulder text */}
      <div className="container pb-8 sm:pb-16 overflow-x-hidden">
        <a
          href="https://ethboulder.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="relative block group"
        >
          {/* Glow (avoid filter/text-shadow clipping artifacts) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 dark:group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(closest-side, hsl(var(--primary) / 0.35), transparent 70%)',
              filter: 'blur(90px)',
              transform: 'scale(1.15)',
            }}
          />

          <h2 className="relative text-[15vw] sm:text-[12vw] lg:text-[10vw] font-display leading-none tracking-tighter text-muted-foreground/20 dark:text-muted-foreground/10 transition-colors duration-300 group-hover:text-muted-foreground/40 dark:group-hover:text-primary/70">
            <span className="font-bold">Eth</span>
            <span className="font-light">Boulder</span>
          </h2>
        </a>
      </div>
    </footer>
  )
}
