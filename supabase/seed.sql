-- Seed file for Schelling Point App
-- This creates sample data for local development and testing

-- =============================================================================
-- USERS
-- =============================================================================

INSERT INTO users (id, email, smart_wallet_address, display_name, bio, topics) VALUES
  ('00000000-0000-0000-0000-000000000001', 'alice@example.com', '0x1111111111111111111111111111111111111111', 'Alice', 'Event organizer and DAO enthusiast', ARRAY['governance', 'defi', 'community']),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.com', '0x2222222222222222222222222222222222222222', 'Bob', 'Smart contract developer', ARRAY['solidity', 'security', 'tooling']),
  ('00000000-0000-0000-0000-000000000003', 'carol@example.com', '0x3333333333333333333333333333333333333333', 'Carol', 'Product designer focused on web3 UX', ARRAY['design', 'ux', 'onboarding']),
  ('00000000-0000-0000-0000-000000000004', 'dave@example.com', '0x4444444444444444444444444444444444444444', 'Dave', 'Research scientist in cryptography', ARRAY['cryptography', 'zk', 'privacy']),
  ('00000000-0000-0000-0000-000000000005', 'eve@example.com', '0x5555555555555555555555555555555555555555', 'Eve', 'Community builder and educator', ARRAY['education', 'community', 'onboarding']);

-- =============================================================================
-- EVENTS
-- =============================================================================

INSERT INTO events (id, slug, name, description, start_date, end_date, location, access_mode, pre_vote_credits, attendance_vote_credits, total_budget_pool, platform_fee_percent) VALUES
  ('10000000-0000-0000-0000-000000000001', 'ethdenver-2025', 'ETHDenver 2025 Unconference', 'The premier Ethereum unconference track at ETHDenver', '2025-02-28 09:00:00+00', '2025-03-02 18:00:00+00', 'Denver, Colorado', 'open', 100, 100, 10000.00, 5.00),
  ('10000000-0000-0000-0000-000000000002', 'devcon-sea', 'Devcon SEA Sessions', 'Community-organized sessions at Devcon Southeast Asia', '2025-11-12 09:00:00+00', '2025-11-15 18:00:00+00', 'Bangkok, Thailand', 'nft_gated', 100, 100, 25000.00, 5.00);

-- =============================================================================
-- EVENT ACCESS (with admin flags)
-- =============================================================================

-- Alice is admin for both events
INSERT INTO event_access (event_id, user_id, access_granted, is_admin, checked_in) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true, true, true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', true, true, false);

-- Other users have access to ETHDenver
INSERT INTO event_access (event_id, user_id, access_granted, is_admin, checked_in) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true, false, true),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', true, false, true),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', true, false, false),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', true, false, false);

-- =============================================================================
-- VENUES
-- =============================================================================

INSERT INTO venues (id, event_id, name, capacity, features, description, display_order) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main Stage', 200, ARRAY['projector', 'microphone', 'audio_system', 'recording_equipment'], 'Large presentation hall with full AV setup', 1),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Workshop Room A', 40, ARRAY['projector', 'whiteboard', 'wifi', 'power_outlets'], 'Medium-sized room for interactive workshops', 2),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Workshop Room B', 30, ARRAY['whiteboard', 'wifi', 'power_outlets'], 'Smaller room for intimate discussions', 3),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Breakout Space', 20, ARRAY['wifi', 'power_outlets'], 'Open area for informal sessions', 4);

-- =============================================================================
-- TIME SLOTS
-- =============================================================================

