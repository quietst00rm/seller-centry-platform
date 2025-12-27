# Seller Centry Platform - Internal Team Tool Context

> **Purpose**: This document provides complete context for building an internal team tool subdomain app that will allow the Seller Centry team to manage client violations directly, instead of working from Google Sheets.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Current Architecture](#current-architecture)
3. [Google Sheets Data Structure](#google-sheets-data-structure)
4. [Google Sheets API Integration](#google-sheets-api-integration)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Authentication System](#authentication-system)
7. [Subdomain Routing System](#subdomain-routing-system)
8. [Data Types & Interfaces](#data-types--interfaces)
9. [Current Capabilities vs. Needed Capabilities](#current-capabilities-vs-needed-capabilities)
10. [Internal Tool Requirements](#internal-tool-requirements)

---

## Project Overview

**Seller Centry Platform** is a multi-tenant Amazon Seller Account Health Dashboard. Each client accesses their violations data via their own subdomain (e.g., `alwayz-on-sale.sellercentry.com`).

### Tech Stack
| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 15.3.6 |
| Language | TypeScript | 5.8.3 |
| Auth | Supabase | 2.47.10 |
| Data Store | Google Sheets API | v4 |
| Styling | Tailwind CSS | 4.x |
| UI Library | shadcn/ui | (Radix-based) |
| Email | Resend | 4.0.1 |
| Deployment | Vercel | Wildcard subdomains |

### Current System Flow
```
Client visits subdomain → Middleware extracts subdomain → Auth check →
Fetch data from Google Sheets (READ-ONLY) → Display in dashboard
```

### Internal Tool Goal
Create a new subdomain (e.g., `team.sellercentry.com` or `admin.sellercentry.com`) where Seller Centry team members can:
- View ALL client violations across all accounts
- **EDIT** violation data (status, notes, action taken, next steps, etc.)
- **UPDATE** Google Sheets directly from the UI
- Manage workflows without opening Google Sheets

---

## Current Architecture

### Directory Structure
```
app/
├── (auth)/                    # Auth routes (login, forgot-password)
│   ├── login/page.tsx         # Login page
│   ├── forgot-password/page.tsx
│   └── actions.ts             # Server actions (signIn, signOut, etc.)
├── api/
│   ├── tenant/route.ts        # GET tenant metadata
│   ├── violations/route.ts    # GET violations with filters
│   ├── ticket/route.ts        # POST support tickets (email)
│   └── user-subdomain/route.ts # GET user's assigned subdomains
├── auth/callback/route.ts     # OAuth callback handler
├── s/[subdomain]/page.tsx     # Dynamic subdomain dashboard
├── layout.tsx                 # Root layout
└── page.tsx                   # Landing page (root domain)

components/
├── dashboard/                 # Dashboard components
│   ├── lovable-dashboard-client.tsx  # Main dashboard client
│   ├── app-header.tsx         # Header with account switcher
│   ├── violations-tab-manager.tsx
│   ├── violations-main.tsx
│   ├── issue-table.tsx        # Table/card display
│   ├── case-detail-modal.tsx  # Single violation detail view
│   └── submit-ticket-modal.tsx
└── ui/                        # shadcn/ui components

lib/
├── google/sheets.ts           # Google Sheets API (READ-ONLY currently)
├── supabase/
│   ├── client.ts              # Browser Supabase client
│   ├── server.ts              # Server Supabase client
│   └── middleware.ts          # Session management
└── utils.ts                   # Utility functions (cn, etc.)

hooks/
├── use-violations-data.ts     # Violations data fetching
├── use-dashboard-data.ts      # Combined dashboard data hook
└── use-user-accounts.ts       # Multi-account switcher data

types/
└── index.ts                   # All TypeScript interfaces

middleware.ts                  # Subdomain extraction & auth
```

---

## Google Sheets Data Structure

### 1. Master Client Mapping Sheet

**Sheet ID**: `1p-J1x9B6UlaUNkULjx8YMXRpqKVaD1vRnkOjYTD1qMc`
**Tab**: `All Seller Information`
**Range**: Columns A-N

| Column | Field | Description | Example |
|--------|-------|-------------|---------|
| A | StoreName | Client identifier, often used as subdomain | `Alwayz On Sale` |
| B | MerchantId | Amazon Merchant ID | `AXXXXXX` |
| C | Email | Authorized user email | `client@example.com` |
| D | Link to Sheet | URL to client's violations Google Sheet | `https://docs.google.com/spreadsheets/d/XXXXX/edit` |
| E | Total Violations | Count of all violations | `45` |
| F | Violations Last 7 Days | Recent violation count | `5` |
| G | Violations Last 2 Days | Very recent count | `2` |
| H | At Risk Sales | Dollar amount | `$12,500.00` |
| I | High Impact Count | High severity violations | `3` |
| J | Resolved Count | Resolved violations | `30` |
| K | (unused) | - | - |
| L | Subdomain URL | Full subdomain | `alwayz-on-sale.sellercentry.com` |
| M | (unused) | - | - |
| N | Document Folder URL | Google Drive folder link | `https://drive.google.com/...` |

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

**Range**: Columns A-N

| Column | Field | Description | Example |
|--------|-------|-------------|---------|
| A | Violation ID | 12-character hash | `abc123def456` |
| B | ImportedAt | Import date | `2024-01-15` |
| C | Reason | Violation type | `Product Authenticity` |
| D | Date | Date Amazon flagged | `2024-01-10` |
| E | ASIN | Amazon product code | `B08XXXXXX` |
| F | Product Title | Full product name | `Widget Pro Max 2024` |
| G | At Risk Sales | Dollar amount with $ | `$1,250.00` |
| H | Action Taken | What was done | `Listing removed pending appeal` |
| I | AHR Impact | Impact level | `High`, `Low`, or `No impact` |
| J | Next Steps | Action items | `Submit invoice by Friday` |
| K | Options | Available options | `Appeal, Accept, Request clarification` |
| L | Status | Current status | `Working`, `Submitted`, etc. |
| M | Notes | Internal notes | `Waiting for supplier docs` |
| N | Date Resolved | Resolution date (resolved only) | `2024-01-20` |

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

## Google Sheets API Integration

### Current Implementation (`lib/google/sheets.ts`)

**Authentication**: Google Service Account
```typescript
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // READ-ONLY
});
```

**CRITICAL**: Current scope is `spreadsheets.readonly` - must change to `spreadsheets` for write access.

### Current Functions (READ-ONLY)

#### `getTenantBySubdomain(subdomain: string): Promise<Tenant | null>`
Looks up client in Master Sheet by subdomain (Column L or Column A fallback).

```typescript
// How it finds the client:
// 1. Build expected URL: `${subdomain}.sellercentry.com`
// 2. Match against Column L (full subdomain URL)
// 3. Fallback: Match Column A (store name) case-insensitively
```

#### `getViolations(tenant: Tenant, tab: 'active' | 'resolved'): Promise<Violation[]>`
Fetches violations from client's sheet.

```typescript
// Process:
// 1. Extract sheet ID from tenant.sheetUrl
// 2. Try tab name variations until one works
// 3. Parse rows, skip header, skip empty rows
// 4. Normalize status and impact values
// 5. Return Violation[] array
```

#### `filterViolations(violations, { timeFilter, status, search }): Violation[]`
In-memory filtering of violations by time range, status, and search terms.

#### `getSubdomainsByEmail(email: string): Promise<string[]>`
Returns all subdomains assigned to an email (for multi-account users).

#### `getAccountsByEmail(email: string): Promise<{ subdomain: string; storeName: string }[]>`
Returns subdomain + store name pairs. **Master users** (e.g., `joe@marketools.io`) see ALL accounts.

### Master User System
```typescript
const MASTER_USER_EMAILS = ['joe@marketools.io'];
// Master users bypass email filtering and see all client accounts
```

---

## API Endpoints Reference

### GET `/api/tenant`
Fetch tenant metadata by subdomain.

**Request**:
```
GET /api/tenant?subdomain=alwayz-on-sale
```

**Response**:
```json
{
  "success": true,
  "data": {
    "storeName": "Alwayz On Sale",
    "merchantId": "AXXXXX",
    "email": "client@example.com",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/XXXX/edit",
    "totalViolations": 45,
    "violationsLast7Days": 5,
    "violationsLast2Days": 2,
    "atRiskSales": 12500,
    "highImpactCount": 3,
    "resolvedCount": 30,
    "subdomain": "alwayz-on-sale.sellercentry.com",
    "documentFolderUrl": "https://drive.google.com/..."
  }
}
```

### GET `/api/violations`
Fetch violations with optional filtering.

**Request**:
```
GET /api/violations?subdomain=alwayz-on-sale&tab=active&time=7days&status=Working&search=B08
```

**Query Parameters**:
| Param | Values | Default |
|-------|--------|---------|
| subdomain | string (required) | - |
| tab | `active`, `resolved` | `active` |
| time | `all`, `7days`, `30days` | `all` |
| status | ViolationStatus or `all` | `all` |
| search | string (ASIN/title) | `''` |

**Response**:
```json
{
  "success": true,
  "data": {
    "violations": [...],
    "total": 15
  }
}
```

### POST `/api/ticket`
Submit support ticket (sends email via Resend).

**Request**:
```json
{
  "subject": "Question",
  "message": "Need help with violation...",
  "asin": "B08XXXXXX",
  "storeName": "Alwayz On Sale",
  "userEmail": "client@example.com"
}
```

**Subject Options**: `Question`, `Document Request`, `Status Update`, `Other`

**Response**:
```json
{ "success": true }
```

### GET `/api/user-subdomain`
Get all accounts for a user (for account switcher).

**Request**:
```
GET /api/user-subdomain
GET /api/user-subdomain?email=user@example.com
```

**Response**:
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "subdomains": ["alwayz-on-sale", "store-two"],
    "accounts": [
      { "subdomain": "alwayz-on-sale", "storeName": "Alwayz On Sale" },
      { "subdomain": "store-two", "storeName": "Store Two" }
    ],
    "primarySubdomain": "alwayz-on-sale"
  }
}
```

---

## Authentication System

### Supabase Auth
- **Provider**: Supabase (email/password + Google OAuth)
- **Session Storage**: HTTP-only cookies
- **Token Refresh**: Handled in middleware

### Auth Flow

1. **Email/Password Sign In** (`app/(auth)/actions.ts`)
   ```typescript
   signInWithEmail(formData) → supabase.auth.signInWithPassword()
   // On generic domain: looks up user's subdomain and redirects there
   ```

2. **Google OAuth** (`app/(auth)/actions.ts`)
   ```typescript
   signInWithGoogle() → supabase.auth.signInWithOAuth({ provider: 'google' })
   // Callback: /auth/callback
   ```

3. **OAuth Callback** (`app/auth/callback/route.ts`)
   - Exchanges auth code for session
   - Handles recovery and invite flows
   - Redirects to user's primary subdomain

4. **Session Check** (`lib/supabase/middleware.ts`)
   ```typescript
   updateSession(request) → { supabaseResponse, user }
   // Refreshes tokens, returns user if authenticated
   ```

### Authorization Levels

1. **Clients**: Can only access their own subdomain (email must match Column C)
2. **Admins**: Listed in `ADMIN_EMAILS` env var - can access any subdomain
3. **Master Users**: Hardcoded in `sheets.ts` - see all accounts in switcher

---

## Subdomain Routing System

### Middleware Logic (`middleware.ts`)

```typescript
// Subdomain extraction priority:
1. Query param: ?tenant=subdomain (local dev)
2. Hostname: subdomain.localhost:3000 (local dev)
3. Production: subdomain.sellercentry.com
4. Preview: subdomain.seller-centry-platform.vercel.app
5. Vercel preview: tenant---branch.vercel.app
```

### Route Handling

```typescript
// Public routes (no rewrite, no auth):
const publicRoutes = ['/login', '/auth/callback', '/auth/setup-password', '/forgot-password', '/unauthorized'];

// Protected routes:
// 1. Check auth - redirect to /login if not authenticated
// 2. Rewrite: / → /s/{subdomain}/
// 3. Dashboard page verifies email matches tenant or user is admin
```

### Internal Rewriting
```
User visits: https://alwayz-on-sale.sellercentry.com/
Middleware rewrites to: /s/alwayz-on-sale/
Component: app/s/[subdomain]/page.tsx
```

---

## Data Types & Interfaces

### Complete Type Definitions (`types/index.ts`)

```typescript
// Tenant data from Client Mapping Sheet
export interface Tenant {
  storeName: string;           // Column A
  merchantId: string;          // Column B
  email: string;               // Column C (authorized user)
  sheetUrl: string;            // Column D
  totalViolations: number;     // Column E
  violationsLast7Days: number; // Column F
  violationsLast2Days: number; // Column G
  atRiskSales: number;         // Column H
  highImpactCount: number;     // Column I
  resolvedCount: number;       // Column J
  subdomain: string;           // Column L
  documentFolderUrl?: string;  // Column N
}

// Violation from client sheets
export interface Violation {
  id: string;                  // Column A
  importedAt: string;          // Column B
  reason: string;              // Column C
  date: string;                // Column D
  asin: string;                // Column E
  productTitle: string;        // Column F
  atRiskSales: number;         // Column G
  actionTaken: string;         // Column H
  ahrImpact: 'High' | 'Medium' | 'Low' | 'No impact'; // Column I
  nextSteps: string;           // Column J
  options: string;             // Column K
  status: ViolationStatus;     // Column L
  notes: string;               // Column M
  dateResolved?: string;       // Column N
}

export type ViolationStatus =
  | 'Assessing'
  | 'Working'
  | 'Waiting on Client'
  | 'Submitted'
  | 'Review Resolved'
  | 'Denied'
  | 'Ignored'
  | 'Resolved'
  | 'Acknowledged';

export type ViolationTab = 'active' | 'resolved';
export type TimeFilter = 'all' | '7days' | '30days';

export interface ViolationsFilter {
  tab: ViolationTab;
  timeFilter: TimeFilter;
  status: ViolationStatus | 'all';
  search: string;
}

export interface UserAccount {
  subdomain: string;
  storeName: string;
}

// API Response types
export interface TenantResponse {
  success: boolean;
  data?: Tenant;
  error?: string;
}

export interface ViolationsResponse {
  success: boolean;
  data?: {
    violations: Violation[];
    total: number;
  };
  error?: string;
}
```

---

## Current Capabilities vs. Needed Capabilities

### What EXISTS Now (Read-Only)

| Capability | Status | Implementation |
|------------|--------|----------------|
| Read tenant metadata | ✅ | `getTenantBySubdomain()` |
| Read active violations | ✅ | `getViolations(tenant, 'active')` |
| Read resolved violations | ✅ | `getViolations(tenant, 'resolved')` |
| Filter violations | ✅ | `filterViolations()` |
| Search by ASIN/title | ✅ | In-memory search |
| View violation details | ✅ | Case detail modal |
| Submit tickets (email) | ✅ | `/api/ticket` → Resend |
| Export to CSV | ✅ | Client-side generation |
| Multi-account switcher | ✅ | For master users |

### What DOES NOT EXIST (Needed for Write)

| Capability | Status | What's Needed |
|------------|--------|---------------|
| Update violation status | ❌ | Google Sheets API update |
| Edit violation notes | ❌ | Google Sheets API update |
| Edit action taken | ❌ | Google Sheets API update |
| Edit next steps | ❌ | Google Sheets API update |
| Mark as resolved | ❌ | Move row between tabs |
| Add new violation | ❌ | Google Sheets API append |
| Delete violation | ❌ | Google Sheets API delete |
| Bulk updates | ❌ | Batch update API |
| Update tenant stats | ❌ | Write to mapping sheet |
| Audit trail | ❌ | No logging exists |

---

## Internal Tool Requirements

### 1. Google Sheets Write Operations Needed

**Change API Scope**:
```typescript
// FROM:
scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']

// TO:
scopes: ['https://www.googleapis.com/auth/spreadsheets']
```

**Service Account Permissions**: Ensure service account has Editor access to all client sheets.

### 2. New API Endpoints Needed

#### `PATCH /api/violations/[id]`
Update a single violation field.

```typescript
// Request
PATCH /api/violations/abc123def456
{
  "subdomain": "alwayz-on-sale",
  "field": "status",
  "value": "Submitted"
}

// Response
{ "success": true, "data": { ...updatedViolation } }
```

#### `PUT /api/violations/[id]`
Update multiple fields at once.

```typescript
// Request
PUT /api/violations/abc123def456
{
  "subdomain": "alwayz-on-sale",
  "updates": {
    "status": "Submitted",
    "notes": "Appeal submitted 12/27",
    "actionTaken": "Submitted invoice appeal"
  }
}
```

#### `POST /api/violations/resolve`
Move violation from active to resolved tab.

```typescript
// Request
POST /api/violations/resolve
{
  "subdomain": "alwayz-on-sale",
  "violationId": "abc123def456",
  "dateResolved": "2024-12-27"
}
```

#### `POST /api/violations/bulk-update`
Update multiple violations at once.

```typescript
// Request
POST /api/violations/bulk-update
{
  "subdomain": "alwayz-on-sale",
  "updates": [
    { "id": "abc123", "status": "Working" },
    { "id": "def456", "status": "Submitted" }
  ]
}
```

### 3. Google Sheets API Write Methods

```typescript
// Update single cell
await sheets.spreadsheets.values.update({
  spreadsheetId: sheetId,
  range: `'All Current Violations'!L5`,  // Column L, Row 5
  valueInputOption: 'USER_ENTERED',
  requestBody: { values: [['Submitted']] }
});

// Update row (multiple cells)
await sheets.spreadsheets.values.update({
  spreadsheetId: sheetId,
  range: `'All Current Violations'!H5:M5`,  // Columns H-M, Row 5
  valueInputOption: 'USER_ENTERED',
  requestBody: {
    values: [['Action taken', 'High', 'Next steps', 'Options', 'Submitted', 'Notes']]
  }
});

// Append new row
await sheets.spreadsheets.values.append({
  spreadsheetId: sheetId,
  range: `'All Current Violations'!A:N`,
  valueInputOption: 'USER_ENTERED',
  insertDataOption: 'INSERT_ROWS',
  requestBody: { values: [[...newRowData]] }
});

// Delete row (via batchUpdate)
await sheets.spreadsheets.batchUpdate({
  spreadsheetId: sheetId,
  requestBody: {
    requests: [{
      deleteDimension: {
        range: { sheetId: tabSheetId, dimension: 'ROWS', startIndex: 4, endIndex: 5 }
      }
    }]
  }
});
```

### 4. Internal Tool Subdomain Setup

**Option A**: Dedicated subdomain `team.sellercentry.com`
- Add to middleware's subdomain detection
- Create new dashboard variant for team use
- Different authorization logic (team emails only)

**Option B**: Use existing system with master user enhancement
- Enhance master user capabilities to include writes
- Add "Edit Mode" toggle in existing dashboard
- Less routing changes needed

### 5. UI Enhancements for Editing

**Inline Editing**:
- Click-to-edit status dropdown
- Click-to-edit notes field
- Auto-save or explicit save button

**Bulk Actions**:
- Checkbox selection on table rows
- Bulk status change dropdown
- Bulk resolve action

**Audit Trail** (Recommended):
- Add columns for `LastModifiedAt` and `LastModifiedBy` in sheets
- Log changes with timestamps

### 6. Authorization for Internal Tool

```typescript
// Team member emails (for internal tool access)
const TEAM_EMAILS = [
  'joe@sellercentry.com',
  'kristen@sellercentry.com',
  'joe@marketools.io',
  // Add more team members
];

// Check in middleware or API routes
function isTeamMember(email: string): boolean {
  return TEAM_EMAILS.includes(email.toLowerCase());
}
```

---

## Implementation Considerations

### Data Consistency
- Google Sheets has no transactions - consider optimistic UI updates
- Row indices can shift if rows are added/deleted - use Violation ID for lookups
- Consider caching sheet tab IDs to avoid repeated lookups

### Finding Row by Violation ID
```typescript
async function findRowByViolationId(sheetId: string, tabName: string, violationId: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A:A`,  // Column A = Violation ID
  });

  const rows = response.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === violationId) {
      return i + 1; // 1-indexed for Sheets API
    }
  }
  return null;
}
```

### Moving Between Tabs (Resolve/Unresolve)
```typescript
async function resolveViolation(sheetId: string, violationId: string) {
  // 1. Find row in active tab
  const activeRow = await findRowByViolationId(sheetId, 'All Current Violations', violationId);

  // 2. Read the full row data
  const rowData = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'All Current Violations'!A${activeRow}:N${activeRow}`,
  });

  // 3. Append to resolved tab (with dateResolved)
  const resolvedData = [...rowData.data.values[0]];
  resolvedData[13] = new Date().toISOString().split('T')[0]; // Column N = dateResolved

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `'All Resolved Violations'!A:N`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [resolvedData] }
  });

  // 4. Delete from active tab
  // (Need tab sheetId for delete - get via spreadsheets.get)
}
```

### Error Handling
```typescript
// Always handle Google API errors
try {
  await sheets.spreadsheets.values.update({...});
} catch (error) {
  if (error.code === 403) {
    // Permission denied - service account lacks access
  } else if (error.code === 404) {
    // Sheet or range not found
  } else if (error.code === 429) {
    // Rate limited - implement exponential backoff
  }
  throw error;
}
```

---

## Environment Variables

**Required** (already in use):
```env
NEXT_PUBLIC_SUPABASE_URL=https://byaaliobjjdffkhnxytv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
GOOGLE_SERVICE_ACCOUNT_KEY=<stringified_json>
NEXT_PUBLIC_ROOT_DOMAIN=sellercentry.com
RESEND_API_KEY=<resend_key>
```

**Optional/Recommended**:
```env
ADMIN_EMAILS=admin1@example.com,admin2@example.com
TEAM_EMAILS=joe@sellercentry.com,kristen@sellercentry.com  # New for internal tool
```

---

## Quick Reference: Column Mappings

### Client Mapping Sheet (A-N)
```
A: StoreName | B: MerchantId | C: Email | D: SheetUrl | E: TotalViolations
F: Last7Days | G: Last2Days | H: AtRiskSales | I: HighImpact | J: Resolved
K: (unused) | L: SubdomainURL | M: (unused) | N: DocumentFolderUrl
```

### Violations Sheet (A-N)
```
A: ViolationId | B: ImportedAt | C: Reason | D: Date | E: ASIN
F: ProductTitle | G: AtRiskSales | H: ActionTaken | I: AHRImpact
J: NextSteps | K: Options | L: Status | M: Notes | N: DateResolved
```

---

## Summary

This context document provides everything needed to plan an internal team tool:

1. **Data lives in Google Sheets** - two types: mapping sheet and per-client violation sheets
2. **Current system is READ-ONLY** - scope change and new functions needed for writes
3. **Authentication via Supabase** - team authorization can be added via email list
4. **Subdomain routing works** - can add new subdomain or enhance existing master user flow
5. **API patterns established** - follow same patterns for new write endpoints
6. **Column mappings documented** - know exactly where to read/write data

The internal tool will need:
- Google Sheets write scope
- New API endpoints for updates
- Row lookup by Violation ID
- Team member authorization
- UI components for editing
- Optional audit trail columns
