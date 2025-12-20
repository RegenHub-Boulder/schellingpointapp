import { test, expect } from '@playwright/test'
import { ApiHelper, expectStatus, isAuthRequired, hasDataArray } from '../../setup/api-helpers'
import { generateTestVenue } from '../../fixtures/test-data'

test.describe('Venues API', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test.describe('GET /api/events/:slug/venues', () => {
    test('returns venues list or requires auth', async () => {
      const { response, data } = await api.getVenues()

      if (response.status() === 401 || isAuthRequired(data)) {
        expect(response.status()).toBe(401)
      } else {
        expectStatus(response, 200)
        expect(data).toHaveProperty('venues')
        expect(Array.isArray(data.venues)).toBe(true)
      }
    })

    test('venue has expected fields', async () => {
      const { response, data } = await api.getVenues()

      if (response.status() === 401 || isAuthRequired(data)) {
        test.skip()
        return
      }

      if (hasDataArray(data, 'venues') && data.venues.length > 0) {
        const venue = data.venues[0] as Record<string, unknown>
        expect(venue).toHaveProperty('id')
        expect(venue).toHaveProperty('name')
        expect(venue).toHaveProperty('capacity')
      }
    })

    test('venue capacity is positive number', async () => {
      const { response, data } = await api.getVenues()

      if (response.status() === 401 || isAuthRequired(data)) {
        test.skip()
        return
      }

      if (hasDataArray(data, 'venues')) {
        for (const venue of data.venues) {
          const v = venue as Record<string, unknown>
          expect(typeof v.capacity).toBe('number')
          expect(v.capacity).toBeGreaterThan(0)
        }
      }
    })

    test('venue features is array', async () => {
      const { response, data } = await api.getVenues()

      if (response.status() === 401 || isAuthRequired(data)) {
        test.skip()
        return
      }

      if (hasDataArray(data, 'venues')) {
        for (const venue of data.venues) {
          const v = venue as Record<string, unknown>
          if (v.features !== undefined) {
            expect(Array.isArray(v.features)).toBe(true)
          }
        }
      }
    })
  })

  test.describe('POST /api/events/:slug/venues (requires admin)', () => {
    test('returns 401 without authentication', async () => {
      const venueData = generateTestVenue()
      const { response } = await api.createVenue(undefined, venueData)

      expectStatus(response, 401)
    })
  })

  test.describe('PATCH /api/events/:slug/venues/:id (requires admin)', () => {
    test('returns 401 without authentication', async () => {
      const { response } = await api.updateVenue(undefined, 'test-venue-id', { name: 'Updated Name' })

      expectStatus(response, 401)
    })
  })

  test.describe('DELETE /api/events/:slug/venues/:id (requires admin)', () => {
    test('returns 401 without authentication', async () => {
      const { response } = await api.deleteVenue(undefined, 'test-venue-id')

      expectStatus(response, 401)
    })
  })
})

test.describe('Venues API - Data Validation', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test('venues are sorted by display order', async () => {
    const { response, data } = await api.getVenues()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    if (hasDataArray(data, 'venues') && data.venues.length > 1) {
      for (let i = 1; i < data.venues.length; i++) {
        const prevVenue = data.venues[i - 1] as Record<string, unknown>
        const currVenue = data.venues[i] as Record<string, unknown>
        const prevOrder = (prevVenue.display_order as number) ?? 0
        const currOrder = (currVenue.display_order as number) ?? 0
        expect(currOrder).toBeGreaterThanOrEqual(prevOrder)
      }
    }
  })

  test('venue names are non-empty strings', async () => {
    const { response, data } = await api.getVenues()

    if (response.status() === 401 || isAuthRequired(data)) {
      test.skip()
      return
    }

    if (hasDataArray(data, 'venues')) {
      for (const venue of data.venues) {
        const v = venue as Record<string, unknown>
        expect(typeof v.name).toBe('string')
        expect((v.name as string).length).toBeGreaterThan(0)
      }
    }
  })
})
