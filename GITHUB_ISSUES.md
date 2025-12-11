# Schelling Point Backend Infrastructure - GitHub Issues

## Authentication & Smart Wallet Infrastructure

### Issue 1: Smart Wallet Deployment & Email Authentication

**Priority:** P0 (Critical Path)
**Labels:** `backend`, `authentication`, `smart-wallet`, `web3`

**Description:**
Implement smart wallet infrastructure where each user gets their own Safe wallet deployed on an L2, with email-based authentication as the primary login method.

**Requirements:**
- Deploy a Safe smart wallet for each user on Base L2
- Configure Safe modules:
  - Email login relay (Safe's email module)
  - Multi-address control (allow users to link their ENS/EOA)
- Integrate email OTP authentication (magic link)
- Store mapping between:
  - Email address → Smart wallet address
  - User ID → Smart wallet address
  - Optional: ENS/EOA → Smart wallet address (for fund distribution)

**Technical Approach:**
- Use Safe Account Abstraction SDK
- Consider alternatives: Privy (with embedded wallets), WalletKit, or custom Safe deployment
- Backend service (Cloudflare Worker or Supabase Edge Function) to:
  - Handle wallet deployment on first login
  - Return JWT with wallet address
  - Frontend receives JWT for subsequent API calls

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  smart_wallet_address TEXT UNIQUE NOT NULL,
  ens_address TEXT,
  payout_address TEXT, -- ENS or EOA for receiving funds
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  topics TEXT[], -- Array of interest tags
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(smart_wallet_address);
```

**API Endpoints:**
- `POST /api/auth/login` - Send magic link
- `POST /api/auth/verify` - Verify magic link, deploy wallet if new user, return JWT
- `GET /api/auth/me` - Get current user info
- `PATCH /api/auth/me` - Update profile (display name, bio, payout address)

**Acceptance Criteria:**
- [ ] User can authenticate with email OTP
- [ ] Safe wallet is deployed on first login (Base L2)
- [ ] JWT contains wallet address
- [ ] User can link ENS/EOA for fund distribution
- [ ] Email → wallet mapping stored in Supabase
- [ ] Gas costs <$0.01 per wallet deployment

**Out of Scope:**
- Burner card integration (separate issue)
- NFT gating (separate issue)

---

### Issue 2: Event Access Control & NFT Gating

**Priority:** P1 (High)
**Labels:** `backend`, `authentication`, `access-control`, `nft`

**Description:**
Implement access control system supporting email whitelists, NFT ownership verification, and open access modes.

**Requirements:**
- Admin can configure event access mode:
  - **Email whitelist** - Pre-approved email addresses
  - **NFT gating** - Require ownership of specific NFT contract
  - **Open access** - Anyone can join (for public events)
- Check access on login and profile creation
- Support burner card linking (user links physical card to their account)
- Track check-in status for on-site events

**Database Schema:**
```sql
CREATE TABLE event_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  wallet_address TEXT,
  access_granted BOOLEAN DEFAULT false,
  checked_in BOOLEAN DEFAULT false,
  burner_card_id TEXT UNIQUE, -- Physical card ID linked to account
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_access_event ON event_access(event_id);
CREATE INDEX idx_event_access_user ON event_access(user_id);
CREATE INDEX idx_event_access_card ON event_access(burner_card_id);
```

**NFT Verification:**
- Use Alchemy, Moralis, or direct RPC calls
- Cache NFT ownership results (TTL: 1 hour)
- Support ERC-721 and ERC-1155

**API Endpoints:**
- `GET /api/events/:slug/access` - Check if current user has access
- `POST /api/events/:slug/access/grant` - Admin grants access to email/wallet
- `POST /api/events/:slug/access/check-in` - Mark user as checked in
- `POST /api/events/:slug/access/link-card` - Link burner card to account
- `GET /api/events/:slug/access/list` - Admin view of all access records

**Acceptance Criteria:**
- [ ] Email whitelist verification works
- [ ] NFT ownership check works (with caching)
- [ ] Burner card can be linked to user account
- [ ] Check-in flow updates status
- [ ] Access denied returns clear error message

---

## On-Chain Voting & Attestations

### Issue 3: EAS Attestation Schema & On-Chain Voting Infrastructure

**Priority:** P0 (Critical Path)
**Labels:** `blockchain`, `attestations`, `voting`, `eas`

**Description:**
Implement on-chain voting using Ethereum Attestation Service (EAS) where each user's smart wallet creates attestations for their votes, creating a proper attestation graph compatible with TrustGraph.

**Key Architecture Decision:**
- **Each user's smart wallet issues attestations** (not a single backend address)
- This creates a graph with nodes between user addresses
- Enables TrustGraph parsing and social graph analysis

**EAS Schemas to Create:**

**1. Session Proposal Attestation**
```solidity
schema: "eventId:bytes32,sessionId:bytes32,title:string,description:string,format:string,duration:uint32"
```

**2. Session Approval Attestation** (Admin only)
```solidity
schema: "eventId:bytes32,sessionId:bytes32,approved:bool,approvedBy:address"
```

**3. Pre-Event Vote Attestation**
```solidity
schema: "eventId:bytes32,sessionId:bytes32,votes:uint8,creditsSpent:uint16"
```

**4. Attendance Vote Attestation**
```solidity
schema: "eventId:bytes32,sessionId:bytes32,votes:uint8,creditsSpent:uint16,timestamp:uint64"
```

**Technical Implementation:**
- Deploy EAS schemas on Base L2
- Frontend uses wagmi/viem to create attestations via user's smart wallet
- Backend reads attestations from EAS contract (free to read)
- Index attestations in Supabase for fast queries (sync service)

**Database Schema (for indexing):**
```sql
CREATE TABLE attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attestation_uid TEXT UNIQUE NOT NULL, -- EAS UID
  schema_uid TEXT NOT NULL,
  attester_address TEXT NOT NULL, -- User's smart wallet
  recipient_address TEXT,
  event_id UUID REFERENCES events(id),
  session_id UUID REFERENCES sessions(id),
  attestation_type TEXT NOT NULL, -- 'proposal', 'approval', 'pre_vote', 'attendance_vote'
  data JSONB NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attestations_event ON attestations(event_id);
CREATE INDEX idx_attestations_session ON attestations(session_id);
CREATE INDEX idx_attestations_attester ON attestations(attester_address);
CREATE INDEX idx_attestations_type ON attestations(attestation_type);
```

**Attestation Sync Service:**
- Cloudflare Worker or Supabase Edge Function
- Polls EAS contract for new attestations (or listens to events)
- Indexes to Supabase for fast querying
- Updates vote aggregates in real-time

**API Endpoints:**
- `GET /api/events/:slug/attestations/:sessionId` - Get all attestations for session
- `GET /api/events/:slug/attestations/user/:address` - Get user's attestations
- `POST /api/attestations/sync` - Trigger manual sync (admin only)

**Frontend Integration:**
- Use `@ethereum-attestation-service/eas-sdk`
- User signs attestation with their smart wallet
- Display transaction status and block explorer link
- Optimistic UI updates while waiting for confirmation

**Acceptance Criteria:**
- [ ] EAS schemas deployed on Base L2
- [ ] Users can create vote attestations via their smart wallet
- [ ] Attestations indexed in Supabase within 30 seconds
- [ ] Vote aggregates update in real-time
- [ ] TrustGraph can parse attestation graph
- [ ] Block explorer link available for each attestation

**TrustGraph Compatibility:**
- Each attestation creates an edge: `attester → session`
- Shared voters create overlapping graphs
- Can analyze: voter clusters, session similarity, user influence

---

### Issue 4: Pre-Event Voting System

**Priority:** P0 (Critical Path)
**Labels:** `backend`, `voting`, `blockchain`, `real-time`

**Description:**
Implement pre-event quadratic voting system where users allocate 100 credits across sessions to influence scheduling. Votes stored as on-chain attestations, aggregated in Supabase.

**Requirements:**
- Each user starts with 100 credits (configurable per event)
- Quadratic cost: `votes² = credits spent` (1→1, 2→4, 3→9, etc.)
- Users can update votes until voting deadline
- Real-time vote aggregates (total votes, credits spent, voter count)
- Admin can view voter overlap matrix for scheduling algorithm

**Database Schema:**
```sql
-- Aggregated view (updated by attestation sync service)
CREATE TABLE session_pre_vote_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  total_votes INTEGER DEFAULT 0,
  total_voters INTEGER DEFAULT 0,
  total_credits_spent INTEGER DEFAULT 0,
  vote_distribution JSONB, -- {"1": 5, "2": 3, "3": 2} = 5 people gave 1 vote, etc.
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- User balance tracking
CREATE TABLE user_pre_vote_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credits_spent INTEGER DEFAULT 0,
  credits_remaining INTEGER DEFAULT 100,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Voter overlap matrix (for scheduling algorithm)
CREATE TABLE voter_overlap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_a_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  session_b_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  shared_voters INTEGER DEFAULT 0,
  overlap_percentage DECIMAL(5,2), -- 0-100%
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, session_a_id, session_b_id)
);
```

**Quadratic Math Functions:**
```typescript
function calculateCost(votes: number): number {
  return votes * votes;
}

