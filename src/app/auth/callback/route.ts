import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Session is now set via cookies
      // Redirect to register page to complete passkey setup
      return NextResponse.redirect(new URL('/register', requestUrl.origin))
    }
  }

  // Error case
  return NextResponse.redirect(new URL('/?error=auth_callback_error', requestUrl.origin))
}
