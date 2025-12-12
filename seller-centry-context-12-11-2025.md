# Seller Centry Dashboard - Project Context

## Project Overview
Multi-tenant Amazon seller account health dashboard. Each client gets a subdomain (e.g., `alwayz-on-sale.sellercentry.com`) displaying their violation data from Google Sheets. 90% of users are on mobile - mobile-first design is mandatory.

---

## Current Status: WORKING ✅

### Infrastructure (All Configured)
| Component | Status | Details |
|-----------|--------|---------|
| Vercel Project | ✅ Live | `seller-centry-platform` on Pro team "MajestIQ" |
| GitHub Repo | ✅ Connected | `github.com/quietst00rm/seller-centry-platform` |
| Supabase | ✅ Connected | Project ID: `byaaliobjjdffkhnxytv` |
| Google Sheets API | ✅ Working | Service account: `tools-377@tools-389920.iam.gserviceaccount.com` |
| Domain DNS | ✅ Migrated to Vercel | Nameservers: ns1.vercel-dns.com, ns2.vercel-dns.com |
| Wildcard Domain | ✅ Valid | `*.sellercentry.com` green checkmark |
| Root Domain | ✅ Valid | `sellercentry.com` green checkmark |
| SSL Certificates | ✅ Auto-issued | Let's Encrypt via Vercel |

### Domains in Vercel (All Green)
- `sellercentry.com` - Root domain (landing page)
- `*.sellercentry.com` - Wildcard for all client subdomains
- `alwayz-on-sale.sellercentry.com` - Test client (explicitly added)
- `seller-centry-platform.vercel.app` - Vercel default URL

---

## What's Been Completed

