SELLER CENTRY DASHBOARD - MULTI-TENANT PLATFORM BUILD
=====================================================
CREDENTIAL FILES IN THIS DIRECTORY:
- tools-389920-9e8eb909fb61.json = Google Service Account key (for Sheets API)
- client_secret_*.json = Google OAuth Client credentials (for Google Sign-in)
- Both should be added to .gitignore immediately and never committed
CRITICAL CONTEXT: 90% of users access on MOBILE. Mobile-first design is mandatory.
- Touch targets minimum 44px
- No horizontal scrolling ever
- Cards instead of tables on mobile
- Test everything on mobile viewport before desktop

REPOSITORIES:
- REFERENCE (read-only): https://github.com/MajestIQ-org/seller-centry-dashboard
- CREATE NEW REPO: github.com/quietst00rm/seller-centry-platform
- BASE TEMPLATE: https://github.com/vercel/platforms (Vercel Platforms Starter Kit)

EXISTING INFRASTRUCTURE (USE THESE - DO NOT CREATE NEW):
- Supabase Project ID: byaaliobjjdffkhnxytv
- Supabase URL: https://byaaliobjjdffkhnxytv.supabase.co
- Edge Function exists: google-sheets-sync
- Service Account: tools-377@tools-389920.iam.gserviceaccount.com

GOOGLE SHEETS DATA SOURCES:

