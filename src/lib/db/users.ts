// Service layer for users table - abstract DB operations for testability
import { createClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  invite_code: string | null
  pubkey_x: string | null
  pubkey_y: string | null
  payout_address: string | null
  display_name: string | null
}

// Get Supabase client (uses env vars)
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getUserByInviteCode(code: string): Promise<User | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('invite_code', code)
    .is('pubkey_x', null)  // not already registered
    .single()

  if (error || !data) return null
  return data as User
}

export async function getUserByPasskey(pubkeyX: string, pubkeyY: string): Promise<User | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('pubkey_x', pubkeyX)
    .eq('pubkey_y', pubkeyY)
    .single()

  if (error || !data) return null
  return data as User
}

export async function registerPasskey(
  userId: string,
  pubkeyX: string,
  pubkeyY: string
): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('users')
    .update({
      pubkey_x: pubkeyX,
      pubkey_y: pubkeyY,
      invite_code: null  // burn the invite code
    })
    .eq('id', userId)

  return !error
}
