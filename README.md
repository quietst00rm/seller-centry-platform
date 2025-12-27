# Seller Centry Platform

Multi-tenant Amazon Seller Account Health Dashboard for tracking and managing Amazon seller violations.

## Features

- **Multi-tenant Architecture**: Each client gets their own subdomain (e.g., `alwayz-on-sale.sellercentry.com`)
- **Google Sheets Integration**: Violations data pulled directly from client-specific Google Sheets
- **Real-time Dashboard**: View active and resolved violations with filtering
- **Mobile-First Design**: 90% of users access on mobile - fully responsive
- **Authentication**: Email/password and Google Sign-In via Supabase
- **Support Tickets**: Submit tickets directly to account managers
- **CSV Export**: Export filtered violations data

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18 or higher
- npm
- Access to Supabase project credentials
- Google Service Account JSON file

### Step 1: Clone and Install

```bash
git clone https://github.com/quietst00rm/seller-centry-platform.git
cd seller-centry-platform
npm install
```

### Step 2: Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the values:

```env
# Supabase - Get from https://supabase.com/dashboard/project/byaaliobjjdffkhnxytv/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://byaaliobjjdffkhnxytv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key

# Google Sheets - Stringify the JSON file (see below)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Domain - Use localhost for local dev
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000

# Resend - Optional for local dev (ticket emails won't send without it)
RESEND_API_KEY=re_xxxxx

# Team Emails - Optional, comma-separated list of team member emails for internal tool
# If not set, defaults to hardcoded list in lib/auth/team.ts
TEAM_EMAILS=joe@sellercentry.com,kristen@sellercentry.com,info@sellercentry.com,joe@marketools.io
```

#### Stringify the Google Service Account Key

The `GOOGLE_SERVICE_ACCOUNT_KEY` must be the entire JSON file as a single line:

```bash
# If you have jq installed:
cat tools-389920-9e8eb909fb61.json | jq -c

# Or use Node.js:
node -e "console.log(JSON.stringify(require('./tools-389920-9e8eb909fb61.json')))"
```

Copy the output and paste it as the value (no extra quotes needed).

### Step 3: Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Accessing Subdomains Locally

Since browsers handle `*.localhost` differently, we support two methods:

### Method 1: Query Parameter (Recommended)

Simply add `?tenant=` to the URL:

```
http://localhost:3000?tenant=alwayz-on-sale
```

This simulates accessing `alwayz-on-sale.sellercentry.com`.

### Method 2: Subdomain Style

Most modern browsers support `*.localhost` subdomains:

```
http://alwayz-on-sale.localhost:3000
```

If this doesn't work, you can add entries to your hosts file:

```bash
# Edit hosts file (macOS/Linux)
sudo nano /etc/hosts

# Add this line:
127.0.0.1 alwayz-on-sale.localhost
```

---

## Project Structure

```
seller-centry-platform/
├── app/
│   ├── (auth)/                 # Auth route group
│   │   ├── login/              # Login page
│   │   ├── forgot-password/    # Password reset
│   │   └── actions.ts          # Auth server actions
│   ├── api/
│   │   ├── tenant/             # GET tenant info
│   │   ├── violations/         # GET violations
│   │   └── ticket/             # POST support tickets
│   ├── auth/
│   │   └── callback/           # OAuth callback handler
│   ├── s/
│   │   └── [subdomain]/        # Dynamic subdomain dashboard
│   ├── globals.css             # Global styles (dark theme)
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Root domain landing
├── components/
│   ├── dashboard/              # Dashboard components
│   │   ├── header.tsx
│   │   ├── summary-cards.tsx
│   │   ├── filter-bar.tsx
│   │   ├── violation-card.tsx  # Mobile card view
│   │   ├── violations-table.tsx # Desktop table view
│   │   ├── violation-modal.tsx
│   │   └── ...
│   └── ui/                     # Reusable UI components
├── hooks/
│   ├── use-dashboard-data.ts   # Data fetching hook
│   └── use-toast.ts            # Toast notifications
├── lib/
│   ├── google/
│   │   └── sheets.ts           # Google Sheets API
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── middleware.ts       # Session management
│   └── utils.ts                # Utility functions
├── types/
│   └── index.ts                # TypeScript types
├── middleware.ts               # Subdomain routing + auth
├── DEPLOYMENT.md               # Production deployment guide
└── README.md                   # This file
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (keep secret!) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Yes | Stringified Google Service Account JSON |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Yes | `localhost:3000` for dev, `sellercentry.com` for prod |
| `RESEND_API_KEY` | No* | Resend API key for sending emails |
| `TEAM_EMAILS` | No** | Comma-separated list of team member emails for internal tool access |

*Email functionality won't work without Resend API key, but app will still run.

**If not set, defaults to: `joe@sellercentry.com,kristen@sellercentry.com,info@sellercentry.com,joe@marketools.io`

---

## Available Scripts

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Data Sources

### Client Mapping Sheet
- **Sheet ID**: `1p-J1x9B6UlaUNkULjx8YMXRpqKVaD1vRnkOjYTD1qMc`
- **Purpose**: Maps subdomains to client sheets and stores summary stats
- **Key Columns**:
  - A: StoreName (subdomain)
  - D: Link to client's violations sheet
  - E-J: Summary statistics

### Client Violations Sheets
- **Tabs**: "All Current Violations" and "All Resolved Violations"
- **Columns A-M**: Violation details (ID, ASIN, reason, status, etc.)

---

## Authentication Flow

1. User visits `{subdomain}.sellercentry.com`
2. Middleware checks for valid Supabase session
3. If not authenticated → redirect to `/login`
4. User signs in with email/password or Google
5. On success → redirect to dashboard
6. Session maintained via HTTP-only cookies

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete production deployment instructions including:
- Vercel setup
- Environment variables
- Domain configuration
- GoDaddy DNS settings
- Supabase OAuth configuration
- Troubleshooting guide

---

## Testing Checklist

### Mobile (375px viewport)
- [ ] Login page renders correctly
- [ ] Dashboard header is compact
- [ ] Summary cards in 2x2 grid
- [ ] Violations show as cards (not table)
- [ ] Modal is full-screen
- [ ] All touch targets are 44px+
- [ ] No horizontal scrolling

### Desktop (1280px+ viewport)
- [ ] Violations show as table
- [ ] Modal is centered dialog
- [ ] Export button shows label

### Functionality
- [ ] Email/password login
- [ ] Google Sign-In
- [ ] Forgot password flow
- [ ] Active/Resolved toggle
- [ ] Time filter (All, 7 days, 30 days)
- [ ] Status filter
- [ ] Search by ASIN/product
- [ ] Violation detail modal
- [ ] CSV export
- [ ] Submit ticket

---

## Troubleshooting

### "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON"
Make sure the key is properly stringified with no line breaks.

### "Tenant not found"
The subdomain must match a StoreName in Column A of the Client Mapping Sheet.

### Violations not loading
1. Check browser console for errors
2. Verify the tenant's Sheet URL in Column D is accessible
3. Ensure service account has viewer access to the sheet

### Google Sign-In not working locally
1. Ensure `http://localhost:3000/**` is in Supabase redirect URLs
2. Check Google OAuth consent screen is configured

---

## Contributing

1. Create a feature branch
2. Make changes
3. Test locally with `npm run dev`
4. Build to verify: `npm run build`
5. Push and create PR

---

## License

Private - Seller Centry internal use only.
