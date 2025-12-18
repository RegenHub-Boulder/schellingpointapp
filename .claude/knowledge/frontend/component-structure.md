# Frontend Component Structure

## Component Organization

```
src/components/
├── auth/         - Authentication flows
│   ├── auth-modal (email/wallet choice)
│   ├── profile-setup (multi-step)
│   ├── burner-setup
│   └── onboarding-tutorial
├── ui/           - Radix UI wrapper components
│   ├── button, card, checkbox
│   ├── dropdown, input, modal
│   ├── progress, select, tabs
│   ├── textarea, badge
├── voting/       - Voting interfaces
│   ├── tap-to-vote (with animation)
│   ├── vote-counter
│   ├── vote-dots (visualization)
│   └── credit-bar (progress)
├── sessions/     - Session management
│   ├── session-card
│   ├── session-detail-modal
│   ├── session-proposal-form
│   ├── merger-proposal-modal
│   └── self-hosted-modal
├── layout/       - App layout
│   ├── navbar, footer
│   ├── tabs-nav, container
└── visualization/
    └── network-graph (TrustGraph)
```

## Page Structure

```
src/app/
├── event/        - Main event namespace
│   ├── sessions, schedule
│   ├── live voting, my-votes
│   ├── my-schedule, propose
│   ├── participants, dashboard
├── admin/        - Admin panel
│   ├── sessions, schedule
│   ├── venues, time-slots
│   ├── participants, distribution
│   ├── check-in tablet
│   └── vote counting tablet
├── register/     - Passkey registration page
├── settings/     - User settings
└── profile/      - User profile
```

## UI Patterns

### Component Conventions
- Uses Radix UI primitives with CVA (class-variance-authority) for variants
- Tailwind CSS with custom design tokens
- `cn()` utility from `/src/lib/utils.ts` for className merging
- `"use client"` directive for interactive components
- Icons from lucide-react

### Button Component
- Has `loading` prop that shows spinner and disables button

### Card Components
- Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

### Registration Page Pattern
- Full-screen centered layout with bg-muted/30
- Card with icon header, title, description
- Error messages in destructive/10 background with border
- Info boxes in muted background
- Loading states with Button loading prop

## Test Selectors
Uses data-testid attributes throughout:
- `auth-modal`, `email-auth-btn`
- `profile-setup-modal`, `onboarding-modal`

## File Count
67 TypeScript/TSX files in src/
