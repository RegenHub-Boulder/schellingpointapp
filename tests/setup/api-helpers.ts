import { APIRequestContext, expect } from '@playwright/test'
import { TEST_EVENT_SLUG, API_BASE_URL } from './test-utils'

/**
 * API helper class for making authenticated requests
 */
export class ApiHelper {
  private request: APIRequestContext
  private baseUrl: string
  private authToken?: string

  constructor(request: APIRequestContext, baseUrl = API_BASE_URL) {
    this.request = request
    this.baseUrl = baseUrl
  }

  /**
   * Set auth token for subsequent requests
   */
  setAuthToken(token: string) {
    this.authToken = token
  }

  /**
   * Get default headers including auth if available
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }
    return headers
  }

  /**
   * Safely parse response body - handles both JSON and text responses
   */
  private async safeParseResponse(response: { text: () => Promise<string>; status: () => number }) {
    const text = await response.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      // Response is not valid JSON - return as text wrapped in object
      return { error: text, status: response.status() }
    }
  }

  // ==================== Event API ====================

  async getEvent(slug = TEST_EVENT_SLUG) {
    const response = await this.request.get(`${this.baseUrl}/api/events/${slug}`, {
      headers: this.getHeaders(),
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  // ==================== Sessions API ====================

  async getSessions(slug = TEST_EVENT_SLUG, params?: { status?: string; format?: string; mine?: boolean }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.format) searchParams.set('format', params.format)
    if (params?.mine) searchParams.set('mine', 'true')

    const url = `${this.baseUrl}/api/events/${slug}/sessions${searchParams.toString() ? '?' + searchParams.toString() : ''}`
    const response = await this.request.get(url, {
      headers: this.getHeaders(),
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async getSession(slug = TEST_EVENT_SLUG, sessionId: string) {
    const response = await this.request.get(`${this.baseUrl}/api/events/${slug}/sessions/${sessionId}`, {
      headers: this.getHeaders(),
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async createSession(slug = TEST_EVENT_SLUG, sessionData: {
    title: string
    description: string
    format: string
    duration: number
    track?: string
    tags?: string[]
    technicalRequirements?: string[]
  }) {
    const response = await this.request.post(`${this.baseUrl}/api/events/${slug}/sessions`, {
      headers: this.getHeaders(),
      data: sessionData,
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async updateSession(slug = TEST_EVENT_SLUG, sessionId: string, updates: Record<string, unknown>) {
    const response = await this.request.patch(`${this.baseUrl}/api/events/${slug}/sessions/${sessionId}`, {
      headers: this.getHeaders(),
      data: updates,
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async deleteSession(slug = TEST_EVENT_SLUG, sessionId: string) {
    const response = await this.request.delete(`${this.baseUrl}/api/events/${slug}/sessions/${sessionId}`, {
      headers: this.getHeaders(),
    })
    return { response, data: response.status() === 204 ? null : await this.safeParseResponse(response) }
  }

  async approveSession(slug = TEST_EVENT_SLUG, sessionId: string) {
    const response = await this.request.post(`${this.baseUrl}/api/events/${slug}/sessions/${sessionId}/approve`, {
      headers: this.getHeaders(),
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async rejectSession(slug = TEST_EVENT_SLUG, sessionId: string, reason?: string) {
    const response = await this.request.post(`${this.baseUrl}/api/events/${slug}/sessions/${sessionId}/reject`, {
      headers: this.getHeaders(),
      data: { reason },
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  // ==================== Venues API ====================

  async getVenues(slug = TEST_EVENT_SLUG) {
    const response = await this.request.get(`${this.baseUrl}/api/events/${slug}/venues`, {
      headers: this.getHeaders(),
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async createVenue(slug = TEST_EVENT_SLUG, venueData: {
    name: string
    capacity: number
    features?: string[]
    description?: string
  }) {
    const response = await this.request.post(`${this.baseUrl}/api/events/${slug}/venues`, {
      headers: this.getHeaders(),
      data: venueData,
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async updateVenue(slug = TEST_EVENT_SLUG, venueId: string, updates: Record<string, unknown>) {
    const response = await this.request.patch(`${this.baseUrl}/api/events/${slug}/venues/${venueId}`, {
      headers: this.getHeaders(),
      data: updates,
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async deleteVenue(slug = TEST_EVENT_SLUG, venueId: string) {
    const response = await this.request.delete(`${this.baseUrl}/api/events/${slug}/venues/${venueId}`, {
      headers: this.getHeaders(),
    })
    return { response, data: response.status() === 204 ? null : await this.safeParseResponse(response) }
  }

  // ==================== Time Slots API ====================

  async getTimeSlots(slug = TEST_EVENT_SLUG) {
    const response = await this.request.get(`${this.baseUrl}/api/events/${slug}/time-slots`, {
      headers: this.getHeaders(),
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async createTimeSlot(slug = TEST_EVENT_SLUG, slotData: {
    startTime: string
    endTime: string
    label?: string
    isAvailable?: boolean
  }) {
    const response = await this.request.post(`${this.baseUrl}/api/events/${slug}/time-slots`, {
      headers: this.getHeaders(),
      data: slotData,
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  // ==================== Votes API ====================

  async getMyVotes(slug = TEST_EVENT_SLUG) {
    const response = await this.request.get(`${this.baseUrl}/api/events/${slug}/votes/me`, {
      headers: this.getHeaders(),
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async castVote(slug = TEST_EVENT_SLUG, sessionId: string, voteCount: number) {
    const response = await this.request.post(`${this.baseUrl}/api/events/${slug}/votes`, {
      headers: this.getHeaders(),
      data: { sessionId, voteCount },
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  // ==================== Access API ====================

  async getAccess(slug = TEST_EVENT_SLUG) {
    const response = await this.request.get(`${this.baseUrl}/api/events/${slug}/access`, {
      headers: this.getHeaders(),
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async grantAccess(slug = TEST_EVENT_SLUG, accessData: {
    email: string
    isAdmin?: boolean
  }) {
    const response = await this.request.post(`${this.baseUrl}/api/events/${slug}/access`, {
      headers: this.getHeaders(),
      data: accessData,
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  // ==================== Schedule API ====================

  async generateSchedule(slug = TEST_EVENT_SLUG, options?: { dryRun?: boolean }) {
    const response = await this.request.post(`${this.baseUrl}/api/events/${slug}/schedule/generate`, {
      headers: this.getHeaders(),
      data: options || {},
    })
    return { response, data: await this.safeParseResponse(response) }
  }

  async publishSchedule(slug = TEST_EVENT_SLUG) {
    const response = await this.request.post(`${this.baseUrl}/api/events/${slug}/schedule/publish`, {
      headers: this.getHeaders(),
    })
    return { response, data: await this.safeParseResponse(response) }
  }
}

/**
 * Assert API response status
 */
export function expectStatus(response: { status: () => number }, expectedStatus: number) {
  expect(response.status()).toBe(expectedStatus)
}

/**
 * Assert API response contains expected fields
 */
export function expectFields<T>(data: T, fields: (keyof T)[]) {
  for (const field of fields) {
    expect(data).toHaveProperty(field as string)
  }
}

/**
 * Check if response indicates authentication is required
 */
export function isAuthRequired(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return obj.error === 'Authentication required.' ||
         obj.error === 'Authentication required' ||
         (typeof obj.error === 'string' && obj.error.toLowerCase().includes('auth'))
}

/**
 * Check if data contains expected array property
 */
export function hasDataArray(data: unknown, property: string): data is Record<string, unknown[]> {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return Array.isArray(obj[property])
}
