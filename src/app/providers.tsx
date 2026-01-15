'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { QueryProvider } from '@/providers/query-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryProvider>
  )
}
