'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { EVENT_SLUG } from '@/lib/config'

const STORAGE_KEY = 'schelling-point-favorites'

interface UseFavoritesReturn {
  favorites: Set<string>
  isLoading: boolean
  isFavorited: (sessionId: string) => boolean
  toggleFavorite: (sessionId: string) => Promise<void>
  addFavorite: (sessionId: string) => Promise<void>
  removeFavorite: (sessionId: string) => Promise<void>
  clearFavorites: () => void
  refetch: () => Promise<void>
}

export function useFavorites(): UseFavoritesReturn {
  const { token, isLoggedIn } = useAuth()
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load favorites from API or localStorage
  const loadFavorites = useCallback(async () => {
    setIsLoading(true)

    try {
      if (isLoggedIn && token) {
        // Fetch from API for authenticated users
        const response = await fetch(`/api/events/${EVENT_SLUG}/favorites`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setFavorites(new Set(data.sessionIds || []))
        } else {
          // Fall back to localStorage if API fails
          loadFromLocalStorage()
        }
      } else {
        // Use localStorage for non-authenticated users
        loadFromLocalStorage()
      }
    } catch (err) {
      console.error('Failed to load favorites:', err)
      loadFromLocalStorage()
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [isLoggedIn, token])

  const loadFromLocalStorage = () => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setFavorites(new Set(parsed))
        }
      }
    } catch (err) {
      console.error('Failed to load favorites from localStorage:', err)
    }
  }

  // Save to localStorage (always, as backup)
  const saveToLocalStorage = useCallback((favs: Set<string>) => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favs)))
    } catch (err) {
      console.error('Failed to save favorites to localStorage:', err)
    }
  }, [])

  // Load on mount and when auth state changes
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  // Save to localStorage whenever favorites change (after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveToLocalStorage(favorites)
    }
  }, [favorites, isInitialized, saveToLocalStorage])

  const isFavorited = useCallback((sessionId: string): boolean => {
    return favorites.has(sessionId)
  }, [favorites])

  const addFavorite = useCallback(async (sessionId: string) => {
    // Optimistically update UI
    setFavorites(prev => {
      const next = new Set(prev)
      next.add(sessionId)
      return next
    })

    // If authenticated, sync with API
    if (isLoggedIn && token) {
      try {
        const response = await fetch(`/api/events/${EVENT_SLUG}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        })

        if (!response.ok) {
          // Revert on failure
          setFavorites(prev => {
            const next = new Set(prev)
            next.delete(sessionId)
            return next
          })
          console.error('Failed to add favorite to API')
        }
      } catch (err) {
        // Revert on error
        setFavorites(prev => {
          const next = new Set(prev)
          next.delete(sessionId)
          return next
        })
        console.error('Failed to add favorite:', err)
      }
    }
  }, [isLoggedIn, token])

  const removeFavorite = useCallback(async (sessionId: string) => {
    // Optimistically update UI
    setFavorites(prev => {
      const next = new Set(prev)
      next.delete(sessionId)
      return next
    })

    // If authenticated, sync with API
    if (isLoggedIn && token) {
      try {
        const response = await fetch(
          `/api/events/${EVENT_SLUG}/favorites?sessionId=${sessionId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          // Revert on failure
          setFavorites(prev => {
            const next = new Set(prev)
            next.add(sessionId)
            return next
          })
          console.error('Failed to remove favorite from API')
        }
      } catch (err) {
        // Revert on error
        setFavorites(prev => {
          const next = new Set(prev)
          next.add(sessionId)
          return next
        })
        console.error('Failed to remove favorite:', err)
      }
    }
  }, [isLoggedIn, token])

  const toggleFavorite = useCallback(async (sessionId: string) => {
    if (favorites.has(sessionId)) {
      await removeFavorite(sessionId)
    } else {
      await addFavorite(sessionId)
    }
  }, [favorites, addFavorite, removeFavorite])

  const clearFavorites = useCallback(() => {
    setFavorites(new Set())
  }, [])

  return {
    favorites,
    isLoading,
    isFavorited,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
    refetch: loadFavorites,
  }
}
