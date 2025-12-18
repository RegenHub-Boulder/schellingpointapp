/**
 * Application configuration
 */

/** The event slug to use for API calls */
export const EVENT_SLUG = process.env.NEXT_PUBLIC_EVENT_SLUG || 'ethdenver-2025'

/** Supabase configuration */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
