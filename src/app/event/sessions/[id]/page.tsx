import { SessionDetailClient } from './session-detail-client'

// Dynamic rendering for session detail pages
export const dynamic = 'force-dynamic'

// Server component that wraps the client component
export default function SessionDetailPage() {
  return <SessionDetailClient />
}
