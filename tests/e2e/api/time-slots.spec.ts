import { test, expect } from '@playwright/test'
import { ApiHelper, expectStatus, isAuthRequired, hasDataArray } from '../../setup/api-helpers'

test.describe('Time Slots API', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test.describe('GET /api/events/:slug/time-slots', () => {
    test('returns time slots list or requires auth', async () => {
      const { response, data } = await api.getTimeSlots()

      if (response.status() === 401 || isAuthRequired(data)) {
        expect(response.status()).toBe(401)
      } else {
        expectStatus(response, 200)
        expect(data).toHaveProperty('timeSlots')
        expect(Array.isArray(data.timeSlots)).toBe(true)
      }
    })

    test('time slot has expected fields', async () => {
      const { response, data } = await api.getTimeSlots()

      if (response.status() === 401 || isAuthRequired(data)) {
        test.skip()
        return
      }

      if (hasDataArray(data, 'timeSlots') && data.timeSlots.length > 0) {
        const slot = data.timeSlots[0] as Record<string, unknown>
        expect(slot).toHaveProperty('id')
        expect(slot).toHaveProperty('startTime')
        expect(slot).toHaveProperty('endTime')
      }
    })

    test('time slots have valid time values', async () => {
      const { response, data } = await api.getTimeSlots()

      if (response.status() === 401 || isAuthRequired(data)) {
        test.skip()
        return
      }

      if (hasDataArray(data, 'timeSlots')) {
        for (const slot of data.timeSlots) {
          const s = slot as Record<string, unknown>
          // Times should be valid ISO strings or timestamps
          expect(s.startTime).toBeDefined()
          expect(s.endTime).toBeDefined()
        }
      }
    })

    test('time slots are sorted by start time', async () => {
      const { response, data } = await api.getTimeSlots()

      if (response.status() === 401 || isAuthRequired(data)) {
        test.skip()
        return
      }

      if (hasDataArray(data, 'timeSlots') && data.timeSlots.length > 1) {
        for (let i = 1; i < data.timeSlots.length; i++) {
          const prevSlot = data.timeSlots[i - 1] as Record<string, unknown>
          const currSlot = data.timeSlots[i] as Record<string, unknown>
          const prevTime = new Date(prevSlot.startTime as string).getTime()
          const currTime = new Date(currSlot.startTime as string).getTime()
          expect(currTime).toBeGreaterThanOrEqual(prevTime)
        }
      }
    })
  })

  test.describe('POST /api/events/:slug/time-slots (requires admin)', () => {
    test('returns 401 without authentication', async () => {
      const { response } = await api.createTimeSlot(undefined, {
        startTime: '2025-03-01T09:00:00Z',
        endTime: '2025-03-01T10:00:00Z',
      })

      expectStatus(response, 401)
    })
  })
})

test.describe('Time Slots API - Business Logic', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test('isAvailable field indicates schedulable slots', async () => {
    const { response, data } = await api.getTimeSlots()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    if (hasDataArray(data, 'timeSlots')) {
      for (const slot of data.timeSlots) {
        const s = slot as Record<string, unknown>
        if (s.isAvailable !== undefined) {
          expect(typeof s.isAvailable).toBe('boolean')
        }
      }
    }
  })

  test('slots have reasonable duration', async () => {
    const { response, data } = await api.getTimeSlots()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    if (hasDataArray(data, 'timeSlots')) {
      for (const slot of data.timeSlots) {
        const s = slot as Record<string, unknown>
        const start = new Date(s.startTime as string).getTime()
        const end = new Date(s.endTime as string).getTime()
        const durationMinutes = (end - start) / (1000 * 60)

        // Slots should be between 15 minutes and 4 hours
        expect(durationMinutes).toBeGreaterThanOrEqual(15)
        expect(durationMinutes).toBeLessThanOrEqual(240)
      }
    }
  })
})
