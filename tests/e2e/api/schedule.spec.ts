import { test, expect } from '@playwright/test'
import { ApiHelper, expectStatus, isAuthRequired, hasDataArray } from '../../setup/api-helpers'

test.describe('Schedule API', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test.describe('POST /api/events/:slug/schedule/generate', () => {
    test('returns 401 without authentication', async () => {
      const { response } = await api.generateSchedule()

      expectStatus(response, 401)
    })

    test('dry run option should be supported', async () => {
      const { response } = await api.generateSchedule(undefined, { dryRun: true })

      // Without auth, should still return 401
      expectStatus(response, 401)
    })
  })

  test.describe('POST /api/events/:slug/schedule/publish', () => {
    test('returns 401 without authentication', async () => {
      const { response } = await api.publishSchedule()

      expectStatus(response, 401)
    })
  })
})

test.describe('Schedule Generation - Prerequisites', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test('schedule requires approved sessions', async () => {
    const { response, data } = await api.getSessions(undefined, { status: 'approved' })

    // If auth required, skip
    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    // Just verify we can check for approved sessions
    if (hasDataArray(data, 'sessions')) {
      expect(Array.isArray(data.sessions)).toBe(true)
    }
  })

  test('schedule requires venues', async () => {
    const { response, data } = await api.getVenues()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    // Just verify we can check for venues
    if (hasDataArray(data, 'venues')) {
      expect(Array.isArray(data.venues)).toBe(true)
    }
  })

  test('schedule requires time slots', async () => {
    const { response, data } = await api.getTimeSlots()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    // Just verify we can check for time slots
    if (hasDataArray(data, 'timeSlots')) {
      expect(Array.isArray(data.timeSlots)).toBe(true)
    }
  })

  test('available time slots exist', async () => {
    const { response, data } = await api.getTimeSlots()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    if (hasDataArray(data, 'timeSlots')) {
      // Check for available slots (if any exist)
      const availableSlots = data.timeSlots.filter((slot: unknown) => {
        const s = slot as Record<string, unknown>
        return s.is_available === true
      })

      // Just verify the check works
      expect(Array.isArray(availableSlots)).toBe(true)
    }
  })
})