-- Day 1 time slots
INSERT INTO time_slots (id, event_id, start_time, end_time, label, display_order) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2025-02-28 09:00:00+00', '2025-02-28 10:00:00+00', 'Day 1 - Morning Block 1', 1),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2025-02-28 10:15:00+00', '2025-02-28 11:15:00+00', 'Day 1 - Morning Block 2', 2),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '2025-02-28 11:30:00+00', '2025-02-28 12:30:00+00', 'Day 1 - Morning Block 3', 3),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '2025-02-28 14:00:00+00', '2025-02-28 15:00:00+00', 'Day 1 - Afternoon Block 1', 4),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '2025-02-28 15:15:00+00', '2025-02-28 16:15:00+00', 'Day 1 - Afternoon Block 2', 5),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '2025-02-28 16:30:00+00', '2025-02-28 17:30:00+00', 'Day 1 - Afternoon Block 3', 6);

-- Day 2 time slots
INSERT INTO time_slots (id, event_id, start_time, end_time, label, display_order) VALUES
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '2025-03-01 09:00:00+00', '2025-03-01 10:00:00+00', 'Day 2 - Morning Block 1', 7),
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '2025-03-01 10:15:00+00', '2025-03-01 11:15:00+00', 'Day 2 - Morning Block 2', 8),
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', '2025-03-01 11:30:00+00', '2025-03-01 12:30:00+00', 'Day 2 - Morning Block 3', 9),
  ('30000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', '2025-03-01 14:00:00+00', '2025-03-01 15:00:00+00', 'Day 2 - Afternoon Block 1', 10);

-- =============================================================================
-- SESSIONS
-- =============================================================================

INSERT INTO sessions (id, event_id, title, description, format, duration, status, topic_tags, technical_requirements) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Introduction to Quadratic Funding', 'Learn how quadratic funding works and why it matters for public goods', 'talk', 60, 'approved', ARRAY['governance', 'public-goods', 'funding'], ARRAY['projector', 'microphone']),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Building Secure Smart Contracts', 'Workshop on best practices for smart contract security', 'workshop', 90, 'approved', ARRAY['security', 'solidity', 'development'], ARRAY['projector', 'whiteboard']),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'DAO Governance Patterns', 'Discussion on various governance models used by DAOs', 'discussion', 60, 'approved', ARRAY['governance', 'dao', 'voting'], ARRAY['whiteboard']),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Web3 UX Design Principles', 'How to design intuitive interfaces for decentralized applications', 'talk', 60, 'pending', ARRAY['design', 'ux', 'onboarding'], ARRAY['projector']),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Zero Knowledge Proofs 101', 'Beginner-friendly introduction to ZK proofs', 'talk', 60, 'pending', ARRAY['cryptography', 'zk', 'privacy'], ARRAY['projector', 'whiteboard']);

-- =============================================================================
-- SESSION HOSTS
-- =============================================================================

INSERT INTO session_hosts (session_id, user_id, is_primary, status) VALUES
  -- Alice hosts QF session
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true, 'accepted'),
  -- Bob hosts security workshop
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', true, 'accepted'),
  -- Alice co-hosts security workshop
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', false, 'accepted'),
  -- Alice hosts governance discussion
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', true, 'accepted'),
  -- Carol hosts UX talk
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', true, 'accepted'),
  -- Dave hosts ZK talk
  ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', true, 'accepted');

-- =============================================================================
-- PRE-VOTE STATS (sample aggregated data)
-- =============================================================================

INSERT INTO session_pre_vote_stats (session_id, total_votes, total_voters, total_credits_spent, vote_distribution) VALUES
  ('40000000-0000-0000-0000-000000000001', 15, 5, 45, '{"1": 2, "2": 2, "3": 1}'),
  ('40000000-0000-0000-0000-000000000002', 12, 4, 30, '{"2": 2, "3": 1, "1": 1}'),
  ('40000000-0000-0000-0000-000000000003', 8, 3, 18, '{"2": 2, "2": 1}');

-- =============================================================================
-- USER PRE-VOTE BALANCES
-- =============================================================================

INSERT INTO user_pre_vote_balance (event_id, user_id, credits_spent, credits_remaining) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 25, 75),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 18, 82),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 30, 70),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 20, 80);
