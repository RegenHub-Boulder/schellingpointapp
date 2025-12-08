'use client'

import * as React from 'react'
import { DollarSign, Users, Vote, CheckCircle, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency, formatPercentage, truncateAddress } from '@/lib/utils'

// Mock data
const distributionData = [
  { session: 'DAO Governance', hosts: ['Alice Chen', 'Bob Smith'], votes: 156, voters: 52, qfScore: 18.4, amount: 1748 },
  { session: 'ZK Workshop', hosts: ['Carol Williams'], votes: 134, voters: 38, qfScore: 14.2, amount: 1349 },
  { session: 'Future of L2s', hosts: ['David Lee'], votes: 98, voters: 41, qfScore: 11.8, amount: 1121 },
  { session: 'Privacy Panel', hosts: ['Eve Martinez', 'Frank Johnson'], votes: 89, voters: 35, qfScore: 10.1, amount: 960 },
  { session: 'MEV Deep Dive', hosts: ['Grace Liu'], votes: 76, voters: 28, qfScore: 8.7, amount: 827 },
  { session: 'Smart Contract Security', hosts: ['Henry Park'], votes: 71, voters: 26, qfScore: 7.9, amount: 751 },
  { session: 'ReFi Discussion', hosts: ['Iris Chen'], votes: 67, voters: 24, qfScore: 7.2, amount: 684 },
  { session: 'Wallet UX', hosts: ['Jack Miller'], votes: 52, voters: 21, qfScore: 5.8, amount: 551 },
]

export default function AdminDistributionPage() {
  const [isExecuting, setIsExecuting] = React.useState(false)
  const [executed, setExecuted] = React.useState(false)
  const [confirmed, setConfirmed] = React.useState(false)

  const totalPool = 10000
  const platformFee = 500
  const distributable = totalPool - platformFee
  const totalDistributed = distributionData.reduce((sum, d) => sum + d.amount, 0)

  const handleExecute = () => {
    setIsExecuting(true)
    setTimeout(() => {
      setIsExecuting(false)
      setExecuted(true)
    }, 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Budget Distribution</h1>
          <p className="text-muted-foreground mt-1">
            Distribute session budget based on attendance votes
          </p>
        </div>

        {!executed && (
          <Badge variant="secondary">Event Concluded</Badge>
        )}
        {executed && (
          <Badge variant="success">Distribution Complete</Badge>
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
            <div className="text-xs text-muted-foreground">USDC</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform Fee (5%)
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
            <div className="text-2xl font-bold">28</div>
            <div className="text-xs text-muted-foreground">Unique wallets</div>
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
            <div className="text-sm text-muted-foreground">Participation</div>
            <div className="text-lg font-semibold mt-1">142 / 156 (91%)</div>
            <Progress value={91} className="mt-2" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Votes Cast</div>
            <div className="text-lg font-semibold mt-1">847</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Credits Spent</div>
            <div className="text-lg font-semibold mt-1">3,284</div>
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
                  Voters
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  QF Score
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  Payout
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {distributionData.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{row.session}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {row.hosts.join(', ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {row.votes}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {row.voters}
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
                <td colSpan={6} className="px-4 py-3 font-medium text-sm text-right">
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
                  {formatCurrency(distributable)} to 28 wallets on Base network
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
                  {formatCurrency(distributable)} distributed to 28 hosts
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
