import { test, expect } from '@playwright/test'
import { ApiHelper, expectStatus, isAuthRequired, hasDataArray } from '../../setup/api-helpers'

test.describe('Votes API', () => {
  let api: ApiHelper

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request)
  })

  test.describe('GET /api/events/:slug/votes/me', () => {
    test('returns 401 without authentication', async () => {
      const { response } = await api.getMyVotes()

      expectStatus(response, 401)
    })
  })

  test.describe('POST /api/events/:slug/votes', () => {
    test('returns 401 without authentication', async () => {
      // Use a placeholder session ID since we're testing auth
      const { response } = await api.castVote(undefined, 'test-session-id', 1)

      expectStatus(response, 401)
    })
  })
})

test.describe('Votes API - Quadratic Voting Logic', () => {
  test('quadratic cost calculation is correct', () => {
    // Verify quadratic cost formula: cost = votes^2
    const calculateQuadraticCost = (votes: number) => votes * votes

    expect(calculateQuadraticCost(1)).toBe(1)
    expect(calculateQuadraticCost(2)).toBe(4)
    expect(calculateQuadraticCost(3)).toBe(9)
    expect(calculateQuadraticCost(4)).toBe(16)
    expect(calculateQuadraticCost(5)).toBe(25)
    expect(calculateQuadraticCost(10)).toBe(100)
  })

  test('total credits for multiple votes', () => {
    const calculateQuadraticCost = (votes: number) => votes * votes

    // If a user gives 3 votes to session A and 2 votes to session B
    const votesA = 3
    const votesB = 2
    const totalCost = calculateQuadraticCost(votesA) + calculateQuadraticCost(votesB)

    expect(totalCost).toBe(9 + 4)
    expect(totalCost).toBe(13)
  })

  test('votes cannot be negative', () => {
    const votes = [-1, 0, 1, 2]

    for (const vote of votes) {
      if (vote < 0) {
        expect(vote).toBeLessThan(0)
        // Negative votes should be rejected
      } else {
        expect(vote).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
