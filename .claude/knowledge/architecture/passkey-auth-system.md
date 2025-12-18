# Passkey Authentication System

## Architecture Decision
Chose passkeys + custom contract over:
- Safe wallets (too complex, extra deployment per user)
- Web3Auth/Privy (centralization concerns, cost)
- EAS attestations (overkill, more gas, added complexity)

## Core Components
- WebAuthn passkeys (secp256r1) for identity
- RIP-7212 precompile on Base for r1 signature verification
- Ephemeral k1 signers authorized by passkey for seamless UX
- Simple contract (SchellingPointVotes) emits events
- Off-chain QF calculation from events
- Supabase Edge Functions as relayer

## Key Insight
Passkey authorizes ephemeral signer once (Face ID), then signer can cast many votes instantly (no biometric prompts).

## Contract Storage
- `signers[identityHash][signerAddress] => expiry`
- `nonces[identityHash] => uint256` (replay protection)
- Events: SignerAuthorized, Vote

## Identity
`identityHash = keccak256(pubKeyX, pubKeyY)` - computed on the fly, not stored separately.

## Gas Costs on Base
~80k for auth, ~50k per vote ≈ $0.0001 each

## Authentication Flow

### 1. Registration (/app/register/page.tsx)
1. User visits /register?code=INVITE_CODE
2. Creates WebAuthn passkey using navigator.credentials.create()
3. P-256 public key coordinates extracted from CBOR-encoded attestationObject
4. Credential ID stored in localStorage
5. Public key registered on backend via /api/register

### 2. Session Authorization (useVoting hook)
1. Generates ephemeral wallet (valid 7 days)
2. Creates authorization message: keccak256(abi.encodePacked(signer, expiry))
3. User authenticates with Face ID/Touch ID to sign with passkey
4. WebAuthn signature formatted from DER to raw r||s format
5. Backend validates and calls contract.authorizeSigner()
6. Ephemeral wallet private key stored in localStorage

### 3. Voting (useVoting hook)
1. Uses stored ephemeral wallet (no Face ID needed)
2. Builds message: keccak256(abi.encodePacked(topicId, amount, nonce))
3. Signs with ephemeral wallet using standard ECDSA
4. Backend validates session is authorized on-chain before relaying

## Two-Gate Security Model
- **Gate 1**: Passkey must be registered in database (all routes)
- **Gate 2**: Signer must be authorized on-chain with valid expiry (vote route only)