1. CLIENT MAPPING SHEET (master lookup):
   URL: https://docs.google.com/spreadsheets/d/1p-J1x9B6UlaUNkULjx8YMXRpqKVaD1vRnkOjYTD1qMc/edit
   Columns:
   - A: StoreName (used as subdomain, e.g., "alwayz-on-sale")
   - B: MerchantId
   - C: Email
   - D: Link to Sheet (URL to client's individual violations sheet)
   - E: Count of Total Violations
   - F: Count Violations Last 7 Days
   - G: Count Violations Last 2 Days
   - H: Total At Risk Sales
   - I: Count of High Impact Violations
   - J: Total Resolved Violations
   - K: Script Log
   - L: Subdomains (full URL like "alwayz-on-sale.sellercentry.com")

2. CLIENT VIOLATIONS SHEET STRUCTURE:
   Template: https://docs.google.com/spreadsheets/d/1vlw9UCz1SOdvjhzAHygQGKPbonHf_kZvmbfA_nvlSl8/edit

   Tab: "All Current Violations"
   - A: Violation ID (auto-generated 12-char hash)
   - B: ImportedAt (date imported)
   - C: Reason (violation type, e.g., "Product Authenticity Complaints")
   - D: Date (when Amazon flagged it)
   - E: ASIN
   - F: Product Title
   - G: At Risk Sales (dollar amount, number)
   - H: Action Taken (e.g., "Listing removed")
   - I: AHR Impact (High/Low/No impact)
   - J: Next Steps
   - K: Options
   - L: Status (Working, Waiting on Client, Submitted, Denied, Ignored)
   - M: Notes

   Tab: "All Resolved Violations"
   Same columns plus:
   - N: Date Resolved (auto-populated)

SUBDOMAIN ROUTING FLOW:
1. User visits alwayz-on-sale.sellercentry.com
2. Middleware extracts "alwayz-on-sale" from hostname
3. Look up "alwayz-on-sale" in Column A of client mapping sheet
4. Get Google Sheet URL from Column D
5. Fetch violations from that client's sheet
6. Display in dashboard

=========================================
PHASE 1: PROJECT SETUP
=========================================
1. Clone Vercel Platforms Starter Kit as foundation
2. Create repo "seller-centry-platform" in github.com/quietst00rm/
3. Keep the multi-tenant middleware architecture from starter kit
4. Adapt Redis tenant storage OR use Google Sheets as tenant lookup (simpler)
5. Install Supabase packages: @supabase/supabase-js, @supabase/ssr

=========================================
PHASE 2: SUPABASE AUTH INTEGRATION
=========================================
Connect to EXISTING Supabase project (do not create new):
- Project URL: https://byaaliobjjdffkhnxytv.supabase.co

Authentication requirements:
1. Email/password login
2. Google OAuth (Sign in with Google button)
3. "Forgot password" link → sends reset email via Supabase
4. Protected routes - must be logged in to view dashboard
5. Tenant isolation - users tied to their subdomain

Create:
- lib/supabase/client.ts (browser client)
- lib/supabase/server.ts (server client)
- app/(auth)/login/page.tsx
- Middleware to check auth status

=========================================
PHASE 3: GOOGLE SHEETS DATA LAYER
=========================================
1. Create API route: app/api/violations/route.ts
2. Use existing edge function pattern OR create new API route that:
   - Accepts subdomain as parameter
   - Looks up client in mapping sheet (1p-J1x9B6UlaUNkULjx8YMXRpqKVaD1vRnkOjYTD1qMc)
   - Fetches violations from client's specific sheet
   - Returns formatted JSON

3. Create API route: app/api/tenant/route.ts
   - Returns tenant info (client name, stats from mapping sheet columns E-J)

Environment variables needed:
- GOOGLE_SERVICE_ACCOUNT_KEY (JSON stringified)
- Or use Supabase secret: GOOGLE_SERVICE_ACCOUNT_KEY (already configured)

=========================================
PHASE 4: DASHBOARD UI (MOBILE-FIRST)
=========================================
Reference design: https://preview--seller-centry-dashboard.lovable.app/

HEADER:
- "Seller Centry" logo in orange (#F97316)
- Client name (from tenant lookup)
- "Synced [timestamp]" with refresh button
- "Submit Ticket" button
- "Export" button (CSV)
- User dropdown (email, logout)

SUMMARY CARDS (responsive grid):
- "Open Violations" - count from Column E of mapping sheet
- "At-Risk Sales" - dollar amount from Column H
- Cards: dark bg (#1a1a1a), orange accents, icons

TOGGLE + FILTERS:
- "Active" / "Resolved" pill toggle (switches between sheet tabs)
- Time period dropdown (All, Last 7 days, Last 30 days)
- Status dropdown (All, Working, Waiting on Client, Submitted, Denied)
- Search input (searches ASIN and Product Title)

VIOLATIONS DISPLAY:
- MOBILE: Card layout, one violation per card, tap to expand
- DESKTOP: Table with columns:
  - Product (thumbnail placeholder + title, truncated)
  - ASIN
  - Issue Type (Reason column)
  - $ At Risk
  - Impact (AHR Impact)
  - Status (color-coded badge)
  - Opened (Date column)
  - Action (View button → opens modal)

VIOLATION DETAIL MODAL:
- All fields from the row
- Notes section
- Close button
- Full-screen on mobile

"NEEDS ATTENTION" BANNER:
- Shows violations that have content in Notes column
- Dismissable per session

=========================================
PHASE 5: SUBMIT TICKET FUNCTIONALITY
=========================================
Form fields:
- Subject (dropdown): Question, Document Request, Status Update, Other
- Message (textarea)
- Related ASIN (optional input)

Auto-include:
- Client name (from subdomain/tenant)
- User email (from Supabase auth)
- Timestamp

Send email to ALL THREE:
- info@sellercentry.com
- joe@sellercentry.com
- kristen@sellercentry.com

Use Resend, SendGrid, or Supabase Edge Function for email.
Show success toast/confirmation after submit.

=========================================
PHASE 6: EXPORT FUNCTIONALITY
=========================================
- "Export" button downloads CSV of current view
- Respects active filters (Active/Resolved toggle, time range, status)
- Filename: {clientname}-violations-{date}.csv

=========================================
PHASE 7: DEPLOYMENT & DNS
=========================================
Vercel setup:
1. Connect github.com/quietst00rm/seller-centry-platform to Vercel
2. Configure environment variables in Vercel dashboard
3. Add domain: sellercentry.com
4. Configure wildcard: *.sellercentry.com

DNS (GoDaddy - document instructions for Joe):
- A record: @ → Vercel IP
- CNAME: * → cname.vercel-dns.com

Note: Main sellercentry.com website being built separately - dashboard is subdomains only.

=========================================
PHASE 8: LOCAL DEVELOPMENT
=========================================
Support both methods:
1. Subdomain: http://alwayz-on-sale.localhost:3000
2. Query param: http://localhost:3000?tenant=alwayz-on-sale

Document in README.

=========================================
ENVIRONMENT VARIABLES (.env.example)
=========================================
NEXT_PUBLIC_SUPABASE_URL=https://byaaliobjjdffkhnxytv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_SERVICE_ACCOUNT_KEY=
KV_REST_API_URL= (if using Redis from platforms starter)
KV_REST_API_TOKEN=
RESEND_API_KEY= (or SendGrid equivalent)

=========================================
COLOR SCHEME
=========================================
- Primary: Orange #F97316
- Background: Dark #111111, #1a1a1a, #222222
- Cards: #1a1a1a with subtle border
- Text: White #ffffff, Gray #9ca3af
- Status badges:
  - Working: Blue #3b82f6
  - Waiting on Client: Yellow #eab308
  - Submitted: Purple #8b5cf6
  - Denied: Red #ef4444
  - Resolved: Green #22c55e
- Impact:
  - High: Red badge
  - Low: Yellow badge
  - No impact: Gray badge

=========================================
TESTING CHECKLIST
=========================================
Before considering complete:
[ ] Mobile viewport (375px) - all features work
[ ] Tablet viewport (768px) - responsive transition
[ ] Desktop viewport (1280px+) - table layout
[ ] Login with email/password works
[ ] Login with Google works
[ ] Forgot password sends email
[ ] Subdomain routing works (test with alwayz-on-sale)
[ ] Violations load from correct Google Sheet
[ ] Active/Resolved toggle switches data
[ ] Filters work (time, status, search)
[ ] Violation detail modal opens
[ ] Submit ticket sends email to all 3 addresses
[ ] Export downloads correct CSV
[ ] Logout works
[ ] Protected routes redirect to login

=========================================
OUTPUT REQUIREMENTS
=========================================
- Production-ready, deployable code
- TypeScript strict mode
- No placeholder TODOs
- Proper error handling with user-friendly messages
- Loading skeletons/states
- Mobile-first responsive design
- Clean README with setup instructions