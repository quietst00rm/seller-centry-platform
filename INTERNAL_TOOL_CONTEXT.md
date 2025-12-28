# Seller Centry Platform - Internal Team Tool Context

> **Purpose**: This document provides complete context for the internal team tool subdomain app that allows the Seller Centry team to manage client violations directly from a web interface.

> **Status**: ✅ **FULLY IMPLEMENTED** - The internal team tool is live at `team.sellercentry.com`

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Internal Tool Architecture](#internal-tool-architecture)
3. [Team Dashboard Features](#team-dashboard-features)
4. [Google Sheets Data Structure](#google-sheets-data-structure)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Authentication & Authorization](#authentication--authorization)
7. [Data Types & Interfaces](#data-types--interfaces)
8. [Violation Metrics Calculation](#violation-metrics-calculation)
9. [Rate Limiting & Caching](#rate-limiting--caching)
10. [UI Components](#ui-components)

---

## Project Overview

**Seller Centry Platform** is a multi-tenant Amazon Seller Account Health Dashboard. Each client accesses their violations data via their own subdomain (e.g., `alwayz-on-sale.sellercentry.com`).

The **Internal Team Tool** at `team.sellercentry.com` allows team members to:
- View ALL client violations across all accounts in a single dashboard
- **EDIT** violation data (status, notes, action taken, next steps, documents needed)
- **UPDATE** Google Sheets directly from the UI
- Track client metrics (48h, weekly, monthly counts)
- Manage workflows without opening Google Sheets

### Tech Stack
| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 15.3.6 |
| Language | TypeScript | 5.8.3 |
| Auth | Supabase | 2.47.10 |
| Data Store | Google Sheets API | v4 (read/write) |
| Styling | Tailwind CSS | 4.x |
| UI Library | shadcn/ui | (Radix-based) |
| Email | Resend | 4.0.1 |
| Deployment | Vercel | Wildcard subdomains |

---

## Internal Tool Architecture

### Directory Structure (Team Tool Specific)
```
app/
├── team/                          # Internal team tool
│   ├── layout.tsx                 # Team layout with auth check
│   ├── page.tsx                   # Team dashboard (client overview)
│   └── client/[subdomain]/        # Per-client violation view
│       └── page.tsx
├── api/
│   ├── team/
│   │   ├── clients/route.ts       # GET all clients with metrics
│   │   └── violations/
│   │       ├── route.ts           # GET violations for team view
│   │       ├── update/route.ts    # PATCH single violation
│   │       ├── bulk-update/route.ts # PATCH multiple violations
│   │       └── resolve/route.ts   # POST move to resolved
│   └── export/
│       └── documents-pdf/route.ts # PDF export for documents needed

components/
├── team/                          # Team-specific components
│   ├── client-table.tsx           # Main client overview table with KPIs
│   ├── team-dashboard.tsx         # Dashboard wrapper with data fetching
│   ├── violations-table.tsx       # Per-client violations table
│   ├── violation-detail-modal.tsx # Edit modal for violations
│   └── client-violations-dashboard.tsx # Client detail page

lib/
├── auth/
│   └── team.ts                    # Team authorization utilities
└── google/
    └── sheets.ts                  # Google Sheets API (read + write)
```

### Access Flow
```
team.sellercentry.com → Middleware checks auth →
Verify team member email → Show team dashboard →
Click client → Per-client violation view → Edit violations
```

---

## Team Dashboard Features

### Client Overview Dashboard (`/team`)

**KPI Summary Cards** (5 cards):
1. **Total Clients** - Count of all monitored clients
2. **Needs Attention** - Clients with high-impact violations
3. **New (48H)** - Total violations across all clients in last 48 hours
4. **At-Risk Revenue** - Sum of all at-risk sales (abbreviated: $17.2M)
5. **Resolved (Month)** - Total resolved this month

**Filter Buttons** (pill-style):
- All Clients
- High Impact (clients with highImpactCount > 0)
- New Activity (clients with violations in 48h or 7 days)
- Revenue Risk (clients with atRiskSales > $100K)

**Client Table Columns**:
| Column | Description | Styling |
|--------|-------------|---------|
| Client Name | Store name with external link on hover | Left-aligned, bold |
| New (48h) | Violations in last 48 hours | Orange when > 0 |
| This Week | Violations in last 7 days | Orange when > 0 |
| Resolved (Month) | Resolutions this month | Teal when > 0 |
| Resolved (Week) | Resolutions this week | Teal when > 0 |
| Active Violations | Total active count | Plain text |
| High Impact | Count of high-impact violations | Amber/bold when > 0 |
| Revenue At-Risk | Dollar amount | Full format: $742,157 |

**Row Highlighting**:
- Orange left border + background: Clients with new activity or 3+ high impact
- Hover: Orange left border appears

### Per-Client Violation View (`/team/client/[subdomain]`)

**Features**:
- View all violations for a specific client
- Filter by status, time period, search
- **Inline editing** of violation fields
- Bulk status updates
- Move violations to resolved tab
- Documents needed management

**Editable Fields** (via modal):
- Status (dropdown)
- Action Taken (text)
- Next Steps (text)
- Options (text)
- Notes (text)
- Documents Needed (text) - Column N for active violations

---

## Google Sheets Data Structure

### 1. Master Client Mapping Sheet

**Sheet ID**: `1p-J1x9B6UlaUNkULjx8YMXRpqKVaD1vRnkOjYTD1qMc`
**Tab**: `All Seller Information`
**Range**: Columns A-N

| Column | Index | Field | Description | Example |
|--------|-------|-------|-------------|---------|
| A | 0 | StoreName | Client identifier | `Alwayz On Sale` |
| B | 1 | MerchantId | Amazon Merchant ID | `AXXXXXX` |
| C | 2 | Email | Authorized user email | `client@example.com` |
| D | 3 | Link to Sheet | URL to violations sheet | `https://docs.google.com/...` |
| E | 4 | Count of Total Violations | Active violation count | `115` |
| F | 5 | Count Violations Last 7 Days | Weekly count (IMPORTRANGE) | `5` |
| G | 6 | Count Violations Last 2 Days | 48h count (IMPORTRANGE) | `2` |
| H | 7 | Total At Risk Sales | Dollar amount | `$742,157` |
| I | 8 | Count of High Impact | High severity count | `4` |
| J | 9 | Total Resolved Violations | All-time resolved | `44` |
| K | 10 | (unused) | - | - |
| L | 11 | Subdomain URL | Full subdomain | `alwayz-on-sale.sellercentry.com` |
| M | 12 | (unused) | - | - |
| N | 13 | Document Folder URL | Google Drive folder | `https://drive.google.com/...` |

**Master Sheet Formulas** (for reference):
```
Count of Total Violations (E):
=LET(data, IMPORTRANGE(D2, "'All Current Violations'!C2:E"), colC, INDEX(data,,1), colE, INDEX(data,,3), IFERROR(ROWS(FILTER(colC, (colC<>"") + (colE<>""))), 0))

Count Violations Last 7 Days (F):
=COUNTIF(IMPORTRANGE(D2, "'All Current Violations'!D2:D"), ">="&TODAY()-7)

Count Violations Last 2 Days (G):
=COUNTIF(IMPORTRANGE(D2, "'All Current Violations'!D2:D"), ">="&TODAY()-2)
```

> **IMPORTANT**: The team dashboard does NOT use these pre-calculated values. It fetches actual violation data and calculates counts from the date field (Column D) for accuracy.

### 2. Client Violations Sheets (Per-Client)

Each client has their own Google Sheet with two tabs:

**Active Violations Tab Names** (system tries each until found):
- `All Current Violations`
- `Current Violations`
- `Active Violations`
- `All Active Violations`
- `Open Violations`

**Resolved Violations Tab Names**:
- `All Resolved Violations`
- `Resolved Violations`
- `Closed Violations`
- `All Closed Violations`

**Violations Sheet Columns (A-N)**:

| Column | Index | Field | Description | Editable |
|--------|-------|-------|-------------|----------|
| A | 0 | Violation ID | 12-character hash | ❌ |
| B | 1 | ImportedAt | Import date | ❌ |
| C | 2 | Reason | Violation type | ❌ |
| D | 3 | Date | Date Amazon flagged (for time calculations) | ❌ |
| E | 4 | ASIN | Amazon product code | ❌ |
| F | 5 | Product Title | Full product name | ❌ |
| G | 6 | At Risk Sales | Dollar amount | ❌ |
| H | 7 | Action Taken | What was done | ✅ |
| I | 8 | AHR Impact | Impact level | ✅ |
| J | 9 | Next Steps | Action items | ✅ |
| K | 10 | Options | Available options | ✅ |
| L | 11 | Status | Current status | ✅ |
| M | 12 | Notes | Internal notes | ✅ |
| N | 13 | Docs Needed / Date Resolved | Shared column | ✅ |

> **Column N is shared**: For active violations, it stores "Documents Needed". For resolved violations, it stores "Date Resolved".

### Status Values (ViolationStatus)
```typescript
type ViolationStatus =
  | 'Assessing'        // Initial review
  | 'Working'          // Team is actively working
  | 'Waiting on Client'// Blocked on client action
  | 'Submitted'        // Appeal/fix submitted to Amazon
  | 'Review Resolved'  // Under Amazon review, looks good
  | 'Denied'           // Amazon denied appeal
  | 'Ignored'          // Client chose to ignore
  | 'Resolved'         // Successfully resolved
  | 'Acknowledged';    // Acknowledged but not actionable
```

### AHR Impact Values
- `High` - Account Health at serious risk
- `Low` - Minor impact
- `No impact` - Informational only

---

## API Endpoints Reference

### Team Client Endpoints

#### GET `/api/team/clients`
Fetch all clients with calculated metrics.

**Request**:
```
GET /api/team/clients?detailed=true
```

**Response**:
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "storeName": "AlphaDailyDeals",
        "subdomain": "alpha-daily-deals",
        "email": "client@example.com",
        "sheetUrl": "https://docs.google.com/...",
        "violations48h": 2,
        "violationsThisWeek": 5,
        "resolvedThisMonth": 4,
        "resolvedThisWeek": 2,
        "activeViolations": 115,
        "highImpactCount": 4,
        "atRiskSales": 742157
      }
    ],
    "total": 30
  }
}
```

> **Note**: Metrics are calculated from actual violation dates, not master sheet values.

#### GET `/api/team/violations`
Fetch violations for a specific client (team view includes docsNeeded).

**Request**:
```
GET /api/team/violations?subdomain=alpha-daily-deals&tab=active
```

**Response**:
```json
{
  "success": true,
  "data": {
    "violations": [...],
    "total": 115
  }
}
```

#### PATCH `/api/team/violations/update`
Update a single violation.

**Request**:
```json
{
  "subdomain": "alpha-daily-deals",
  "violationId": "abc123def456",
  "updates": {
    "status": "Submitted",
    "notes": "Appeal submitted 12/27",
    "actionTaken": "Submitted invoice appeal"
  }
}
```

**Updatable Fields**:
- `actionTaken` → Column H
- `ahrImpact` → Column I
- `nextSteps` → Column J
- `options` → Column K
- `status` → Column L
- `notes` → Column M
- `docsNeeded` → Column N (active tab only)

**Response**:
```json
{ "success": true }
```

#### PATCH `/api/team/violations/bulk-update`
Update multiple violations at once.

**Request**:
```json
{
  "subdomain": "alpha-daily-deals",
  "updates": [
    { "violationId": "abc123", "status": "Working" },
    { "violationId": "def456", "status": "Submitted", "notes": "Done" }
  ]
}
```

#### POST `/api/team/violations/resolve`
Move violation from active to resolved tab.

**Request**:
```json
{
  "subdomain": "alpha-daily-deals",
  "violationId": "abc123def456"
}
```

**Process**:
1. Find row in active tab by Violation ID
2. Read full row data (A-N)
3. Set Column N to current date (dateResolved)
4. Append to resolved tab
5. Delete from active tab

---

## Authentication & Authorization

### Team Member Emails

Defined in `lib/auth/team.ts`:

```typescript
const DEFAULT_TEAM_EMAILS = [
  'joe@sellercentry.com',
  'kml@marketools.io',
  'info@sellercentry.com',
  'joe@marketools.io',
];
```

Can be overridden via environment variable:
```env
TEAM_EMAILS=joe@sellercentry.com,kml@marketools.io
```

### Authorization Check

```typescript
import { isTeamMember } from '@/lib/auth/team';

// In API routes:
if (!isTeamMember(user.email)) {
  return NextResponse.json(
    { success: false, error: 'Access denied - not a team member' },
    { status: 403 }
  );
}
```

### Team Layout Protection

The `app/team/layout.tsx` checks authentication and team membership before rendering any team pages.

---

## Data Types & Interfaces

### ClientOverview (Team Dashboard)

```typescript
export interface ClientOverview {
  storeName: string;
  subdomain: string;
  email: string;
  sheetUrl: string;
  violations48h: number;      // Calculated from violation dates
  violationsThisWeek: number; // Calculated from violation dates (7 days)
  resolvedThisMonth: number;  // Approximated from resolved data
  resolvedThisWeek: number;   // Calculated from resolved dates
  activeViolations: number;   // Total count of active violations
  highImpactCount: number;    // Count where ahrImpact === 'High'
  atRiskSales: number;        // Sum of all atRiskSales
}
```

### Violation (with Team Fields)

```typescript
export interface Violation {
  id: string;                  // Column A
  importedAt: string;          // Column B
  reason: string;              // Column C
  date: string;                // Column D - USED FOR TIME CALCULATIONS
  asin: string;                // Column E
  productTitle: string;        // Column F
  atRiskSales: number;         // Column G
  actionTaken: string;         // Column H ✏️ Editable
  ahrImpact: 'High' | 'Low' | 'No impact'; // Column I ✏️ Editable
  nextSteps: string;           // Column J ✏️ Editable
  options: string;             // Column K ✏️ Editable
  status: ViolationStatus;     // Column L ✏️ Editable
  notes: string;               // Column M ✏️ Editable
  dateResolved?: string;       // Column N (resolved tab only)
  docsNeeded?: string;         // Column N (active tab only) ✏️ Editable
}
```

### Column Mapping for Updates

```typescript
const VIOLATION_COLUMN_MAP: Record<string, string> = {
  actionTaken: 'H',
  ahrImpact: 'I',
  nextSteps: 'J',
  options: 'K',
  status: 'L',
  notes: 'M',
  docsNeeded: 'N',
};
```

---

## Violation Metrics Calculation

### Why Not Use Master Sheet Values?

The master sheet has pre-calculated columns (E, F, G) using IMPORTRANGE formulas, but:
1. IMPORTRANGE may not refresh immediately
2. Values can become stale
3. Data inconsistencies were observed between sheet and app

### Current Calculation Method

The team dashboard fetches actual violation data from each client's sheet and calculates metrics from the **date field (Column D)**:

```typescript
function calculateViolationMetrics(violations: Violation[]) {
  const now = new Date();
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const cutoff7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let last48h = 0;
  let last7Days = 0;

  for (const violation of violations) {
    const violationDate = new Date(violation.date); // Column D

    if (violationDate >= cutoff48h) last48h++;
    if (violationDate >= cutoff7Days) last7Days++;
  }

  return { total: violations.length, last48h, last7Days, ... };
}
```

This matches the Google Sheets formula logic:
```
=COUNTIF(IMPORTRANGE(D2, "'All Current Violations'!D2:D"), ">="&TODAY()-7)
```

### Batch Processing

To avoid rate limits when fetching from ~30 client sheets:
- Process in batches of 5 clients
- 200ms delay between batches
- 2 retries with 500ms base delay for each fetch
- Results cached for 2 minutes

---

## Rate Limiting & Caching

### Cache Configuration

```typescript
const CACHE_TTL = {
  clients: 2 * 60 * 1000,  // 2 minutes for client list
  tenants: 5 * 60 * 1000,  // 5 minutes for tenant data
};
```

### Throttling

```typescript
const MAX_CONCURRENT_REQUESTS = 3;
```

Requests queue when max is reached.

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T>
```

Exponential backoff: 1s, 2s, 4s for rate limit errors.

---

## UI Components

### KPI Card

```tsx
<KpiCard
  label="Total Clients"
  value={30}
  icon={Users}
  labelColor="text-gray-500"
  iconBgColor="bg-gray-50"
  iconColor="text-gray-400"
/>
```

Colors by metric type:
- Total Clients: Gray
- Needs Attention: Amber
- New (48H): Orange
- At-Risk Revenue: Red
- Resolved: Teal

### Filter Button (Pill Style)

```tsx
<FilterButton
  label="All Clients"
  active={true}
  onClick={() => setFilter('all')}
/>
```

Active state: Dark gradient background
Inactive state: White/surface with border

### Revenue Formatting

- **Table cells**: Full format `$742,157` using `Intl.NumberFormat`
- **KPI cards**: Abbreviated `$17.2M` for large numbers

### Row Styling

```tsx
<tr className={`
  border-l-[3px] hover:border-l-orange-500
  ${hasActivity || hasHighImpact
    ? 'bg-orange-50/50 border-l-orange-500'
    : 'border-l-transparent'
  }
`}>
```

---

## Environment Variables

**Required**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://byaaliobjjdffkhnxytv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
GOOGLE_SERVICE_ACCOUNT_KEY=<stringified_json>  # Must have write scope
NEXT_PUBLIC_ROOT_DOMAIN=sellercentry.com
RESEND_API_KEY=<resend_key>
```

**Optional**:
```env
TEAM_EMAILS=joe@sellercentry.com,kml@marketools.io
```

---

## Quick Reference: Column Mappings

### Client Mapping Sheet (A-N)
```
A: StoreName | B: MerchantId | C: Email | D: SheetUrl | E: TotalViolations
F: Last7Days | G: Last2Days | H: AtRiskSales | I: HighImpact | J: ResolvedTotal
K: (unused) | L: SubdomainURL | M: (unused) | N: DocumentFolderUrl
```

### Violations Sheet (A-N)
```
A: ViolationId | B: ImportedAt | C: Reason | D: Date | E: ASIN
F: ProductTitle | G: AtRiskSales | H: ActionTaken | I: AHRImpact
J: NextSteps | K: Options | L: Status | M: Notes | N: DocsNeeded/DateResolved
```

### Editable Columns (Team Tool)
```
H: ActionTaken | I: AHRImpact | J: NextSteps | K: Options
L: Status | M: Notes | N: DocsNeeded (active only)
```

---

## Summary

The internal team tool is **fully implemented** with:

✅ Team subdomain at `team.sellercentry.com`
✅ Client overview dashboard with real-time metrics
✅ Per-client violation management
✅ Full CRUD operations on violations
✅ Bulk update support
✅ Resolve/unresolve workflow
✅ Documents needed tracking
✅ PDF export for document requests
✅ Accurate time-based metrics from actual violation dates
✅ Rate limiting and caching for API stability
✅ Team member authorization