function calculateCostIncrement(currentVotes: number): number {
  return 2 * currentVotes + 1; // Cost to add one more vote
}

function maxVotesForCredits(credits: number): number {
  return Math.floor(Math.sqrt(credits));
}
```

**API Endpoints:**
- `GET /api/events/:slug/pre-votes` - Get current user's votes
- `GET /api/events/:slug/pre-votes/balance` - Get credit balance
- `POST /api/events/:slug/pre-votes` - Cast/update vote (creates attestation)
- `GET /api/events/:slug/pre-votes/stats/:sessionId` - Get session vote stats
- `GET /api/events/:slug/pre-votes/overlap` - Get voter overlap matrix (admin)

**Real-time Updates:**
- Supabase Realtime on `session_pre_vote_stats`
- Broadcast aggregate stats only (maintain voter privacy)
- Update UI when any session's vote count changes

**Acceptance Criteria:**
- [ ] User can allocate votes with quadratic cost calculation
- [ ] Cannot exceed 100 credits
- [ ] Can update votes until deadline
- [ ] Attestation created on-chain for each vote
- [ ] Real-time vote counts update for all users
- [ ] Voter overlap matrix calculated for scheduling
- [ ] Vote privacy maintained (no individual votes exposed)

---

### Issue 5: Attendance Voting System (Tap-to-Vote)

**Priority:** P1 (High)
**Labels:** `backend`, `voting`, `blockchain`, `real-time`

**Description:**
Implement during-event attendance voting where users tap to allocate fresh 100 credits (separate from pre-votes) to sessions they attend. Used for quadratic funding budget distribution.

**Requirements:**
- Each user gets fresh 100 credits for attendance voting
- Votes independent from pre-event votes
- Can vote multiple times on same session (quadratic cost applies)
- Tap interface triggers on-chain attestation
- Real-time aggregation for distribution preview
- Calculate QF scores: `(Σ √individual_votes)²`

**Database Schema:**
```sql
CREATE TABLE session_attendance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  total_votes INTEGER DEFAULT 0,
  total_voters INTEGER DEFAULT 0,
  total_credits_spent INTEGER DEFAULT 0,
  qf_score DECIMAL(10,2) DEFAULT 0, -- Quadratic funding score
  vote_distribution JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

