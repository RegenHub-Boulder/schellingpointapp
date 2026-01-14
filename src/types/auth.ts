export interface AuthUser {
  id: string
  displayName?: string
  email?: string
  payoutAddress?: string
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  signerAddress: string | null
  signerExpiry: number | null
  isLoading: boolean
  isLoggedIn: boolean
  needsSignerRefresh: boolean
}

export interface AuthContextValue extends AuthState {
  login: () => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  refreshSession: () => Promise<void>
}
