# API Routes

## Implemented Routes (Passkey Auth System)

### POST /api/register
Registers a new user with passkey credentials.
- **Input**: `{ code, pubKeyX, pubKeyY }`
- **Process**: Validates invite code, stores passkey, burns code
- **Returns**: `{ success, userId }`

### POST /api/authorize
Authorizes an ephemeral signer for a passkey.
- **Input**: `{ pubKeyX, pubKeyY, signer, expiry, signature }`
- **Gate 1**: Check passkey registered in database
- **Process**: Calls contract.authorizeSigner()
- **Returns**: `{ success, txHash }`

### POST /api/vote
Casts a vote using an authorized signer.
- **Input**: `{ pubKeyX, pubKeyY, signer, topicId, amount, signature }`
- **Gate 1**: Check passkey registered in database
- **Gate 2**: Check signer authorized on-chain with valid expiry
- **Process**: Calls contract.vote()
- **Returns**: `{ success, txHash }`

### GET /api/nonce
Gets current nonce for signing.
- **Query**: `?pubKeyX=...&pubKeyY=...`
- **Process**: Read-only contract call
- **Returns**: Current nonce for vote signature creation

## Database Service Layer
Located at `/src/lib/db/users.ts`:
```typescript
interface User {
  id, email, invite_code, pubkey_x, pubkey_y,
  payout_address, display_name
}

// Functions
getUserByInviteCode(code)
getUserByPasskey(pubKeyX, pubKeyY)
registerPasskey(code, pubKeyX, pubKeyY)
```

## Planned Endpoints (Not Yet Implemented)

### Authentication
- `POST /api/auth/login` - Send magic link
- `POST /api/auth/verify` - Verify magic link, deploy wallet
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update profile

### Event Access
- `GET /api/events/:slug/access` - Check access
- `POST /api/events/:slug/access/grant` - Admin grants access
- `POST /api/events/:slug/access/check-in` - Mark checked in
- `POST /api/events/:slug/access/link-card` - Link burner card

### Sessions
- `GET /api/events/:slug/sessions` - List sessions
- `POST /api/events/:slug/sessions` - Propose session
- `PATCH /api/events/:slug/sessions/:id` - Update session
- `POST /api/events/:slug/sessions/:id/approve` - Approve
- `DELETE /api/events/:slug/sessions/:id` - Delete

### Pre-Event Voting
- `GET /api/events/:slug/pre-votes` - Get user's votes
- `POST /api/events/:slug/pre-votes` - Cast vote
- `GET /api/events/:slug/pre-votes/balance` - Credit balance
- `GET /api/events/:slug/pre-votes/overlap` - Voter overlap matrix

### Attendance Voting
- `GET /api/events/:slug/attendance-votes` - Get votes
- `POST /api/events/:slug/attendance-votes` - Cast vote
- `GET /api/events/:slug/attendance-votes/stats` - Session stats
- `GET /api/events/:slug/attendance-votes/distribution` - Preview QF

### Scheduling & Distribution
- `POST /api/events/:slug/schedule/generate` - Run algorithm
- `POST /api/events/:slug/distribution/calculate` - Calculate QF
- `POST /api/events/:slug/distribution/execute` - Execute on-chain