CREATE TABLE user_attendance_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credits_spent INTEGER DEFAULT 0,
  credits_remaining INTEGER DEFAULT 100,
  sessions_voted_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
```

**Quadratic Funding Calculation:**
```typescript
function calculateQFScore(votes: {userId: string, votes: number}[]): number {
  const sqrtSum = votes.reduce((sum, v) => sum + Math.sqrt(v.votes), 0);
  return Math.pow(sqrtSum, 2);
}

function calculateDistribution(sessions: {id: string, qfScore: number}[], totalPool: number, platformFee: number): {sessionId: string, amount: number}[] {
  const totalQF = sessions.reduce((sum, s) => sum + s.qfScore, 0);
  const distributablePool = totalPool * (1 - platformFee);

  return sessions.map(s => ({
    sessionId: s.id,
    amount: (s.qfScore / totalQF) * distributablePool
  }));
}
```

**API Endpoints:**
- `GET /api/events/:slug/attendance-votes` - Get user's attendance votes
- `POST /api/events/:slug/attendance-votes` - Cast vote (creates attestation)
- `POST /api/events/:slug/attendance-votes/card/:cardId` - Vote via burner card
- `GET /api/events/:slug/attendance-votes/stats` - Get all session stats
- `GET /api/events/:slug/attendance-votes/distribution` - Preview QF distribution

**Real-time Updates:**
- Supabase Realtime on `session_attendance_stats`
- Broadcast QF scores and vote counts
- Live distribution preview for admins

**Acceptance Criteria:**
- [ ] Tap-to-vote creates on-chain attestation
- [ ] Separate 100 credit pool from pre-votes
- [ ] QF scores calculate correctly
- [ ] Real-time vote updates
- [ ] Distribution preview shows expected payouts
- [ ] Burner card votes work (when cards linked)

---

## Supabase Database & APIs

### Issue 6: Supabase Database Schema Setup

**Priority:** P0 (Critical Path)
**Labels:** `backend`, `database`, `supabase`

**Description:**
Set up core Supabase PostgreSQL database schema for events, sessions, venues, time slots, and related entities.

**Database Schema:**

```sql
-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  banner_image_url TEXT,

  -- Access control
  access_mode TEXT NOT NULL DEFAULT 'open', -- 'open', 'email_whitelist', 'nft_gated'
  nft_contract_address TEXT,
  nft_chain_id INTEGER,

  -- Voting configuration
  pre_vote_credits INTEGER DEFAULT 100,
  attendance_vote_credits INTEGER DEFAULT 100,
  proposal_deadline TIMESTAMPTZ,
  pre_vote_deadline TIMESTAMPTZ,
  voting_opens_at TIMESTAMPTZ,

  -- Budget configuration
  total_budget_pool DECIMAL(18,6) DEFAULT 0,
  payment_token_address TEXT, -- ERC20 contract (e.g., USDC)
  payment_token_symbol TEXT DEFAULT 'USDC',
  platform_fee_percent DECIMAL(5,2) DEFAULT 5.00,
  treasury_wallet_address TEXT,

  -- State
  schedule_published BOOLEAN DEFAULT false,
  schedule_locked BOOLEAN DEFAULT false,
  distribution_executed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  format TEXT NOT NULL, -- 'talk', 'workshop', 'discussion', 'panel', 'demo'
  duration INTEGER NOT NULL, -- minutes: 30, 60, 90
  max_participants INTEGER, -- NULL = no limit

  -- Requirements
  technical_requirements TEXT[], -- ['projector', 'whiteboard', 'audio']
  topic_tags TEXT[],

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'merged', 'scheduled'
  rejection_reason TEXT,
  merged_into_session_id UUID REFERENCES sessions(id),

  -- Scheduling
  venue_id UUID REFERENCES venues(id),
  time_slot_id UUID REFERENCES time_slots(id),
  is_locked BOOLEAN DEFAULT false, -- Admin manually locked this slot

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session hosts (many-to-many)
CREATE TABLE session_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'accepted', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Venues
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  features TEXT[], -- ['projector', 'whiteboard', 'microphone', 'wifi', 'power']
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time slots
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN DEFAULT true,
  label TEXT, -- e.g., "Morning Block", "After Lunch"
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merger requests
CREATE TABLE merger_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  requesting_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  target_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'admin_suggested'
  message TEXT,
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(requesting_session_id, target_session_id)
);

