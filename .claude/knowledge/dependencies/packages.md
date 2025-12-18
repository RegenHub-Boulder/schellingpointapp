# Project Dependencies

## Frontend Core
- **Next.js 14.2** - React framework
- **React 18.3** - UI library
- **TypeScript 5** - Type safety

## UI Libraries
- **Radix UI** - Accessible component primitives
  - accordion, checkbox, dialog, dropdown
  - progress, radio, select, tabs, tooltip
- **Tailwind CSS 3.4.1** - Utility-first CSS
- **Framer Motion 11.0.8** - Animation library
- **Lucide React** - Icon library
- **class-variance-authority** - Component variants

## Database
- **@supabase/supabase-js ^2.89.0** - Supabase client

## Blockchain & WebAuthn
- **ethers ^6.16.0** - Ethereum library v6
  - Contract interaction
  - Wallet creation
  - Message signing
- **@simplewebauthn/browser** - WebAuthn client utilities
- **cbor-web** - CBOR decoding for WebAuthn attestation parsing

## Testing
- **@playwright/test ^1.57.0** - E2E testing
- **Foundry** - Smart contract testing
  - forge, anvil, cast

## Build & Dev
- Next.js build system
- ESLint for linting

## Smart Contract (Foundry)
- **Solidity 0.8.30**
- **EVM Version**: cancun
- **Network**: Base Sepolia / Base Mainnet

## Note on CBOR
The cbor-web library is specifically needed because WebAuthn attestationObject is CBOR-encoded. We extract P-256 public key coordinates (x, y - 32 bytes each) from the COSE-formatted credential public key.
