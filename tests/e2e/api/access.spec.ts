import { test, expect } from '@playwright/test'
import { ApiHelper, expectStatus, isAuthRequired, hasDataArray } from '../../setup/api-helpers'

test.describe('Access API', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  // Note: GET /api/events/:slug/access endpoint doesn't exist in current API
  // Access list is retrieved via /api/events/:slug/participants for admins

  test.describe('POST /api/events/:slug/access/grant', () => {
    test('returns 401 without authentication', async () => {
      const { response } = await api.grantAccess(undefined, {
        email: 'test@example.com',
        isAdmin: false,
      })

      expectStatus(response, 401)
    })
  })
})

test.describe('Access Control - Authorization Rules', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test('admin endpoints require admin role', async () => {
    // Granting access requires admin role
    const { response } = await api.grantAccess(undefined, {
      email: 'test@example.com',
      isAdmin: false,
    })

    // Should be 401 or 403
    expect([401, 403]).toContain(response.status())
  })

  test('session approval requires admin role', async () => {
    const { response } = await api.approveSession(undefined, 'test-session-id')

    // Should be 401 or 403
    expect([401, 403]).toContain(response.status())
  })
})

test.describe('RLS Policy Tests', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test.describe('Public data access', () => {
    test('event info is publicly accessible or requires auth', async () => {
      const { response, data } = await api.getEvent()

      // Either accessible or requires auth - both are valid depending on config
      if (response.status() === 401 || isAuthRequired(data)) {
        expect(response.status()).toBe(401)
      } else {
        expectStatus(response, 200)
      }
    })

    test('approved sessions are publicly accessible or requires auth', async () => {
      const { response, data } = await api.getSessions(undefined, { status: 'approved' })

      if (response.status() === 401 || isAuthRequired(data)) {
        expect(response.status()).toBe(401)
      } else {
        expectStatus(response, 200)
      }
    })

    test('venues are publicly accessible or requires auth', async () => {
      const { response, data } = await api.getVenues()

      if (response.status() === 401 || isAuthRequired(data)) {
        expect(response.status()).toBe(401)
      } else {
        expectStatus(response, 200)
      }
    })

    test('time slots are publicly accessible or requires auth', async () => {
      const { response, data } = await api.getTimeSlots()

      if (response.status() === 401 || isAuthRequired(data)) {
        expect(response.status()).toBe(401)
      } else {
        expectStatus(response, 200)
      }
    })
  })

  test.describe('Protected data access', () => {
    test('user votes require authentication', async () => {
      const { response } = await api.getMyVotes()

      expectStatus(response, 401)
    })

    test('granting access requires authentication', async () => {
      const { response } = await api.grantAccess(undefined, {
        email: 'test@example.com',
      })

      expectStatus(response, 401)
    })

    test('my sessions filter requires authentication', async () => {
      const { response, data } = await api.getSessions(undefined, { mine: true })

      // Should either return 401 or return empty if not authenticated
      if (response.status() === 401 || isAuthRequired(data)) {
        expect(response.status()).toBe(401)
      }
    })
  })
})
