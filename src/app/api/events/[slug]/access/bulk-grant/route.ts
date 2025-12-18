import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/events/:slug/access/bulk-grant - Bulk grant access via CSV (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  // Check if user is event admin
  const { data: accessRecord } = await supabase
    .from('event_access')
    .select('is_admin')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!accessRecord?.is_admin) {
    return NextResponse.json(
      { error: 'Only event admins can bulk grant access' },
      { status: 403 }
    )
  }

  // Parse form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { error: 'CSV file is required' },
      { status: 400 }
    )
  }

  // Read and parse CSV
  const csvText = await file.text()
  const lines = csvText.split('\n').filter(line => line.trim())

  if (lines.length < 2) {
    return NextResponse.json(
      { error: 'CSV must have a header row and at least one data row' },
      { status: 400 }
    )
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const emailIndex = header.indexOf('email')
  const isAdminIndex = header.indexOf('isadmin')

  if (emailIndex === -1) {
    return NextResponse.json(
      { error: 'CSV must have an "email" column' },
      { status: 400 }
    )
  }

  // Process rows
  const granted: string[] = []
  const failed: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(cell => cell.trim())
    const email = row[emailIndex]
    const isAdmin = isAdminIndex !== -1 && row[isAdminIndex]?.toLowerCase() === 'true'

    if (!email || !email.includes('@')) {
      failed.push(`Row ${i + 1}: Invalid email "${email}"`)
      continue
    }

    try {
      // Try to find existing user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      // Check if access exists
      const existingAccessQuery = supabase
        .from('event_access')
        .select('id')
        .eq('event_id', event.id)

      if (existingUser) {
        existingAccessQuery.eq('user_id', existingUser.id)
      } else {
        existingAccessQuery.eq('email', email)
      }

      const { data: existingAccess } = await existingAccessQuery.single()

      if (existingAccess) {
        // Update existing
        await supabase
          .from('event_access')
          .update({ access_granted: true, is_admin: isAdmin })
          .eq('id', existingAccess.id)
      } else {
        // Create new
        const accessData: Record<string, unknown> = {
          event_id: event.id,
          email,
          access_granted: true,
          is_admin: isAdmin
        }

        if (existingUser) {
          accessData.user_id = existingUser.id
        }

        await supabase.from('event_access').insert(accessData)
      }

      granted.push(email)
    } catch {
      failed.push(`Row ${i + 1}: Failed to grant access to "${email}"`)
    }
  }

  return NextResponse.json({
    granted: granted.length,
    failed
  })
}
