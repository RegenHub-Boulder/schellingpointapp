import { SessionDetailClient } from './session-detail-client'

// Generate static params for all session IDs at build time
export function generateStaticParams() {
  // In a real app, this would fetch from your API or database
  // For now, return the mock session IDs that exist in the app
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
    { id: '6' },
    { id: '7' },
    { id: '8' },
  ]
}

// Server component that wraps the client component
export default function SessionDetailPage() {
  return <SessionDetailClient />
}
