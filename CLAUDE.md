# CLAUDE.md - Seller Centry Platform

This document provides context and guidelines for AI assistants working on this codebase.

## Project Overview

**Seller Centry Platform** is a multi-tenant Amazon Seller Account Health Dashboard for tracking and managing Amazon seller violations. Each client gets their own subdomain (e.g., `alwayz-on-sale.sellercentry.com`).

**CRITICAL**: 90% of users access on mobile. Mobile-first design is mandatory.

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript (strict mode)
- **Auth**: Supabase (email/password + Google OAuth)
- **Data**: Google Sheets API (violations stored in client-specific sheets)
- **Styling**: Tailwind CSS 4.x with shadcn/ui components
- **Email**: Resend API for support tickets
- **Deployment**: Vercel with wildcard subdomain support

## Quick Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Directory Structure

```
app/
├── (auth)/              # Auth route group (login, forgot-password)
│   ├── login/           # Login page
│   ├── forgot-password/ # Password reset
│   └── actions.ts       # Auth server actions
├── api/
│   ├── tenant/          # GET tenant info from Google Sheets
│   ├── violations/      # GET violations data
│   ├── ticket/          # POST support tickets
│   └── team/
│       ├── clients/     # GET all clients with metrics (team tool)
│       └── violations/  # GET violations for team view (includes Column O)
│           ├── update/      # PATCH single violation update
│           ├── bulk-update/ # PATCH multiple violations
│           └── resolve/     # POST move violation to resolved
├── auth/callback/       # OAuth callback handler
├── s/[subdomain]/       # Dynamic subdomain dashboard route
├── team/                # Internal team tool (team.sellercentry.com)
│   ├── layout.tsx       # Team layout with auth check
│   ├── page.tsx         # Team dashboard with client table
│   └── client/[subdomain]/ # Per-client violation view
├── globals.css          # Global styles (dark theme)
├── layout.tsx           # Root layout
└── page.tsx             # Landing page (root domain)

components/
├── dashboard/           # Dashboard-specific components
│   ├── header.tsx       # App header with user dropdown
│   ├── summary-cards.tsx
│   ├── filter-bar.tsx
│   ├── violation-card.tsx    # Mobile card view
│   ├── violations-table.tsx  # Desktop table view
│   ├── violation-modal.tsx   # Detail modal
│   └── submit-ticket-modal.tsx
├── team/                # Internal team tool components
│   ├── client-table.tsx              # Sortable client overview table
│   ├── team-dashboard.tsx            # Main dashboard with data fetching
│   ├── violations-table.tsx          # Per-client violations table
│   ├── violation-detail-modal.tsx    # Violation detail modal
│   └── client-violations-dashboard.tsx # Client detail page component
└── ui/                  # shadcn/ui components

lib/
├── auth/
│   └── team.ts          # Team authorization utilities
├── google/sheets.ts     # Google Sheets API integration
├── supabase/
│   ├── client.ts        # Browser client
│   ├── server.ts        # Server client
│   └── middleware.ts    # Session management
└── utils.ts             # Utility functions (cn, etc.)

hooks/
├── use-dashboard-data.ts  # Data fetching hook
└── use-toast.ts           # Toast notifications

types/
└── index.ts             # TypeScript type definitions
```

## Architecture

### Multi-Tenant Subdomain Routing

1. User visits `{subdomain}.sellercentry.com`
2. Middleware (`middleware.ts`) extracts subdomain
3. Subdomain maps to client data in Google Sheets
4. Routes rewrite to `/s/{subdomain}/*` internally

**Local Development**: Use `?tenant=subdomain` query param or `subdomain.localhost:3000`

### Authentication Flow

1. Middleware checks Supabase session
2. Unauthenticated users redirect to `/login`
3. Auth via email/password or Google Sign-In
4. Session stored in HTTP-only cookies
5. Protected routes require valid session

### Data Flow

