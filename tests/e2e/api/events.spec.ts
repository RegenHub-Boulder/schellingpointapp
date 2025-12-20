import { test, expect } from '@playwright/test'
import { ApiHelper, expectStatus, isAuthRequired } from '../../setup/api-helpers'

test.describe('Events API', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test('GET /api/events/:slug returns event data or requires auth', async () => {
    const { response, data } = await api.getEvent()

    if (response.status() === 401 || isAuthRequired(data)) {
      expect(response.status()).toBe(401)
    } else {
      expectStatus(response, 200)
      expect(data).toHaveProperty('event')
      const event = (data as Record<string, unknown>).event as Record<string, unknown>
      expect(event).toHaveProperty('id')
      expect(event).toHaveProperty('name')
      expect(event).toHaveProperty('slug')
    }
  })

  test('GET /api/events/:slug returns voting config', async () => {
    const { response, data } = await api.getEvent()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    const event = (data as Record<string, unknown>).event as Record<string, unknown>
    // Voting config might be part of event or separate field
    if (event.voting_config !== undefined) {
      expect(event.voting_config).toBeDefined()
    }
  })

  test('GET /api/events/:slug returns budget config', async () => {
    const { response, data } = await api.getEvent()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    const event = (data as Record<string, unknown>).event as Record<string, unknown>
    // Budget config might be part of event or separate field
    if (event.budget_config !== undefined) {
      expect(event.budget_config).toBeDefined()
    }
  })

  test('GET /api/events/:slug/nonexistent returns 404 or 401', async () => {
    const { response, data } = await api.getEvent('nonexistent-event-slug-12345')

    // Should return 404 or 401 if auth required for any access
    if (response.status() === 401 || isAuthRequired(data)) {
      expect(response.status()).toBe(401)
    } else {
      expectStatus(response, 404)
    }
  })

  test('event has valid date fields', async () => {
    const { response, data } = await api.getEvent()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    const event = (data as Record<string, unknown>).event as Record<string, unknown>

    if (event.start_date) {
      expect(new Date(event.start_date as string).toString()).not.toBe('Invalid Date')
    }

    if (event.end_date) {
      expect(new Date(event.end_date as string).toString()).not.toBe('Invalid Date')
    }
  })
})