-- Budget distributions
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  total_pool DECIMAL(18,6) NOT NULL,
  platform_fee DECIMAL(18,6) NOT NULL,
  distributable_amount DECIMAL(18,6) NOT NULL,
  tx_hash TEXT, -- Smart contract transaction
  status TEXT DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed'
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual distribution items
CREATE TABLE distribution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID REFERENCES distributions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  recipient_address TEXT NOT NULL, -- Smart wallet or payout address
  amount DECIMAL(18,6) NOT NULL,
  qf_score DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_event ON sessions(event_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_venue_time ON sessions(venue_id, time_slot_id);
CREATE INDEX idx_session_hosts_session ON session_hosts(session_id);
CREATE INDEX idx_session_hosts_user ON session_hosts(user_id);
CREATE INDEX idx_venues_event ON venues(event_id);
CREATE INDEX idx_time_slots_event ON time_slots(event_id);
CREATE INDEX idx_merger_requests_event ON merger_requests(event_id);
CREATE INDEX idx_distributions_event ON distributions(event_id);
```

**Acceptance Criteria:**
- [ ] All tables created in Supabase
- [ ] Foreign key constraints enforced
- [ ] Indexes created for common queries
- [ ] Sample data seed script works
- [ ] Migrations tracked in version control

---

### Issue 7: Supabase Row Level Security (RLS) Policies

**Priority:** P0 (Critical Path)
**Labels:** `backend`, `security`, `supabase`, `database`

**Description:**
Implement Row Level Security policies to enforce access control at the database level.

**RLS Policies:**

```sql
-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_access ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Events: Everyone can read, only admins can modify
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Events are modifiable by admins only"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM event_access
      WHERE event_access.event_id = events.id
      AND event_access.user_id = auth.uid()
      AND event_access.is_admin = true
    )
  );

-- Sessions: Viewable by event participants, modifiable by hosts and admins
CREATE POLICY "Sessions viewable by event participants"
  ON sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_access
      WHERE event_access.event_id = sessions.event_id
      AND event_access.user_id = auth.uid()
      AND event_access.access_granted = true
    )
  );

CREATE POLICY "Sessions modifiable by hosts"
  ON sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM session_hosts
      WHERE session_hosts.session_id = sessions.id
      AND session_hosts.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM event_access
      WHERE event_access.event_id = sessions.event_id
      AND event_access.user_id = auth.uid()
      AND event_access.is_admin = true
    )
  );

