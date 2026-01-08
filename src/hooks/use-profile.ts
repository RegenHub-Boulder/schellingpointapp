'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Profile {
  id: string
  email: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  topics: string[] | null
  smartWalletAddress: string | null
  ensAddress: string | null
  payoutAddress: string | null
  createdAt: string
  updatedAt: string
}

export interface ProfileUpdate {
  displayName?: string
  bio?: string
  avatarUrl?: string
  topics?: string[]
  payoutAddress?: string
  ensAddress?: string
}

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  updateProfile: (data: ProfileUpdate) => Promise<{ success: boolean; error?: string }>
  refetch: () => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/profile')

      if (response.status === 401) {
        setError('Please sign in to view your profile')
        setProfile(null)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch profile')
      }

      const data = await response.json()
      setProfile(data.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (data: ProfileUpdate): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        return { success: false, error: result.error || 'Failed to update profile' }
      }

      const result = await response.json()
      setProfile(result.profile)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, updateProfile, refetch: fetchProfile }
}
