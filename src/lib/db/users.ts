// Service layer for users table - abstract DB operations for testability
import { createClient } from '@supabase/supabase-js'
import { Database, Tables } from '@/types/supabase'

export type User = Tables<'users'>
export type UserPasskey = Tables<'user_passkeys'>

export interface UserWithPasskey {
  user: User
  passkey: UserPasskey
}

// Get Supabase client (uses env vars)
function getSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getUserByPasskey(pubkeyX: string, pubkeyY: string): Promise<User | null> {
  const supabase = getSupabase()

  // Look up passkey in user_passkeys table, join to users
  const { data, error } = await supabase
    .from('user_passkeys')
    .select('user_id, users(*)')
    .eq('pubkey_x', pubkeyX)
    .eq('pubkey_y', pubkeyY)
    .single()

  if (error || !data || !data.users) return null
  return data.users
}

export async function registerPasskey(
  userId: string,
  pubkeyX: string,
  pubkeyY: string,
  credentialId: string
): Promise<boolean> {
  const supabase = getSupabase()

  // Insert into user_passkeys table (supports multiple passkeys per user)
  const { error: passkeyError } = await supabase
    .from('user_passkeys')
    .insert({
      user_id: userId,
      pubkey_x: pubkeyX,
      pubkey_y: pubkeyY,
      credential_id: credentialId
    })

  return !passkeyError
}

export async function getUserByCredentialId(credentialId: string): Promise<User | null> {
  const supabase = getSupabase()

  // Look up credential in user_passkeys table, join to users
  const { data, error } = await supabase
    .from('user_passkeys')
    .select('user_id, users(*)')
    .eq('credential_id', credentialId)
    .single()

  if (error || !data || !data.users) return null
  return data.users
}

// Get user and passkey data together (for login/lookup flows)
export async function getUserWithPasskeyByCredentialId(credentialId: string): Promise<UserWithPasskey | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('user_passkeys')
    .select('*, users(*)')
    .eq('credential_id', credentialId)
    .single()

  if (error || !data || !data.users) return null

  return {
    user: data.users,
    passkey: data
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !data) return null
  return data
}

export async function createUser(email: string): Promise<User> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .insert({ email })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create user: ${error?.message || 'Unknown error'}`)
  }
  return data
}
