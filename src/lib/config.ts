/**
 * Application configuration
 */

/** The event slug to use for API calls (Supabase) */
export const EVENT_SLUG = process.env.NEXT_PUBLIC_EVENT_SLUG || 'ethdenver-2025'

/** The on-chain event name — keccak256 of this is the contract's eventId */
export const EVENT_NAME = 'schelling-point-2025'

/** Supabase configuration */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
