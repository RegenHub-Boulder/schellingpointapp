'use client'

import * as React from 'react'
import Link from 'next/link'
import { Mic, Wrench, MessageSquare, Users, Monitor, Loader2, GripVertical, Save, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditBar } from '@/components/voting/credit-bar'
import { cn } from '@/lib/utils'
import { useVotes } from '@/hooks/use-votes'
import { useAuth } from '@/hooks'
import { useSessions } from '@/hooks/use-sessions'
import { useVoting, getTopicId } from '@/hooks/useVoting'

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

type CurveType = 'even' | 'linear' | 'quadratic'

const curveDescriptions: Record<CurveType, string> = {
  even: 'All favorites weighted equally',
  linear: 'Higher ranks get more weight (1st > 2nd > 3rd...)',
  quadratic: 'Top-heavy distribution (1st gets much more than 2nd)',
}

// Calculate weights based on curve type
function calculateWeights(count: number, curve: CurveType): number[] {
  if (count === 0) return []

  let weights: number[]

  switch (curve) {
    case 'even':
      // All equal
      weights = Array(count).fill(1)
      break
    case 'linear':
      // n, n-1, n-2, ... 1
      weights = Array.from({ length: count }, (_, i) => count - i)
      break
    case 'quadratic':
      // n^2, (n-1)^2, (n-2)^2, ... 1
      weights = Array.from({ length: count }, (_, i) => Math.pow(count - i, 2))
      break
  }

  // Normalize to percentages (sum to 100)
  const total = weights.reduce((a, b) => a + b, 0)
  return weights.map(w => Math.round((w / total) * 100))
}

// Adjust weights so they sum to exactly 100
function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum === 100) return weights

  // Adjust the first item to make it sum to 100
  const adjusted = [...weights]
  adjusted[0] += 100 - sum
  return adjusted
}

interface RankedSession {
  id: string
  title: string
  format: string
  duration: number
  hostName: string
}

