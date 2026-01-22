'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Check initial theme
    const root = document.documentElement
    const hasDarkClass = root.classList.contains('dark')
    const hasLightClass = root.classList.contains('light')

    // Default to dark if no class set
    if (!hasDarkClass && !hasLightClass) {
      root.classList.add('dark')
      setIsDark(true)
    } else {
      setIsDark(!hasLightClass)
    }
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement

    if (isDark) {
      root.classList.remove('dark')
      root.classList.add('light')
      setIsDark(false)
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
      setIsDark(true)
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'fixed z-[9999] w-12 h-12 rounded-full',
        'flex items-center justify-center',
        'glass-card border border-border/50 shadow-lg',
        'hover:scale-110 active:scale-95 transition-all duration-200',
        'hover:border-primary/50',
        // Desktop: bottom-left corner
        'md:bottom-6 md:left-6',
        // Mobile: above bottom nav, left side
        'bottom-24 left-4'
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-primary" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </button>
  )
}