-- Users: Users can read all, update own profile only
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Votes: Users can read aggregates, insert own votes only
-- (Individual votes are private, only aggregates exposed)
```

**Additional Security:**
- Create `is_admin` column in `event_access` table
- Create helper functions for common permission checks
- Service role key only for backend operations (never exposed to frontend)

**Acceptance Criteria:**
- [ ] RLS enabled on all tables
- [ ] Participants can only see sessions for events they have access to
- [ ] Hosts can update own sessions only
- [ ] Admins have full access to their events
- [ ] Vote privacy maintained (no individual vote queries allowed)
- [ ] Tests verify RLS policies work correctly

---

### Issue 8: Session Proposal & Management APIs

**Priority:** P0 (Critical Path)
**Labels:** `backend`, `api`, `sessions`

**Description:**
Build REST API endpoints for session proposals, approval workflow, and session management.

**API Endpoints:**

```typescript
// List sessions
GET /api/events/:slug/sessions
Query params: ?status=approved&format=talk&tags=governance
Response: {
  sessions: [{
    id, title, description, format, duration,
    hosts: [{id, name, avatar}],
    preVoteStats: {totalVotes, totalVoters},
    attendanceStats: {totalVotes, qfScore},
    venue, timeSlot, status
  }]
}

// Get single session
GET /api/events/:slug/sessions/:id
Response: {session: {...}, hosts: [...], votes: {...}}

// Propose session
POST /api/events/:slug/sessions
Body: {
  title, description, format, duration,
  maxParticipants?, technicalRequirements?, topicTags?,
  coHosts?: [userId]
}
Response: {session: {...}}

// Update session (host or admin only)
PATCH /api/events/:slug/sessions/:id
Body: {title?, description?, ...}
Response: {session: {...}}

// Approve session (admin only)
POST /api/events/:slug/sessions/:id/approve
Response: {session: {status: 'approved'}}

// Reject session (admin only)
POST /api/events/:slug/sessions/:id/reject
Body: {reason: string}
Response: {session: {status: 'rejected', rejectionReason}}

// Delete session (host before approval, admin always)
DELETE /api/events/:slug/sessions/:id
Response: {success: true}
```

**Business Logic:**
- Validate proposal deadline
- Notify co-hosts when added (they must accept)
- When session approved, create on-chain attestation
- Cannot edit session after scheduled (unless admin)
- Rejection sends email notification with reason

**Acceptance Criteria:**
- [ ] All CRUD operations work
- [ ] Permission checks enforce host/admin access
- [ ] Proposal deadline enforced
- [ ] Co-host invitations work
- [ ] Approval creates EAS attestation
- [ ] Real-time updates broadcast to subscribers

---

### Issue 9: Event Management & Admin APIs

**Priority:** P1 (High)
**Labels:** `backend`, `api`, `admin`

**Description:**
Build admin APIs for event configuration, access control, and event lifecycle management.

**API Endpoints:**

```typescript
// Get event details
GET /api/events/:slug
Response: {event: {...}, accessMode, votingConfig, budgetConfig}

// Update event configuration (admin only)
PATCH /api/events/:slug
Body: {
  name?, description?, dates?,
  accessMode?, nftContract?,
  preVoteCredits?, attendanceVoteCredits?,
  proposalDeadline?, preVoteDeadline?,
  totalBudgetPool?, platformFeePercent?
}
Response: {event: {...}}

// Publish schedule (admin only)
POST /api/events/:slug/schedule/publish
Response: {success: true, publishedAt}

// Lock schedule (admin only)
POST /api/events/:slug/schedule/lock
Response: {success: true, lockedAt}

// Grant access (admin only)
POST /api/events/:slug/access/grant
Body: {email?, walletAddress?, isAdmin?: false}
Response: {access: {...}}

// Bulk grant access via CSV upload
POST /api/events/:slug/access/bulk-grant
Body: FormData with CSV file
Response: {granted: number, failed: string[]}

// Remove access (admin only)
DELETE /api/events/:slug/access/:userId
Response: {success: true}

// List all participants
GET /api/events/:slug/participants
Query: ?checkedIn=true&isAdmin=false
Response: {participants: [{user, checkedIn, isAdmin}]}

// Export event data (admin only)
GET /api/events/:slug/export
Query: ?format=csv&type=sessions,votes,participants
Response: CSV file download
```

**Acceptance Criteria:**
- [ ] Event configuration updates work
- [ ] Access control enforcement
- [ ] CSV bulk import works for whitelists
- [ ] Schedule publish/lock state management
- [ ] Data export generates correct CSV
- [ ] Admin-only endpoints reject non-admins

---

## Scheduling Algorithm

### Issue 10: Venue & Time Slot Management APIs

**Priority:** P1 (High)
**Labels:** `backend`, `api`, `scheduling`

**Description:**
Build APIs for admins to configure venues and time slots for event scheduling.

**API Endpoints:**

```typescript
// Venues
GET /api/events/:slug/venues
Response: {venues: [{id, name, capacity, features}]}

POST /api/events/:slug/venues
Body: {name, capacity, features: string[], description?}
Response: {venue: {...}}

PATCH /api/events/:slug/venues/:id
Body: {name?, capacity?, features?, description?}
Response: {venue: {...}}

DELETE /api/events/:slug/venues/:id
Response: {success: true}