export default function MyVotesPage() {
  const { user, isLoggedIn } = useAuth()
  const { balance } = useVotes()
  const { sessions: apiSessions, loading: sessionsLoading } = useSessions({ status: 'approved' })
  const { getVotes, batchVote, isVoting, isLoading: votesLoading } = useVoting()

  // State
  const [rankedSessions, setRankedSessions] = React.useState<RankedSession[]>([])
  const [curve, setCurve] = React.useState<CurveType>('even')
  const [showCurveMenu, setShowCurveMenu] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [initializing, setInitializing] = React.useState(true)

  // Load favorites from chain on mount
  React.useEffect(() => {
    async function loadFavorites() {
      if (!isLoggedIn || apiSessions.length === 0) {
        setInitializing(false)
        return
      }

      try {
        // Get topic IDs for all sessions
        const topicIds = apiSessions.map(s => getTopicId(s.id))
        const votes = await getVotes(topicIds)

        // Filter to favorited sessions (value > 0)
        const favorited = apiSessions
          .filter(s => {
            const topicId = getTopicId(s.id)
            return votes[topicId] > 0
          })
          .map(s => {
            const primaryHost = s.hosts?.find(h => h.isPrimary) || s.hosts?.[0]
            return {
              id: s.id,
              title: s.title,
              format: s.format || 'talk',
              duration: s.duration || 60,
              hostName: primaryHost?.name || 'Unknown Host',
            }
          })

        setRankedSessions(favorited)
      } catch (err) {
        console.error('Failed to load favorites:', err)
      } finally {
        setInitializing(false)
      }
    }

    loadFavorites()
  }, [isLoggedIn, apiSessions, getVotes])

  // Calculate weights based on current ranking and curve
  const weights = React.useMemo(() => {
    return normalizeWeights(calculateWeights(rankedSessions.length, curve))
  }, [rankedSessions.length, curve])

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))

    if (dragIndex === dropIndex) return

    const newSessions = [...rankedSessions]
    const [removed] = newSessions.splice(dragIndex, 1)
    newSessions.splice(dropIndex, 0, removed)

    setRankedSessions(newSessions)
    setHasChanges(true)
  }

  // Save handler - batch vote on chain
  const handleSave = async () => {
    if (rankedSessions.length === 0) return

    setIsSaving(true)
    setSaveError(null)

    try {
      // Build vote array with percentages
      const votes = rankedSessions.map((session, index) => ({
        topicId: getTopicId(session.id),
        value: weights[index]
      }))

      await batchVote(votes)
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to save votes:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  // Curve change handler
  const handleCurveChange = (newCurve: CurveType) => {
    setCurve(newCurve)
    setShowCurveMenu(false)
    setHasChanges(true)
  }

  const loading = sessionsLoading || initializing

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not authenticated
  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Your Vote Allocation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rank your favorites and choose how to distribute your vote
          </p>
        </div>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Sign in to view and manage your votes.
          </p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Vote Allocation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rank your favorites and choose how to distribute your vote
          </p>
        </div>

        {rankedSessions.length > 0 && (
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Allocation
              </>
            )}
          </Button>
        )}
      </div>

      {saveError && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {saveError}
        </div>
      )}

      {/* Summary Card */}
      <Card className="p-6 space-y-4">
        <CreditBar total={balance.totalCredits} spent={balance.creditsSpent} />

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold">{rankedSessions.length}</div>
            <div className="text-xs text-muted-foreground">Favorites</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold capitalize">{curve}</div>
            <div className="text-xs text-muted-foreground">Distribution</div>
          </div>
        </div>
      </Card>

      {rankedSessions.length > 0 ? (
        <>
          {/* Curve Selector */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Distribution Curve</h3>
                <p className="text-sm text-muted-foreground">{curveDescriptions[curve]}</p>
              </div>

              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowCurveMenu(!showCurveMenu)}
                  className="min-w-32"
                >
                  <span className="capitalize">{curve}</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>

                {showCurveMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowCurveMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-background p-1 shadow-lg z-20">
                      {(['even', 'linear', 'quadratic'] as CurveType[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => handleCurveChange(c)}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
                            curve === c && 'bg-accent'
                          )}
                        >
                          <span className="capitalize font-medium">{c}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Ranked Sessions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Drag to Reorder</h2>

            <div className="space-y-2">
              {rankedSessions.map((session, index) => {
                const FormatIcon = formatIcons[session.format] || Mic
                const percentage = weights[index]

                return (
                  <Card
                    key={session.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="p-4 cursor-move hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank number */}
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                      </div>

                      {/* Session info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <FormatIcon className="h-4 w-4" />
                          <span className="capitalize">{session.format}</span>
                          <span>•</span>
                          <span>{session.duration} min</span>
                        </div>
                        <Link
                          href={`/event/sessions/${session.id}`}
                          className="font-medium truncate hover:underline block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {session.title}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">
                          {session.hostName}
                        </p>
                      </div>

                      {/* Percentage */}
                      <div className="text-right">
                        <div className="text-2xl font-bold">{percentage}%</div>
                        <div className="text-xs text-muted-foreground">of your vote</div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Preview */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">Distribution Preview</h3>
            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
              {rankedSessions.map((session, index) => (
                <div
                  key={session.id}
                  style={{ width: `${weights[index]}%` }}
                  className={cn(
                    'h-full transition-all',
                    index === 0 ? 'bg-primary' :
                    index === 1 ? 'bg-primary/80' :
                    index === 2 ? 'bg-primary/60' :
                    index === 3 ? 'bg-primary/40' :
                    'bg-primary/20'
                  )}
                  title={`${session.title}: ${weights[index]}%`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{rankedSessions[0]?.title.slice(0, 20)}...</span>
              {rankedSessions.length > 1 && (
                <span>...{rankedSessions[rankedSessions.length - 1]?.title.slice(0, 20)}</span>
              )}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            You haven't favorited any sessions yet.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Add favorites from the Sessions page, then come back here to allocate your votes.
          </p>
          <Button asChild>
            <Link href="/event/sessions">Browse Sessions</Link>
          </Button>
        </Card>
      )}

      {/* Tip */}
      {rankedSessions.length > 0 && hasChanges && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm">
            <span className="font-medium">Reminder:</span>{' '}
            <span className="text-muted-foreground">
              Don't forget to save your allocation. Changes will be recorded on-chain.
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
