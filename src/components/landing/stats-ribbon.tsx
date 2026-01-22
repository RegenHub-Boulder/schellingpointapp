'use client'

import { Users, Lightbulb, Coins, TrendingUp } from 'lucide-react'

interface StatsRibbonProps {
  sessionsCount?: number
  participantsCount?: number
  creditsPool?: number
  votesCast?: number
}

export function StatsRibbon({
  sessionsCount = 0,
  participantsCount = 0,
  creditsPool = 0,
  votesCast = 0,
}: StatsRibbonProps) {
  const stats = [
    { icon: Lightbulb, value: sessionsCount.toString(), label: 'Sessions Proposed' },
    { icon: Users, value: participantsCount.toString(), label: 'Participants' },
    { icon: Coins, value: creditsPool.toLocaleString(), label: 'Credits Pool' },
    { icon: TrendingUp, value: votesCast.toLocaleString(), label: 'Votes Cast' },
  ]

  return (
    <section className="py-8 border-y border-border/50 bg-secondary/30">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary dark:bg-primary/10 mb-3">
                <Icon className="h-6 w-6 text-primary-foreground dark:text-primary" />
              </div>
              <p className="text-2xl sm:text-3xl font-display font-bold">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
