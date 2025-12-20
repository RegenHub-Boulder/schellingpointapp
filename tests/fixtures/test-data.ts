/**
 * Test fixtures and sample data for E2E tests
 */

export const testEvent = {
  slug: 'ethdenver-2025',
  name: 'ETHDenver 2025',
  description: 'The largest Ethereum hackathon and unconference',
  location: 'Denver, Colorado',
  startDate: '2025-02-27',
  endDate: '2025-03-01',
}

export const testSessions = {
  approved: {
    title: 'Test Approved Session',
    description: 'A session that has been approved for the event',
    format: 'talk',
    duration: 45,
    track: 'technical',
    tags: ['ethereum', 'testing'],
  },
  pending: {
    title: 'Test Pending Session',
    description: 'A session waiting for admin approval',
    format: 'workshop',
    duration: 90,
    track: 'governance',
    tags: ['dao', 'voting'],
  },
  withRequirements: {
    title: 'Test Session with Requirements',
    description: 'A session that needs specific equipment',
    format: 'demo',
    duration: 30,
    track: 'creative',
    tags: ['nft', 'demo'],
    technicalRequirements: ['projector', 'microphone'],
  },
}

export const testVenues = {
  mainHall: {
    name: 'Main Hall',
    capacity: 200,
    features: ['projector', 'microphone', 'av_support'],
    description: 'The primary venue for keynotes and large sessions',
  },
  workshopRoom: {
    name: 'Workshop Room A',
    capacity: 50,
    features: ['whiteboard', 'power_outlets', 'wifi'],
    description: 'Ideal for hands-on workshops',
  },
  breakoutRoom: {
    name: 'Breakout Room 1',
    capacity: 20,
    features: ['whiteboard'],
    description: 'Small room for discussions',
  },
}

export const testTimeSlots = {
  morning1: {
    startTime: '2025-02-27T09:00:00Z',
    endTime: '2025-02-27T10:00:00Z',
    label: 'Morning Session 1',
    isAvailable: true,
  },
  morning2: {
    startTime: '2025-02-27T10:15:00Z',
    endTime: '2025-02-27T11:15:00Z',
    label: 'Morning Session 2',
    isAvailable: true,
  },
  lunch: {
    startTime: '2025-02-27T12:00:00Z',
    endTime: '2025-02-27T13:00:00Z',
    label: 'Lunch Break',
    isAvailable: false,
  },
  afternoon: {
    startTime: '2025-02-27T13:00:00Z',
    endTime: '2025-02-27T14:30:00Z',
    label: 'Afternoon Session',
    isAvailable: true,
  },
}

export const testVotes = {
  single: {
    sessionId: '', // Will be set dynamically
    voteCount: 1,
    expectedCredits: 1, // 1² = 1
  },
  multiple: {
    sessionId: '', // Will be set dynamically
    voteCount: 3,
    expectedCredits: 9, // 3² = 9
  },
  max: {
    sessionId: '', // Will be set dynamically
    voteCount: 10,
    expectedCredits: 100, // 10² = 100
  },
}

/**
 * Session formats with their display labels
 */
export const sessionFormats = [
  { value: 'talk', label: 'Talk' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'panel', label: 'Panel' },
  { value: 'demo', label: 'Demo' },
  { value: 'lightning', label: 'Lightning Talk' },
]

/**
 * Session tracks with their display labels and colors
 */
export const sessionTracks = [
  { value: 'technical', label: 'Technical' },
  { value: 'governance', label: 'Governance' },
  { value: 'defi', label: 'DeFi' },
  { value: 'social', label: 'Social' },
  { value: 'creative', label: 'Creative' },
  { value: 'sustainability', label: 'Sustainability' },
]

/**
 * Session statuses
 */
export const sessionStatuses = [
  'pending',
  'approved',
  'rejected',
  'scheduled',
  'cancelled',
]

/**
 * Generate a unique session title for testing
 */
export function generateSessionTitle(): string {
  const topics = ['DeFi', 'NFT', 'DAO', 'ZK', 'L2', 'MEV', 'ReFi', 'Gaming']
  const actions = ['Building', 'Scaling', 'Securing', 'Optimizing', 'Designing']
  const topic = topics[Math.floor(Math.random() * topics.length)]
  const action = actions[Math.floor(Math.random() * actions.length)]
  const num = Math.floor(Math.random() * 1000)
  return `${action} ${topic} Solutions ${num}`
}

/**
 * Generate a complete test session object
 */
export function generateTestSession(overrides?: Partial<typeof testSessions.approved>) {
  return {
    title: generateSessionTitle(),
    description: 'This is a test session created for E2E testing purposes.',
    format: 'talk',
    duration: 45,
    track: 'technical',
    tags: ['test', 'e2e'],
    ...overrides,
  }
}

/**
 * Generate a test venue object
 */
export function generateTestVenue(overrides?: Partial<typeof testVenues.mainHall>) {
  const num = Math.floor(Math.random() * 1000)
  return {
    name: `Test Venue ${num}`,
    capacity: 50,
    features: ['projector', 'wifi'],
    description: 'A test venue for E2E testing',
    ...overrides,
  }
}