// Time Slots
GET /api/events/:slug/time-slots
Response: {timeSlots: [{id, startTime, endTime, label, isAvailable}]}

POST /api/events/:slug/time-slots
Body: {startTime, endTime, label?, isAvailable: true}
Response: {timeSlot: {...}}

PATCH /api/events/:slug/time-slots/:id
Body: {startTime?, endTime?, isAvailable?}
Response: {timeSlot: {...}}

DELETE /api/events/:slug/time-slots/:id
Response: {success: true}

// Batch create time slots (convenience)
POST /api/events/:slug/time-slots/batch
Body: {
  date: "2025-01-15",
  slots: [
    {start: "09:00", end: "10:00", label: "Morning Block 1"},
    {start: "10:15", end: "11:15", label: "Morning Block 2"}
  ]
}
Response: {timeSlots: [...]}
```

**Venue Features Schema:**
```typescript
type VenueFeature =
  | 'projector'
  | 'whiteboard'
  | 'microphone'
  | 'audio_system'
  | 'wifi'
  | 'power_outlets'
  | 'catering'
  | 'recording_equipment'
  | 'av_support';
```

**Validation:**
- Cannot delete venue if sessions scheduled in it
- Cannot delete time slot if sessions scheduled in it
- Time slots must not overlap
- Venue capacity must be positive integer

**Acceptance Criteria:**
- [ ] CRUD operations for venues work
- [ ] CRUD operations for time slots work
- [ ] Batch time slot creation works
- [ ] Validation prevents invalid deletions
- [ ] Features array properly stored and retrieved

---

### Issue 11: Automated Schedule Generation Algorithm

**Priority:** P1 (High)
**Labels:** `backend`, `algorithm`, `scheduling`, `edge-function`

**Description:**
Implement intelligent scheduling algorithm that assigns sessions to venue + time slot combinations based on vote data, venue requirements, and conflict minimization.

**Algorithm Objectives:**
1. **Minimize audience conflicts** - Sessions with >60% shared voters should NOT overlap
2. **Match venue capacity to demand** - High-vote sessions → larger venues
3. **Respect constraints** - Honor locked slots, venue requirements, host availability
4. **Balance demand** - Spread popular sessions across time slots

**Inputs:**
```typescript
interface SchedulingInput {
  sessions: {
    id: string;
    duration: number; // 30, 60, 90 minutes
    preVotes: number;
    requirements: string[]; // ['projector', 'whiteboard']
    isLocked: boolean; // Admin locked to specific slot
    lockedVenueId?: string;
    lockedTimeSlotId?: string;
  }[];

  venues: {
    id: string;
    capacity: number;
    features: string[];
  }[];

  timeSlots: {
    id: string;
    startTime: Date;
    endTime: Date;
    duration: number; // minutes
  }[];

  voterOverlap: {
    sessionAId: string;
    sessionBId: string;
    overlapPercentage: number; // 0-100
  }[];
}
```

**Algorithm Steps:**
1. **Initialize** - Separate locked vs unlocked sessions
2. **Cluster Analysis** - Group sessions by voter overlap (>60% = same cluster)
3. **Venue Matching** - Match sessions to venues based on:
   - Required features (hard constraint)
   - Capacity needs (expected attendance from votes)
   - Availability
4. **Time Slot Assignment** - Assign time slots to minimize conflicts:
   - Sessions in same cluster → different time slots
   - Similar durations → same time slot when possible
   - Balanced distribution (don't pack all popular sessions together)
5. **Conflict Resolution** - Iteratively improve schedule:
   - Identify remaining conflicts
   - Swap assignments to reduce conflicts
   - Maximize quality score
6. **Validation** - Verify all constraints satisfied

**Quality Score Calculation:**
```typescript
function calculateScheduleQuality(schedule): number {
  let score = 100;

  // Penalize audience conflicts (-5 points per conflict)
  for (const conflict of findAudienceConflicts(schedule)) {
    score -= 5 * conflict.overlapPercentage / 100;
  }

  // Penalize capacity mismatches (-2 points per 10% over/under)
  for (const session of schedule.sessions) {
    const capacityMismatch = Math.abs(session.expectedAttendance - session.venue.capacity);
    score -= 0.2 * (capacityMismatch / session.venue.capacity);
  }

  // Penalize empty slots (-1 point per empty slot)
  score -= countEmptySlots(schedule);

  return Math.max(0, score);
}
```

**Implementation Approach:**
- **Constraint Satisfaction Problem (CSP)** with backtracking
- Or **Genetic Algorithm** for larger events (>50 sessions)
- Or **Greedy heuristic** with iterative improvement
- Run as Supabase Edge Function (Deno runtime)
- Timeout: 30 seconds max
- Return best solution found (may not be perfect)

**API Endpoint:**
```typescript
POST /api/events/:slug/schedule/generate
Body: {
  minQualityScore?: 70, // Reject if below threshold
  maxIterations?: 1000
}
Response: {
  schedule: {
    sessionId: string,
    venueId: string,
    timeSlotId: string
  }[],
  qualityScore: number,
  warnings: string[], // e.g., "Session X has no suitable venue"
  conflicts: {sessionA, sessionB, overlapPercentage}[],
  executionTimeMs: number
}
```

**Edge Cases:**
- More sessions than slots → return error, suggest adding slots
- No venue matches requirements → warning, assign to closest match
- Impossible to avoid conflicts → minimize as much as possible

**Acceptance Criteria:**
- [ ] Algorithm respects locked sessions
- [ ] Venue requirements matched correctly
- [ ] High-overlap sessions scheduled in different time slots
- [ ] Quality score >70 for typical events
- [ ] Runs in <30 seconds for 50 sessions
- [ ] Returns warnings for unresolvable issues
- [ ] Admin can review and manually adjust before publishing

---

## Budget Distribution & Smart Contracts

### Issue 12: Quadratic Funding Distribution System

**Priority:** P1 (High)
**Labels:** `backend`, `blockchain`, `distribution`, `smart-contract`

**Description:**
Implement quadratic funding distribution calculation and smart contract integration for transparent on-chain payouts.

**Smart Contract Requirements:**

Deploy `SchellingPointTreasury` contract on Base L2:

```solidity
// Simplified interface
interface ISchellingPointTreasury {
    function createEvent(
        bytes32 eventId,
        uint16 platformFeeBps, // Basis points (500 = 5%)
        address paymentToken
    ) external;

