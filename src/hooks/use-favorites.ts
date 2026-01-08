'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'schelling-point-favorites'

interface UseFavoritesReturn {
  favorites: Set<string>
  isFavorited: (sessionId: string) => boolean
  toggleFavorite: (sessionId: string) => void
  addFavorite: (sessionId: string) => void
  removeFavorite: (sessionId: string) => void
  clearFavorites: () => void
}

export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
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
    setIsInitialized(true)
  }, [])

  // Save to localStorage whenever favorites change (after initialization)
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favorites)))
    } catch (err) {
      console.error('Failed to save favorites to localStorage:', err)
    }
  }, [favorites, isInitialized])

  const isFavorited = useCallback((sessionId: string): boolean => {
    return favorites.has(sessionId)
  }, [favorites])

  const toggleFavorite = useCallback((sessionId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }, [])

  const addFavorite = useCallback((sessionId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.add(sessionId)
      return next
    })
  }, [])

  const removeFavorite = useCallback((sessionId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.delete(sessionId)
      return next
    })
  }, [])

  const clearFavorites = useCallback(() => {
    setFavorites(new Set())
  }, [])

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
  }
}
