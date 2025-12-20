'use client'

import { useState, useEffect, useCallback } from 'react'
import { EVENT_SLUG } from '@/lib/config'

export interface Event {
  id: string
  slug: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  location: string | null
  bannerImageUrl: string | null
  schedulePublished: boolean
  scheduleLocked: boolean
  distributionExecuted: boolean
  createdAt: string
  updatedAt: string
}

export interface AccessMode {
  mode: string
  nftContractAddress: string | null
  nftChainId: number | null
}

export interface VotingConfig {
  preVoteCredits: number
  attendanceVoteCredits: number
  proposalDeadline: string | null
  preVoteDeadline: string | null
  votingOpensAt: string | null
}

export interface BudgetConfig {
  totalBudgetPool: number
  paymentTokenAddress: string | null
  paymentTokenSymbol: string | null
  platformFeePercent: number
  treasuryWalletAddress: string | null
}

interface UseEventReturn {
  event: Event | null
  accessMode: AccessMode | null
  votingConfig: VotingConfig | null
  budgetConfig: BudgetConfig | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useEvent(slug: string = EVENT_SLUG): UseEventReturn {
  const [event, setEvent] = useState<Event | null>(null)
  const [accessMode, setAccessMode] = useState<AccessMode | null>(null)
  const [votingConfig, setVotingConfig] = useState<VotingConfig | null>(null)
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvent = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${slug}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch event')
      }

      const data = await response.json()
      setEvent(data.event)
      setAccessMode(data.accessMode)
      setVotingConfig(data.votingConfig)
      setBudgetConfig(data.budgetConfig)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  return { event, accessMode, votingConfig, budgetConfig, loading, error, refetch: fetchEvent }
}
