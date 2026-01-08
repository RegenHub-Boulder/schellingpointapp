import { test, expect } from '@playwright/test'
import { ApiHelper, expectStatus, expectFields, isAuthRequired, hasDataArray } from '../../setup/api-helpers'
import { generateTestSession } from '../../fixtures/test-data'

test.describe('Sessions API', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test.describe('GET /api/events/:slug/sessions', () => {
    test('returns sessions list or requires auth', async () => {
      const { response, data } = await api.getSessions()

      // Either returns 200 with sessions or 401 requiring auth
      if (response.status() === 401 || isAuthRequired(data)) {
        expect(response.status()).toBe(401)
      } else {
        expectStatus(response, 200)
        expect(data).toHaveProperty('sessions')
        expect(Array.isArray(data.sessions)).toBe(true)
      }
    })

    test('filters by status', async () => {
      const { response, data } = await api.getSessions(undefined, { status: 'approved' })

      if (response.status() === 401 || isAuthRequired(data)) {
        test.skip()
        return
      }

      expectStatus(response, 200)
      if (hasDataArray(data, 'sessions')) {
        // All returned sessions should have approved status
        for (const session of data.sessions) {
          expect((session as Record<string, unknown>).status).toBe('approved')
        }
      }
    })

    test('filters by format', async () => {
      const { response, data } = await api.getSessions(undefined, { format: 'workshop' })

      if (response.status() === 401 || isAuthRequired(data)) {
        test.skip()
        return
      }

      expectStatus(response, 200)
      if (hasDataArray(data, 'sessions')) {
        // All returned sessions should have workshop format
        for (const session of data.sessions) {
          expect((session as Record<string, unknown>).format).toBe('workshop')
        }
      }
    })

    test('returns session with expected fields', async () => {
      const { response, data } = await api.getSessions()

      if (response.status() === 401 || isAuthRequired(data)) {
        test.skip()
        return
      }

      if (hasDataArray(data, 'sessions') && data.sessions.length > 0) {
        const session = data.sessions[0] as Record<string, unknown>
        expect(session).toHaveProperty('id')
        expect(session).toHaveProperty('title')
        expect(session).toHaveProperty('format')
        expect(session).toHaveProperty('status')
      }
    })
  })

  test.describe('GET /api/events/:slug/sessions/:id', () => {
    test('returns single session details', async () => {
      const { response: listResponse, data: listData } = await api.getSessions()

      if (listResponse.status() === 401 || isAuthRequired(listData)) {
        test.skip()
        return
      }

      if (!hasDataArray(listData, 'sessions') || listData.sessions.length === 0) {
        test.skip()
        return
      }

      const sessionId = (listData.sessions[0] as Record<string, unknown>).id as string
      const { response, data } = await api.getSession(undefined, sessionId)

      expectStatus(response, 200)
      expect(data).toHaveProperty('session')
      expect((data as Record<string, unknown>).session).toHaveProperty('id')
    })

    test('returns 404 for nonexistent session', async () => {
      const { response, data } = await api.getSession(undefined, 'nonexistent-session-id-12345')

      // Should return 404 or 401 if auth required
      if (response.status() === 401 || isAuthRequired(data)) {
        expect(response.status()).toBe(401)
      } else {
        expectStatus(response, 404)
      }
    })

    test('session detail has core fields', async () => {
      const { response: listResponse, data: listData } = await api.getSessions()

      if (listResponse.status() === 401 || isAuthRequired(listData)) {
        test.skip()
        return
      }

      if (!hasDataArray(listData, 'sessions') || listData.sessions.length === 0) {
        test.skip()
        return
      }

      const sessionId = (listData.sessions[0] as Record<string, unknown>).id as string
      const { data } = await api.getSession(undefined, sessionId)

      const session = (data as Record<string, unknown>).session as Record<string, unknown>
      expect(session).toHaveProperty('id')
      expect(session).toHaveProperty('title')
      expect(session).toHaveProperty('description')
      expect(session).toHaveProperty('format')
      expect(session).toHaveProperty('duration')
      // hosts may or may not be included depending on API version
      if (session.hosts !== undefined) {
        expect(Array.isArray(session.hosts)).toBe(true)
      }
    })
  })

  test.describe('POST /api/events/:slug/sessions (requires auth)', () => {
    test('returns 401 without authentication', async () => {
      const sessionData = generateTestSession()
      const { response } = await api.createSession(undefined, sessionData)

      expectStatus(response, 401)
    })
  })

  test.describe('Session approval endpoints (requires admin)', () => {
    test('POST /approve returns 401 without authentication', async () => {
      // Use a placeholder ID since we're testing auth, not data access
      const { response } = await api.approveSession(undefined, 'test-session-id')

      expectStatus(response, 401)
    })

    test('POST /reject returns 401 without authentication', async () => {
      // Use a placeholder ID since we're testing auth, not data access
      const { response } = await api.rejectSession(undefined, 'test-session-id', 'Test rejection')

      expectStatus(response, 401)
    })
  })
})

test.describe('Sessions API - Data Validation', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test('session has valid duration', async () => {
    const { response, data } = await api.getSessions()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    if (hasDataArray(data, 'sessions')) {
      for (const session of data.sessions) {
        const s = session as Record<string, unknown>
        if (s.duration !== undefined) {
          expect(s.duration).toBeGreaterThan(0)
          expect(s.duration).toBeLessThanOrEqual(180) // Max 3 hours
        }
      }
    }
  })

  test('session format is valid enum', async () => {
    const validFormats = ['talk', 'workshop', 'discussion', 'panel', 'demo', 'lightning']
    const { response, data } = await api.getSessions()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    if (hasDataArray(data, 'sessions')) {
      for (const session of data.sessions) {
        expect(validFormats).toContain((session as Record<string, unknown>).format)
      }
    }
  })

  test('session status is valid enum', async () => {
    const validStatuses = ['pending', 'approved', 'rejected', 'scheduled', 'cancelled']
    const { response, data } = await api.getSessions()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    if (hasDataArray(data, 'sessions')) {
      for (const session of data.sessions) {
        expect(validStatuses).toContain((session as Record<string, unknown>).status)
      }
    }
  })
})
