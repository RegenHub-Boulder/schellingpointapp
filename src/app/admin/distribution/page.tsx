'use client'

import * as React from 'react'
import { DollarSign, Users, Vote, CheckCircle, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, truncateAddress } from '@/lib/utils'
import { useEvent } from '@/hooks/use-event'
import { useSessions, Session } from '@/hooks/use-sessions'

interface DistributionRow {
  session: Session
  votes: number
  voters: number
  qfScore: number
  amount: number
  hosts: string[]
}

export default function AdminDistributionPage() {
  const { event, budgetConfig, loading: eventLoading, error: eventError } = useEvent()
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions({ status: 'scheduled' })

  const [isExecuting, setIsExecuting] = React.useState(false)
  const [executed, setExecuted] = React.useState(false)
  const [confirmed, setConfirmed] = React.useState(false)

  const loading = eventLoading || sessionsLoading
  const error = eventError || sessionsError

  // Calculate distribution data from sessions
  const distributionData = React.useMemo((): DistributionRow[] => {
    if (!sessions.length || !budgetConfig) return []

    // Filter sessions that have attendance stats
    const sessionsWithStats = sessions.filter(s =>
      s.attendanceStats && s.attendanceStats.totalVotes > 0
    )

    // Calculate total QF score
    const totalQfScore = sessionsWithStats.reduce(
      (sum, s) => sum + (s.attendanceStats?.qfScore || 0),
      0
    )

    if (totalQfScore === 0) return []

    // Calculate distributable amount
    const platformFeePercent = budgetConfig.platformFeePercent || 5
    const distributable = budgetConfig.totalBudgetPool * (1 - platformFeePercent / 100)

    // Calculate distribution for each session
    return sessionsWithStats
      .map(session => {
        const qfScore = session.attendanceStats?.qfScore || 0
        const proportion = qfScore / totalQfScore
        const amount = Math.round(distributable * proportion)

        const hosts = session.hosts?.map(h => h.name || 'Unknown').filter(Boolean) || []

        return {
          session,
          votes: session.attendanceStats?.totalVotes || 0,
          voters: session.preVoteStats?.totalVoters || 0,
          qfScore: Math.round(proportion * 1000) / 10, // As percentage with 1 decimal
          amount,
          hosts,
        }
      })
      .sort((a, b) => b.qfScore - a.qfScore)
  }, [sessions, budgetConfig])

  // Calculate totals
  const totalPool = budgetConfig?.totalBudgetPool || 0
  const platformFeePercent = budgetConfig?.platformFeePercent || 5
  const platformFee = Math.round(totalPool * platformFeePercent / 100)
  const distributable = totalPool - platformFee
  const totalDistributed = distributionData.reduce((sum, d) => sum + d.amount, 0)

  // Get unique hosts count
  const uniqueHosts = new Set(distributionData.flatMap(d => d.hosts))

  // Voting stats
  const totalVotesCast = distributionData.reduce((sum, d) => sum + d.votes, 0)
  const totalVoters = new Set(sessions.flatMap(s => s.preVoteStats?.totalVoters || 0))

  const handleExecute = () => {
    setIsExecuting(true)
    // In production, this would call an API to execute the distribution
    setTimeout(() => {
      setIsExecuting(false)
      setExecuted(true)
    }, 3000)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Budget Distribution</h1>
          <p className="text-muted-foreground mt-1">
            Distribute session budget based on attendance votes
          </p>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>Error loading distribution data: {error}</p>
          </div>
        </Card>
      </div>
    )
  }

  // No budget configured
  if (!budgetConfig || totalPool === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Budget Distribution</h1>
          <p className="text-muted-foreground mt-1">
            Distribute session budget based on attendance votes
          </p>
        </div>
        <Card className="p-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium mb-2">No Budget Configured</h2>
          <p className="text-muted-foreground">
            Configure a budget pool in event settings before distributing funds.
          </p>
        </Card>
      </div>
    )
  }

  // No attendance votes yet
  if (distributionData.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Budget Distribution</h1>
          <p className="text-muted-foreground mt-1">
            Distribute session budget based on attendance votes
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pool
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPool)}</div>
              <div className="text-xs text-muted-foreground">
                {budgetConfig.paymentTokenSymbol || 'USDC'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="p-12 text-center">
          <Vote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium mb-2">No Attendance Votes Yet</h2>
          <p className="text-muted-foreground">
            Distribution will be available after sessions receive attendance votes.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Budget Distribution</h1>
          <p className="text-muted-foreground mt-1">
            Distribute session budget based on attendance votes
            {event?.name && ` for ${event.name}`}
          </p>
        </div>

        {!executed && (
          <Badge variant="secondary">Ready to Distribute</Badge>
        )}
        {executed && (
          <Badge className="bg-green-500">Distribution Complete</Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pool
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPool)}</div>
            <div className="text-xs text-muted-foreground">
              {budgetConfig.paymentTokenSymbol || 'USDC'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform Fee ({platformFeePercent}%)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(platformFee)}</div>
            <div className="text-xs text-muted-foreground">Retained</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Distributable
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(distributable)}</div>
            <div className="text-xs text-muted-foreground">To hosts</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recipients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueHosts.size}</div>
            <div className="text-xs text-muted-foreground">Unique hosts</div>
          </CardContent>
        </Card>
      </div>

      {/* Voting Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance Voting Results</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">Sessions with Votes</div>
            <div className="text-lg font-semibold mt-1">
              {distributionData.length} / {sessions.length}
            </div>
            <Progress
              value={(distributionData.length / Math.max(sessions.length, 1)) * 100}
              className="mt-2"
            />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Votes Cast</div>
            <div className="text-lg font-semibold mt-1">{totalVotesCast.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total to Distribute</div>
            <div className="text-lg font-semibold mt-1">{formatCurrency(totalDistributed)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Distribution Breakdown</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  #
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Session
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Hosts
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  Votes
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  QF Share
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  Payout
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {distributionData.map((row, i) => (
                <tr key={row.session.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{row.session.title}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {row.hosts.length > 0 ? row.hosts.join(', ') : 'No hosts'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {row.votes}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {row.qfScore}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-sm">
                      {formatCurrency(row.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 border-t">
              <tr>
                <td colSpan={5} className="px-4 py-3 font-medium text-sm text-right">
                  Total Distribution
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {formatCurrency(totalDistributed)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Execute Distribution */}
      {!executed && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold">Ready to distribute</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(distributable)} to {uniqueHosts.size} hosts
                  {budgetConfig.treasuryWalletAddress && ' on Base network'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="rounded border-input"
                  />
                  I have reviewed all payouts
                </label>

                <Button
                  onClick={handleExecute}
                  disabled={!confirmed || isExecuting}
                >
                  {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Execute Distribution
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution Complete */}
      {executed && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">Distribution Complete</h3>
                <p className="text-sm text-green-700 mt-1">
                  {formatCurrency(distributable)} distributed to {uniqueHosts.size} hosts
                </p>

                <div className="mt-4 p-3 rounded-lg bg-white/50">
                  <div className="text-xs text-muted-foreground mb-1">Transaction</div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">
                      {truncateAddress('0x789def123abc456789def123abc456789def123abc', 8)}
                    </code>
                    <Button variant="ghost" size="sm" className="h-auto p-1">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Button variant="outline" className="mt-4">
                  Download Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