    function depositFunds(bytes32 eventId, uint256 amount) external;

    struct Distribution {
        address recipient;
        uint256 amount;
    }

    function distribute(
        bytes32 eventId,
        Distribution[] calldata distributions
    ) external returns (bytes32 txHash);

    function getPlatformFeeCollected() external view returns (uint256);
}
```

**Distribution Flow:**
1. Admin deposits funds to treasury contract
2. Event concludes, attendance votes finalized
3. Backend calculates QF distribution percentages
4. Admin reviews distribution preview
5. Admin triggers distribution via UI
6. Frontend calls contract via admin wallet
7. Contract distributes funds + deducts platform fee
8. Transaction hash stored in `distributions` table
9. Email notifications sent to hosts

**Backend Calculation:**
```typescript
POST /api/events/:slug/distribution/calculate
Response: {
  distributions: [
    {
      sessionId: string,
      sessionTitle: string,
      hosts: [{address, name}],
      qfScore: number,
      percentage: number,
      amount: string, // in wei
      amountFormatted: string // "125.50 USDC"
    }
  ],
  totalPool: string,
  platformFee: string,
  distributableAmount: string,
  summary: {
    totalSessions: number,
    totalHosts: number,
    avgPayout: string
  }
}
```

**Smart Contract Integration:**
```typescript
POST /api/events/:slug/distribution/execute
Body: {
  distributions: {sessionId, recipientAddress, amount}[],
  adminSignature: string // Signed by admin wallet
}
Response: {
  distributionId: string,
  txHash: string,
  explorerUrl: string,
  status: 'executing'
}

// Check status
GET /api/events/:slug/distribution/:id/status
Response: {
  status: 'pending' | 'executing' | 'completed' | 'failed',
  txHash, confirmations, error?
}
```

**Database Updates:**
```sql
-- After successful distribution
UPDATE distributions
SET status = 'completed',
    tx_hash = $1,
    executed_at = NOW()
WHERE id = $2;

UPDATE events
SET distribution_executed = true
WHERE id = $3;
```

**Email Notifications:**
- Send to all session hosts
- Include: amount received, tx hash, block explorer link
- Payout address confirmation

**Acceptance Criteria:**
- [ ] QF calculation matches formula exactly
- [ ] Smart contract deployed on Base L2
- [ ] Admin can deposit funds to treasury
- [ ] Distribution preview shows correct amounts
- [ ] On-chain distribution executes successfully
- [ ] Platform fee correctly deducted
- [ ] Transaction hash stored and retrievable
- [ ] Email notifications sent to hosts
- [ ] Block explorer link works

---

## Real-time & Integrations

### Issue 13: Supabase Real-time Subscriptions & Notifications

**Priority:** P2 (Medium)
**Labels:** `backend`, `real-time`, `supabase`, `notifications`

**Description:**
Implement real-time subscriptions for live vote updates, session status changes, and schedule updates.

**Real-time Channels:**

```typescript
// Vote updates (aggregate only, privacy maintained)
supabase
  .channel(`event:${eventId}:votes`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'session_pre_vote_stats'
  }, handleVoteUpdate)
  .subscribe();

