'use client'

import * as React from 'react'
import { ethers } from 'ethers'
import { AuthUser, AuthContextValue } from '@/types/auth'

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

interface PasskeyInfo {
  credentialId: string
  userId: string
  pubKeyX: string
  pubKeyY: string
}

interface SessionKey {
  privateKey: string
  address: string
  expiry: number
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [signerAddress, setSignerAddress] = React.useState<string | null>(null)
  const [signerExpiry, setSignerExpiry] = React.useState<number | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const isLoggedIn = !!user && !!token

  // Check for existing session on mount
  React.useEffect(() => {
    async function checkExistingSession() {
      setIsLoading(true)
      try {
        // Check for stored token
        const storedToken = localStorage.getItem('authToken')
        if (!storedToken) {
          return
        }

        // Validate token with server
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setToken(storedToken)
          setSignerAddress(data.signerAddress)
          setSignerExpiry(data.signerExpiry)
        } else {
          // Token invalid, clear storage
          localStorage.removeItem('authToken')
        }
      } catch (error) {
        console.error('Session check failed:', error)
        localStorage.removeItem('authToken')
      } finally {
        setIsLoading(false)
      }
    }
    checkExistingSession()
  }, [])

  const login = React.useCallback(async (): Promise<void> => {
    // Get passkey and session key from localStorage
    const passkeyData = localStorage.getItem('passkeyInfo')
    const sessionData = localStorage.getItem('sessionKey')

    if (!passkeyData) {
      throw new Error('No passkey found. Please register first.')
    }

    if (!sessionData) {
      throw new Error('No session found. Please authorize first.')
    }

    const passkeyInfo: PasskeyInfo = JSON.parse(passkeyData)
    const sessionKey: SessionKey = JSON.parse(sessionData)

    // Check if session key is still valid
    const currentTime = Math.floor(Date.now() / 1000)
    if (sessionKey.expiry <= currentTime) {
      throw new Error('Session expired. Please re-authorize.')
    }

    // Step 1: Get challenge from server
    const challengeResponse = await fetch('/api/login/challenge')
    if (!challengeResponse.ok) {
      throw new Error('Failed to get login challenge')
    }
    const { challengeId, challenge } = await challengeResponse.json()

    // Step 2: Sign challenge with ephemeral signer (raw sign, no EIP-191 prefix)
    const messageHash = ethers.keccak256(
      ethers.toUtf8Bytes(`login:${challenge}`)
    )
    const signingKey = new ethers.SigningKey(sessionKey.privateKey)
    const sig = signingKey.sign(messageHash)
    const signature = ethers.Signature.from(sig).serialized

    // Step 3: Send to login endpoint
    const loginResponse = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pubKeyX: passkeyInfo.pubKeyX,
        pubKeyY: passkeyInfo.pubKeyY,
        signer: sessionKey.address,
        challengeId,
        signature
      })
    })

    if (!loginResponse.ok) {
      const error = await loginResponse.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await loginResponse.json()

    // Store token and update state
    localStorage.setItem('authToken', data.token)
    setToken(data.token)
    setUser(data.user)
    setSignerAddress(sessionKey.address)
    setSignerExpiry(sessionKey.expiry)
  }, [])

  const logout = React.useCallback((): void => {
    localStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
    setSignerAddress(null)
    setSignerExpiry(null)
    // Note: We keep passkeyInfo and sessionKey for easy re-login
  }, [])

  const refreshUser = React.useCallback(async (): Promise<void> => {
    if (!token) return

    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.ok) {
      const data = await response.json()
      setUser(data.user)
    } else {
      // Token expired, try to re-login
      try {
        await login()
      } catch {
        logout()
      }
    }
  }, [token, login, logout])

  const value = React.useMemo<AuthContextValue>(() => ({
    user,
    token,
    signerAddress,
    signerExpiry,
    isLoading,
    isLoggedIn,
    login,
    logout,
    refreshUser
  }), [user, token, signerAddress, signerExpiry, isLoading, isLoggedIn, login, logout, refreshUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