1. **Client Mapping Sheet**: Master lookup (subdomain → client sheet URL)
2. **Client Violations Sheet**: Per-client data with "All Current Violations" and "All Resolved Violations" tabs
3. API routes fetch from Google Sheets, transform, and return JSON

## Code Patterns

### Path Aliases

Use `@/` for imports from project root:
```typescript
import { createClient } from '@/lib/supabase/server';
import { Violation } from '@/types';
```

### Server Actions

Auth actions in `app/(auth)/actions.ts`:
```typescript
'use server'
export async function signIn(formData: FormData) { ... }
export async function signUp(formData: FormData) { ... }
```

### API Routes

```typescript
// app/api/example/route.ts
export async function GET(request: NextRequest) {
  // Extract subdomain from headers or params
  // Fetch data from Google Sheets
  // Return NextResponse.json()
}
```

### Components

- Use shadcn/ui components from `components/ui/`
- Dashboard components in `components/dashboard/`
- Responsive: Cards on mobile, tables on desktop

## Mobile-First Requirements

- Touch targets minimum 44px
- No horizontal scrolling
- Card layouts on mobile (< 768px)
- Table layouts on desktop (>= 768px)
- Test all changes on 375px viewport first

## Color Scheme

```
Primary: #F97316 (orange)
Background: #111111, #1a1a1a, #222222
Text: #ffffff (white), #9ca3af (gray)

Status Badges:
- Working: #3b82f6 (blue)
- Waiting on Client: #eab308 (yellow)
- Submitted: #8b5cf6 (purple)
- Denied: #ef4444 (red)
- Resolved: #22c55e (green)

Impact:
- High: Red badge
- Low: Yellow badge
- No impact: Gray badge
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://byaaliobjjdffkhnxytv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
GOOGLE_SERVICE_ACCOUNT_KEY=<stringified_json>
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000  # or sellercentry.com
RESEND_API_KEY=<resend_key>  # Optional for local dev
TEAM_EMAILS=<comma_separated_emails>  # Optional, defaults to hardcoded list
```

## Google Sheets Structure

### Client Mapping Sheet
Columns: StoreName (A), MerchantId (B), Email (C), Link to Sheet (D), Stats (E-J)

### Violations Sheet Tabs
- "All Current Violations": Active violations
- "All Resolved Violations": Resolved violations

Columns: Violation ID, ImportedAt, Reason, Date, ASIN, Product Title, At Risk Sales, Action Taken, AHR Impact, Next Steps, Options, Status, Notes

## Testing Checklist

Before deploying changes:
- [ ] Mobile viewport (375px) renders correctly
- [ ] Desktop viewport (1280px+) renders correctly
- [ ] No TypeScript errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Auth flows work (login, logout, forgot password)
- [ ] Subdomain routing works
- [ ] Data loads from Google Sheets
- [ ] Filters and search function properly

## Common Tasks

### Adding a New API Route
1. Create route in `app/api/{name}/route.ts`
2. Export HTTP method handlers (GET, POST, etc.)
3. Use `createClient()` from `@/lib/supabase/server` for auth
4. Return `NextResponse.json()`

### Adding a Dashboard Component
1. Create component in `components/dashboard/`
2. Import and use in `app/s/[subdomain]/page.tsx` or dashboard client
3. Ensure mobile-first responsive design

### Modifying Auth Flow
1. Update server actions in `app/(auth)/actions.ts`
2. Middleware handles session in `middleware.ts`
3. Supabase client configuration in `lib/supabase/`

## Important Files

- `middleware.ts` - Subdomain extraction, auth checks, route rewrites
- `lib/google/sheets.ts` - Google Sheets API integration
- `lib/supabase/middleware.ts` - Supabase session management
- `app/s/[subdomain]/page.tsx` - Main dashboard page
- `types/index.ts` - TypeScript type definitions

## Deployment

Deployed on Vercel with wildcard subdomain support:
- Production: `*.sellercentry.com`
- Preview: `*.seller-centry-platform.vercel.app`

See `DEPLOYMENT.md` for complete deployment instructions.