// Session status changes
supabase
  .channel(`event:${eventId}:sessions`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'sessions',
    filter: `event_id=eq.${eventId}`
  }, handleSessionUpdate)
  .subscribe();

// Schedule updates
supabase
  .channel(`event:${eventId}:schedule`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'sessions',
    filter: `event_id=eq.${eventId}`
  }, (payload) => {
    if (payload.new.venue_id !== payload.old.venue_id ||
        payload.new.time_slot_id !== payload.old.time_slot_id) {
      handleScheduleChange(payload);
    }
  })
  .subscribe();
```

**Broadcast Events:**
- New session proposed
- Session approved/rejected
- Votes updated (aggregates only)
- Schedule published
- Schedule locked
- Session slot changed
- Distribution executed

**Email Notifications:**

Use Supabase Edge Function + email service (SendGrid/Resend):

```typescript
// Trigger email on session approval
CREATE TRIGGER session_approved_email
AFTER UPDATE ON sessions
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
EXECUTE FUNCTION send_approval_email();
```

**Email Templates:**
- Session approved
- Session rejected (with reason)
- Co-host invitation
- Merger request received
- Schedule published
- Distribution completed (with payout details)

**Acceptance Criteria:**
- [ ] Real-time vote counts update instantly
- [ ] Session status changes broadcast to all users
- [ ] Schedule changes reflected in real-time
- [ ] Email notifications sent for key events
- [ ] Subscriptions handle reconnection gracefully
- [ ] No individual vote data leaked (privacy maintained)

---

## Stretch Goals (Post-MVP)

### Issue 14: AI-Powered Session Merger Suggestions

**Priority:** P3 (Stretch Goal)
**Labels:** `ai`, `features`, `rag`, `stretch-goal`

**Description:**
Use RAG (Retrieval Augmented Generation) to analyze session proposals and suggest similar sessions that could be merged.

**Technical Approach:**
- Generate embeddings for session titles + descriptions (OpenAI `text-embedding-3-small`)
- Store embeddings in Supabase (pgvector extension)
- Calculate cosine similarity between all sessions
- Suggest mergers when similarity >0.85
- Admin can send merger suggestions to hosts

**Implementation:**
```typescript
POST /api/events/:slug/sessions/analyze-mergers
Response: {
  suggestions: [
    {
      sessionA: {id, title},
      sessionB: {id, title},
      similarity: 0.92,
      reason: "Both sessions discuss DAO governance frameworks"
    }
  ]
}

POST /api/events/:slug/merger-requests
Body: {
  requestingSessionId,
  targetSessionId,
  message: "These sessions seem very similar..."
}
```

**Not in MVP:** Can be added later if time allows.

---

### Issue 15: Transcript Integration & RAG Chatbot

**Priority:** P3 (Stretch Goal)
**Labels:** `ai`, `features`, `transcription`, `stretch-goal`

**Description:**
Integrate Parachute (or Whisper API) for session transcription and build RAG agent for chatting with transcripts.

**Features:**
- Session hosts can upload audio recordings
- Automatic transcription via Whisper API
- Transcripts stored in Supabase Storage
- RAG agent with read access to all transcripts
- Users can chat with individual sessions or entire event

**Implementation:**
- Use Parachute API or self-hosted Whisper
- Store transcripts in Supabase Storage
- Generate embeddings, store in vector DB (Pinecone or Supabase pgvector)
- Build agent with retrieval capabilities
- Telegram bot or web chat interface

**Not in MVP:** Stretch goal for post-launch.

---

## Summary

**Total Issues:** 15 (11 core + 4 stretch)

**Critical Path (P0):**
1. Smart Wallet Deployment & Email Auth
2. EAS Attestation Schema & Voting Infrastructure
3. Supabase Database Schema
4. Supabase RLS Policies
5. Pre-Event Voting System
6. Session Proposal & Management APIs

**High Priority (P1):**
7. Event Access Control & NFT Gating
8. Attendance Voting System
9. Event Management & Admin APIs
10. Venue & Time Slot Management
11. Scheduling Algorithm
12. QF Distribution System

**Medium Priority (P2):**
13. Real-time Subscriptions & Notifications

**Stretch Goals (P3):**
14. AI Session Merger Suggestions
15. Transcript Integration & RAG Chatbot

**Estimated Timeline:**
- Core backend (Issues 1-12): 6-8 weeks
- Real-time & polish (Issue 13): 1 week
- Stretch goals (14-15): 2-3 weeks

**Next Steps:**
1. Copy these issues to GitHub (manually or via script)
2. Assign priority labels
3. Create project board with columns: Backlog, In Progress, Review, Done
4. Team members claim issues and begin implementation
5. Use GitHub comments for AI-enhanced collaboration
