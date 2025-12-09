'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Presentation,
  Users,
  Vote,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Event Overview</h1>
        <p className="text-muted-foreground mt-1">
          EthBoulder 2026 • Feb 27 - Mar 1, 2026
        </p>
      </div>

      {/* Status Banner */}
      <div className="p-4 rounded-xl border bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">Pre-Event Voting Closes in 2d 14h</div>
            <div className="text-sm text-muted-foreground">
              Run the scheduling algorithm after voting closes
            </div>
          </div>
        </div>
        <Button>Generate Schedule</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessions
            </CardTitle>
            <Presentation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <div className="text-xs text-muted-foreground mt-1">
              4 pending review
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Participants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <div className="text-xs text-muted-foreground mt-1">
              +12 this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Votes Cast
            </CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,847</div>
            <div className="text-xs text-muted-foreground mt-1">
              78% participation
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget Pool
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$10,000</div>
            <div className="text-xs text-muted-foreground mt-1">
              USDC on Base
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Action Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <div className="font-medium text-sm">4 sessions pending review</div>
                <div className="text-xs text-muted-foreground">
                  Review and approve before voting ends
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/sessions">
                Review
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Presentation className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Configure venues</div>
                <div className="text-xs text-muted-foreground">
                  Set up rooms before schedule generation
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/settings">
                Configure
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Top Sessions by Votes</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/sessions">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { title: 'Building DAOs That Actually Work', host: 'Alice Chen', votes: 127, voters: 68 },
              { title: 'Zero-Knowledge Proofs Workshop', host: 'Bob Smith', votes: 98, voters: 42 },
              { title: 'The Future of L2s', host: 'David Lee', votes: 89, voters: 51 },
              { title: 'Regenerative Finance Panel', host: 'Carol Williams', votes: 84, voters: 47 },
              { title: 'MEV Deep Dive', host: 'Grace Liu', votes: 76, voters: 38 },
            ].map((session, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-6 text-center font-mono text-sm text-muted-foreground">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{session.title}</div>
                  <div className="text-xs text-muted-foreground">{session.host}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm tabular-nums">{session.votes}</div>
                  <div className="text-xs text-muted-foreground">{session.voters} voters</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Voting Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voting Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Participants who have voted</span>
              <span className="font-medium">122 / 156 (78%)</span>
            </div>
            <Progress value={78} />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Average credits used</span>
              <span className="font-medium">67 / 100</span>
            </div>
            <Progress value={67} />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Sessions with votes</span>
              <span className="font-medium">20 / 24 (83%)</span>
            </div>
            <Progress value={83} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