### 1. Full Application Build (8 Phases)
- ✅ Next.js 15 App Router with TypeScript
- ✅ Supabase authentication (email/password + Google OAuth)
- ✅ Google Sheets data layer
- ✅ Dashboard UI with summary cards, filters, search
- ✅ Violation cards (mobile) and table (desktop)
- ✅ Submit Ticket functionality (Resend email)
- ✅ CSV Export with filters
- ✅ Dark theme with orange (#F97316) accent

### 2. DNS Migration to Vercel
All email records migrated and working:
- MX @ → smtp.google.com (Priority 1) - Google Workspace
- MX notifications → inbound-smtp.us-east-1.amazonaws.com (Priority 10)
- MX send.notifications → feedback-smtp.us-east-1.amazonses.com (Priority 10)
- SPF, DKIM, DMARC records for email authentication
- Vercel auto-added wildcard ALIAS and CAA records

### 3. Environment Variables in Vercel
All configured in Vercel → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`: https://byaaliobjjdffkhnxytv.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (configured)
- `SUPABASE_SERVICE_ROLE_KEY`: (configured)
- `GOOGLE_SERVICE_ACCOUNT_KEY`: Full JSON contents of service account key
- `RESEND_API_KEY`: (configured)

---

## What Still Needs To Be Done

### 1. FIX: Subdomain Routing (CRITICAL)
**Problem:** Visiting `alwayz-on-sale.sellercentry.com` shows the landing page instead of the dashboard.

**Root Cause:** The middleware doesn't recognize `sellercentry.com` as a production domain and isn't extracting the subdomain properly.

**Fix Required:** Update `middleware.ts` to:
- Recognize `sellercentry.com` as a valid production domain
- Extract subdomain from `{client}.sellercentry.com`
- Rewrite subdomain requests to `/s/{client}` route
- Let root domain `sellercentry.com` (no subdomain) show landing page

### 2. Add Coming Soon Landing Page
**For root domain `sellercentry.com`:**
- Light cream/off-white gradient background
- "SellerCentry" logo (Seller in dark, Centry in orange)
- "LAUNCH IMMINENT" pill badge
- Headline: "The Future of Amazon Protection"
- Countdown timer (72 hours from deployment)
- Fake email signup (shows success message, stores nothing)
- Mobile responsive

**Reference design uploaded by user - cream/light theme, not dark**

### 3. Style Dashboard to Match Lovable Design
**Reference:** https://preview--seller-centry-dashboard.lovable.app/

Current dashboard is functional but "ugly" per user. Needs visual polish to match the Lovable prototype design.

### 4. Authentication Flow
- Supabase auth is configured
- Google OAuth redirect URLs added:
  - `https://seller-centry-platform.vercel.app/**`
  - `https://*.sellercentry.com/**`
- Site URL: `https://seller-centry-platform.vercel.app`
- Test user can be created in Supabase dashboard

### 5. Verify All Client Sheet Mappings
Each client subdomain maps to their own Google Sheet via the Client Mapping Sheet.

---

## Data Architecture

### Client Mapping Sheet (Master)
**URL:** https://docs.google.com/spreadsheets/d/1p-J1x9B6UlaUNkULjx8YMXRpqKVaD1vRnkOjYTD1qMc/edit
**Tab:** "All Seller Information"
**Range:** A:L

| Column | Data |
|--------|------|
| A | StoreName (subdomain) |
| B | Merchant ID |
| C | Email |
| D | Link to client's violations sheet |
| E | Total Violations |
| F | Violations Last 7 Days |
| G | Violations Last 2 Days |
| H | At Risk Sales |
| I | High Impact Count |
| J | Resolved Count |

### Client Violations Sheet Template
**Example (alwayz-on-sale):** https://docs.google.com/spreadsheets/d/1g2K7ddWuTWnGaBpgrGnDHFMggzeMVxDJYDJVcEAlbQI/edit

**Tab "All Current Violations"** - Active violations
| Column | Data |
|--------|------|
| A | ASIN |
| B | Product Title |
| C | Issue Type |
| D | At Risk Sales |
| E | Impact (High/Low/No impact) |
| F | Status (Working/Waiting/Submitted/Denied) |
| G | Date Opened |
| H | Action Taken |
| I | Next Steps |
| J | Notes |
| K-N | Additional fields |

**Tab "All Resolved Violations"** - Same structure + Date Resolved in column N

### Google Service Account
- Email: `tools-377@tools-389920.iam.gserviceaccount.com`
- All client sheets must be shared with this email (Editor access)
- Key file: `tools-389920-9e8eb909fb61.json` (contents in Vercel env var)

---

## Code Structure

```
seller-centry-platform/
├── app/
│   ├── (auth)/
│   │   ├── actions.ts          # Auth server actions
│   │   ├── login/page.tsx      # Login page
│   │   └── forgot-password/page.tsx
│   ├── api/
│   │   ├── tenant/route.ts     # GET tenant by subdomain
│   │   ├── violations/route.ts # GET violations with filters
│   │   └── ticket/route.ts     # POST submit ticket (Resend)
│   ├── auth/
│   │   └── callback/route.ts   # OAuth callback handler
│   ├── s/
│   │   └── [subdomain]/
│   │       └── page.tsx        # Dashboard page
│   └── page.tsx                # Landing page (needs Coming Soon)
├── components/
│   └── dashboard/
│       ├── header.tsx
│       ├── summary-cards.tsx
│       ├── filter-bar.tsx
│       ├── violation-card.tsx  # Mobile card view
│       ├── violations-table.tsx # Desktop table view
│       ├── violations-list.tsx # Responsive container
│       ├── violation-modal.tsx # Full-screen mobile detail
│       ├── attention-banner.tsx
│       ├── submit-ticket-modal.tsx
│       └── dashboard-client.tsx # Main orchestrator
├── hooks/
│   └── use-dashboard-data.ts   # Data fetching + filter state
├── lib/
│   ├── google/
│   │   └── sheets.ts           # Google Sheets API utility
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts
├── types/
│   └── index.ts                # TypeScript types
└── middleware.ts               # Subdomain routing (NEEDS FIX)
```

---

## Sheet Tab Names (Critical)
The code uses these exact tab names:
- Client Mapping: `'All Seller Information'!A:L`
- Active Violations: `'All Current Violations'!A:N`
- Resolved Violations: `'All Resolved Violations'!A:N`

---

## Design Specifications

### Color Scheme
- Primary/Accent: Orange `#F97316`
- Background (Dashboard): `#111111`, `#1a1a1a`, `#222222`
- Background (Landing): Light cream gradient (see reference images)

### Status Badge Colors
- Working: Blue
- Waiting: Yellow
- Submitted: Purple
- Denied: Red
- Resolved: Green

### Impact Colors
- High: Red
- Low: Yellow
- No impact: Gray

### Mobile Requirements
- 44px minimum touch targets
- No horizontal scroll
- Card layout (not table) on mobile
- Full-screen modals
- Responsive header

---

## URLs for Testing

### Production
- Root: https://sellercentry.com (should show Coming Soon)
- Client: https://alwayz-on-sale.sellercentry.com (should show dashboard)

### Fallback (always works)
- https://seller-centry-platform.vercel.app/s/alwayz-on-sale

### API Endpoints
- https://seller-centry-platform.vercel.app/api/tenant?subdomain=alwayz-on-sale
- https://seller-centry-platform.vercel.app/api/violations?subdomain=alwayz-on-sale&tab=active

### Reference Design
- Lovable prototype: https://preview--seller-centry-dashboard.lovable.app/

---

## Supabase Configuration

### Project
- URL: https://byaaliobjjdffkhnxytv.supabase.co
- Dashboard: https://supabase.com/dashboard/project/byaaliobjjdffkhnxytv

### Auth Settings
- Site URL: `https://seller-centry-platform.vercel.app`
- Redirect URLs configured for:
  - `https://seller-centry-platform.vercel.app/**`
  - `https://*.sellercentry.com/**`
  - Various Lovable URLs (legacy, can be removed)

### Creating Test Users
1. Go to Supabase dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. User can then log in

---

## Vercel Configuration

### Project Location
- Team: MajestIQ (Pro account)
- Project: seller-centry-platform
- GitHub: quietst00rm/seller-centry-platform

### DNS Records (in Vercel DNS for sellercentry.com)
All email records migrated - do not modify without understanding impact.

---

## Git Configuration
- User email set to: joe@marketools.io
- Remote: origin → github.com/quietst00rm/seller-centry-platform
- Branch: main
- Auto-deploy on push to main

---

## Key Files to Modify

### For subdomain routing fix:
`middleware.ts` - Add sellercentry.com to production domains, fix subdomain extraction

### For landing page:
`app/page.tsx` - Replace with Coming Soon design

### For dashboard styling:
- `components/dashboard/*.tsx` - All dashboard components
- `app/s/[subdomain]/page.tsx` - Dashboard page wrapper
- `app/globals.css` - Global styles

---

## Developer Access Removed
The previous contractor has been removed from:
- Vercel team
- GitHub organization
- Supabase project

The wildcard domain was previously claimed by his project, which caused verification issues. Now resolved.

---

## Summary of Immediate Tasks

1. **Fix middleware.ts** - Make subdomains route to dashboards
2. **Update app/page.tsx** - Coming Soon landing page (light theme)
3. **Style dashboard components** - Match Lovable design
4. **Test full flow** - Landing → Subdomain → Login → Dashboard

---

## Contact/Email Configuration
Ticket submissions go to:
- info@sellercentry.com
- joe@sellercentry.com
- kristen@sellercentry.com

Via Resend API (already configured).
