'use client'

import { cn } from '@/lib/utils'

interface AnimatedGradientProps {
  className?: string
}

export function AnimatedGradient({ className }: AnimatedGradientProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {/* Primary neon green blob #B2FF00 */}
      <div
        className="absolute w-[900px] h-[900px] rounded-full blur-[120px] animate-gradient-drift"
        style={{
          background:
            'radial-gradient(circle, hsl(78.1 100% 50% / 0.35) 0%, hsl(78.1 100% 50% / 0.15) 50%, transparent 70%)',
          top: '-40%',
          left: '50%',
        }}
      />

      {/* Cyan/teal accent blob */}
      <div
        className="absolute w-[700px] h-[700px] rounded-full blur-[100px] animate-gradient-drift-reverse"
        style={{
          background:
            'radial-gradient(circle, hsl(170 80% 45% / 0.25) 0%, hsl(160 70% 40% / 0.1) 50%, transparent 70%)',
          top: '-20%',
          left: '10%',
        }}
      />

      {/* Yellow/warm accent blob */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[90px] animate-gradient-drift-slow"
        style={{
          background:
            'radial-gradient(circle, hsl(50 100% 50% / 0.25) 0%, hsl(40 100% 45% / 0.1) 50%, transparent 70%)',
          bottom: '-10%',
          right: '5%',
        }}
      />

      {/* Orange/red warm glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[80px] animate-gradient-flow"
        style={{
          background:
            'radial-gradient(circle, hsl(25 100% 50% / 0.2) 0%, hsl(0 80% 50% / 0.1) 50%, transparent 70%)',
          bottom: '0%',
          left: '30%',
        }}
      />
    </div>
  )
}
