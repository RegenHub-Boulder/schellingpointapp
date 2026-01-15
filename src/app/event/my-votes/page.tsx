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
import { useOnChainVotes, useVoteMutation } from '@/hooks/useOnChainVotes'

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

type CurveType = 'even' | 'sqrt' | 'linear' | 'exponential'

const curveLabels: Record<CurveType, string> = {
  even: 'Even',
  sqrt: 'Square Root',
  linear: 'Linear',
  exponential: 'Exponential',
}

const curveDescriptions: Record<CurveType, string> = {
  even: 'All favorites weighted equally',
  sqrt: 'Balanced distribution (spreads votes more evenly)',
  linear: 'Higher ranks get more weight (1st > 2nd > 3rd...)',
  exponential: 'Top-heavy distribution (1st gets much more than 2nd)',
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
    case 'sqrt':
      // sqrt(n), sqrt(n-1), sqrt(n-2), ... sqrt(1)
      // More balanced than linear - gives more weight to lower-ranked items
      weights = Array.from({ length: count }, (_, i) => Math.sqrt(count - i))
      break
    case 'linear':
      // n, n-1, n-2, ... 1
      weights = Array.from({ length: count }, (_, i) => count - i)
      break
    case 'exponential':
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

  // Get session IDs for the on-chain votes query
  const sessionIds = React.useMemo(() => apiSessions.map(s => s.id), [apiSessions])

  // Use the new React Query-based hooks
  const { votes, isLoading: votesLoading, isLoggedIn: hasPasskey } = useOnChainVotes({
    sessionIds,
    enabled: isLoggedIn && sessionIds.length > 0
  })
  const { castBatchVotes, isPending: isSaving, error: mutationError, reset: resetMutation } = useVoteMutation()

  // State
  const [rankedSessions, setRankedSessions] = React.useState<RankedSession[]>([])
  const [curve, setCurve] = React.useState<CurveType>('even')
  const [showCurveMenu, setShowCurveMenu] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = React.useState<number | null>(null)

  // Serialize votes for stable comparison to avoid infinite loops
  const votesKey = React.useMemo(() => JSON.stringify(votes), [votes])

  // Load favorites from cached votes when they become available
  React.useEffect(() => {
    if (!isLoggedIn || apiSessions.length === 0 || votesLoading) {
      return
    }

    // Parse votes from serialized key for stable reference
    const currentVotes: Record<string, number> = JSON.parse(votesKey)

    // Filter to favorited sessions (value > 0) using cached votes
    const favorited = apiSessions
      .filter(s => {
        // votes is keyed by session UUID, not topic ID
        return (currentVotes[s.id] || 0) > 0
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
  }, [isLoggedIn, apiSessions, votesKey, votesLoading])

  // Calculate weights based on current ranking and curve
  const weights = React.useMemo(() => {
    return normalizeWeights(calculateWeights(rankedSessions.length, curve))
  }, [rankedSessions.length, curve])

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
    e.dataTransfer.effectAllowed = 'move'
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    // Calculate if we're in the top or bottom half of the element
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const isAboveMid = e.clientY < midY

    // Determine where the indicator should appear
    let indicatorPos: number
    if (isAboveMid) {
      indicatorPos = index
    } else {
      indicatorPos = index + 1
    }

    // Don't show indicator at the dragged item's current position or adjacent
    if (draggedIndex !== null) {
      if (indicatorPos === draggedIndex || indicatorPos === draggedIndex + 1) {
        setDropIndicatorIndex(null)
        return
      }
    }

    setDropIndicatorIndex(indicatorPos)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the container entirely
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      // Check if we're leaving to another card in the list
      const parent = (e.currentTarget as HTMLElement).parentElement
      if (parent && !parent.contains(relatedTarget)) {
        setDropIndicatorIndex(null)
      }
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDropIndicatorIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))

    // Calculate actual drop position based on indicator
    let actualDropIndex = dropIndicatorIndex !== null ? dropIndicatorIndex : dropIndex

    // Clear drag state
    setDraggedIndex(null)
    setDropIndicatorIndex(null)

    if (dragIndex === actualDropIndex || dragIndex + 1 === actualDropIndex) return

    const newSessions = [...rankedSessions]
    const [removed] = newSessions.splice(dragIndex, 1)

    // Adjust index if dropping after the dragged item's original position
    if (actualDropIndex > dragIndex) {
      actualDropIndex -= 1
    }

    newSessions.splice(actualDropIndex, 0, removed)

    setRankedSessions(newSessions)
    setHasChanges(true)
  }

  // Save handler - batch vote on chain
  const handleSave = async () => {
    if (rankedSessions.length === 0) return

    setSaveError(null)
    resetMutation()

    try {
      // Build vote array with session UUIDs and percentages
      const voteParams = rankedSessions.map((session, index) => ({
        sessionId: session.id,
        value: weights[index]
      }))

      await castBatchVotes(voteParams)
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to save votes:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  // Curve change handler
  const handleCurveChange = (newCurve: CurveType) => {
    setCurve(newCurve)
    setShowCurveMenu(false)
    setHasChanges(true)
  }

  const loading = sessionsLoading || votesLoading

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
            <div className="text-2xl font-bold">{curveLabels[curve]}</div>
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
                  <span>{curveLabels[curve]}</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>

                {showCurveMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowCurveMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-background p-1 shadow-lg z-20">
                      {(['even', 'sqrt', 'linear', 'exponential'] as CurveType[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => handleCurveChange(c)}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
                            curve === c && 'bg-accent'
                          )}
                        >
                          <span className="font-medium">{curveLabels[c]}</span>
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
                const isDragging = draggedIndex === index

                return (
                  <React.Fragment key={session.id}>
                    {/* Drop indicator before this item */}
                    {dropIndicatorIndex === index && (
                      <div className="relative h-1 my-1">
                        <div className="absolute inset-x-0 h-0.5 bg-primary rounded-full" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                      </div>
                    )}
                    <Card
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index)}
                      className={cn(
                        "p-4 cursor-move hover:bg-accent/50 transition-all",
                        isDragging && "opacity-50 scale-[0.98]"
                      )}
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
                  </React.Fragment>
                )
              })}
              {/* Drop indicator after the last item */}
              {dropIndicatorIndex === rankedSessions.length && (
                <div className="relative h-1 my-1">
                  <div className="absolute inset-x-0 h-0.5 bg-primary rounded-full" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                </div>
              )}
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
