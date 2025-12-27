import { google } from 'googleapis';
import type { Tenant, Violation, ViolationStatus, ClientOverview } from '@/types';

// Client Mapping Sheet ID
const CLIENT_MAPPING_SHEET_ID = '1p-J1x9B6UlaUNkULjx8YMXRpqKVaD1vRnkOjYTD1qMc';

// ============================================
// RATE LIMITING AND CACHING
// ============================================

// Simple in-memory cache for client data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: {
  clients?: CacheEntry<ClientOverview[]>;
  tenants: Map<string, CacheEntry<Tenant | null>>;
} = {
  tenants: new Map(),
};

const CACHE_TTL = {
  clients: 2 * 60 * 1000, // 2 minutes for client list
  tenants: 5 * 60 * 1000, // 5 minutes for tenant data
};

function getCachedClients(): ClientOverview[] | null {
  if (!cache.clients) return null;
  if (Date.now() - cache.clients.timestamp > CACHE_TTL.clients) {
    cache.clients = undefined;
    return null;
  }
  return cache.clients.data;
}

function setCachedClients(data: ClientOverview[]): void {
  cache.clients = { data, timestamp: Date.now() };
}

function getCachedTenant(subdomain: string): Tenant | null | undefined {
  const entry = cache.tenants.get(subdomain);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL.tenants) {
    cache.tenants.delete(subdomain);
    return undefined;
  }
  return entry.data;
}

function setCachedTenant(subdomain: string, data: Tenant | null): void {
  cache.tenants.set(subdomain, { data, timestamp: Date.now() });
}

// Retry with exponential backoff for rate limit errors
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a rate limit error
      const isRateLimit = errorMessage.includes('Quota exceeded') ||
                          errorMessage.includes('rate limit') ||
                          errorMessage.includes('429') ||
                          errorMessage.includes('RESOURCE_EXHAUSTED');

      if (!isRateLimit || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`[withRetry] Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Throttle to prevent too many concurrent requests
let pendingRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const requestQueue: Array<() => void> = [];

async function throttledRequest<T>(fn: () => Promise<T>): Promise<T> {
  // Wait if too many requests are in flight
  while (pendingRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>(resolve => {
      requestQueue.push(resolve);
    });
  }

  pendingRequests++;
  try {
    return await fn();
  } finally {
    pendingRequests--;
    const next = requestQueue.shift();
    if (next) next();
  }
}

// Initialize Google Sheets API client
function getGoogleSheetsClient() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Extract sheet ID from a Google Sheets URL
function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Get tenant data by subdomain
// Uses caching and retry logic to handle rate limits
export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  // Check cache first
  const cached = getCachedTenant(subdomain);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const sheets = getGoogleSheetsClient();

    const response = await withRetry(
      () => throttledRequest(() =>
        sheets.spreadsheets.values.get({
          spreadsheetId: CLIENT_MAPPING_SHEET_ID,
          range: `'All Seller Information'!A:N`,
        })
      ),
      3,
      1000
    );

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      setCachedTenant(subdomain, null);
      return null;
    }

    // Build expected subdomain URL for matching against Column L
    const expectedSubdomainUrl = `${subdomain}.sellercentry.com`;
    const subdomainLower = subdomain.toLowerCase();

    // Find the row matching the subdomain
    // Primary: Column L (row[11]) contains full subdomain URL like "alpha-daily-deals.sellercentry.com"
    // Fallback: Column A (row[0]) matches subdomain for backwards compatibility
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const columnL = (row[11] || '').toString().toLowerCase();
      const columnA = (row[0] || '').toString().toLowerCase();

      if (columnL === expectedSubdomainUrl || columnA === subdomainLower) {
        const tenant: Tenant = {
          storeName: row[0] || '',
          merchantId: row[1] || '',
          email: row[2] || '',
          sheetUrl: row[3] || '',
          totalViolations: parseInt(row[4]) || 0,
          violationsLast7Days: parseInt(row[5]) || 0,
          violationsLast2Days: parseInt(row[6]) || 0,
          atRiskSales: parseFloat(row[7]?.replace(/[$,]/g, '')) || 0,
          highImpactCount: parseInt(row[8]) || 0,
          resolvedCount: parseInt(row[9]) || 0,
          subdomain: row[11] || `${columnA}.sellercentry.com`,
          documentFolderUrl: row[13] || undefined,
        };
        setCachedTenant(subdomain, tenant);
        return tenant;
      }
    }

    setCachedTenant(subdomain, null);
    return null;
  } catch (error) {
    console.error('Error fetching tenant:', error);
    throw error;
  }
}

// Parse violation status from sheet
function parseViolationStatus(status: string): ViolationStatus {
  const normalized = status?.trim() || '';
  const lowerStatus = normalized.toLowerCase();
  const statusMap: Record<string, ViolationStatus> = {
    'assessing': 'Assessing',
    'working': 'Working',
    'waiting on client': 'Waiting on Client',
    'waiting': 'Waiting on Client',
    'submitted': 'Submitted',
    'review resolved': 'Review Resolved',
    'denied': 'Denied',
    'ignored': 'Ignored',
    'resolved': 'Resolved',
    'acknowledged': 'Acknowledged',
  };
  return statusMap[lowerStatus] || 'Assessing';
}

// Parse AHR Impact
function parseAhrImpact(impact: string): 'High' | 'Low' | 'No impact' {
  const normalized = impact?.trim().toLowerCase() || '';
  if (normalized.includes('high')) return 'High';
  if (normalized.includes('low')) return 'Low';
  return 'No impact';
}

// Get violations for a tenant
// Uses retry logic to handle rate limits
export async function getViolations(
  tenant: Tenant,
  tab: 'active' | 'resolved' = 'active'
): Promise<Violation[]> {
  try {
    const sheetId = extractSheetId(tenant.sheetUrl);
    if (!sheetId) {
      console.error('Invalid sheet URL:', tenant.sheetUrl);
      return [];
    }

    const sheets = getGoogleSheetsClient();

    // Tab name variations to try - support different naming conventions
    const tabNameVariations = tab === 'active'
      ? ['All Current Violations', 'Current Violations', 'Active Violations', 'All Active Violations', 'Open Violations']
      : ['All Resolved Violations', 'Resolved Violations', 'Closed Violations', 'All Closed Violations'];

    // Read A:N for both tabs
    // Column N is docsNeeded for active tab, dateResolved for resolved tab
    const rangeEnd = 'N';

    let rows: string[][] | undefined;
    let usedTabName: string | null = null;

    // Try each tab name variation until one works
    for (const tabName of tabNameVariations) {
      try {
        const response = await withRetry(
          () => throttledRequest(() =>
            sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: `'${tabName}'!A:${rangeEnd}`,
            })
          ),
          3,
          1000
        );
        rows = response.data.values as string[][] | undefined;
        usedTabName = tabName;
        break;
      } catch (tabError: unknown) {
        // Tab doesn't exist, try next variation
        const errorMessage = tabError instanceof Error ? tabError.message : String(tabError);
        if (errorMessage.includes('Unable to parse range') || errorMessage.includes('not found')) {
          continue;
        }
        // If it's a different error (auth, network, etc.), throw it
        throw tabError;
      }
    }

    if (!usedTabName || !rows) {
      console.error(`[getViolations] No valid tab found for ${tab} violations`);
      return [];
    }

    if (rows.length < 2) {
      return [];
    }

    // Skip header row and map data
    const violations: Violation[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Skip empty rows (rows without Violation ID AND without ASIN)
      if (!row || (!row[0] && !row[4])) {
        continue;
      }

      const violation: Violation = {
        id: row[0] || `gen-${i}`,
        importedAt: row[1] || '',
        reason: row[2] || '',
        date: row[3] || '',
        asin: row[4] || '',
        productTitle: row[5] || '',
        atRiskSales: parseFloat(row[6]?.replace(/[$,]/g, '')) || 0,
        actionTaken: row[7] || '',
        ahrImpact: parseAhrImpact(row[8]),
        nextSteps: row[9] || '',
        options: row[10] || '',
        status: tab === 'resolved' ? 'Resolved' : parseViolationStatus(row[11]),
        notes: row[12] || '',
        // Column N is shared: docsNeeded for active, dateResolved for resolved
        dateResolved: tab === 'resolved' ? row[13] || '' : undefined,
        docsNeeded: tab === 'active' ? row[13] || '' : undefined,
      };

      violations.push(violation);
    }

    return violations;
  } catch (error) {
    console.error('Error fetching violations:', error);
    throw error;
  }
}

// Get violations for team view (includes Column O - Docs Needed for active violations)
// Uses retry logic to handle rate limits
export async function getViolationsForTeam(
  tenant: Tenant,
  tab: 'active' | 'resolved' = 'active'
): Promise<Violation[]> {
  try {
    const sheetId = extractSheetId(tenant.sheetUrl);
    if (!sheetId) {
      console.error('Invalid sheet URL:', tenant.sheetUrl);
      return [];
    }

    const sheets = getGoogleSheetsClient();

    // Tab name variations to try
    const tabNameVariations = tab === 'active'
      ? ['All Current Violations', 'Current Violations', 'Active Violations', 'All Active Violations', 'Open Violations']
      : ['All Resolved Violations', 'Resolved Violations', 'Closed Violations', 'All Closed Violations'];

    // Read A:N for both tabs
    // Column N is docsNeeded for active tab, dateResolved for resolved tab
    const rangeEnd = 'N';

    let rows: string[][] | undefined;
    let usedTabName: string | null = null;

    for (const tabName of tabNameVariations) {
      try {
        const response = await withRetry(
          () => throttledRequest(() =>
            sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: `'${tabName}'!A:${rangeEnd}`,
            })
          ),
          3,
          1000
        );
        rows = response.data.values as string[][] | undefined;
        usedTabName = tabName;
        break;
      } catch (tabError: unknown) {
        const errorMessage = tabError instanceof Error ? tabError.message : String(tabError);
        if (errorMessage.includes('Unable to parse range') || errorMessage.includes('not found')) {
          continue;
        }
        throw tabError;
      }
    }

    if (!usedTabName || !rows) {
      console.error(`[getViolationsForTeam] No valid tab found for ${tab} violations`);
      return [];
    }

    if (rows.length < 2) {
      return [];
    }

    const violations: Violation[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Skip empty rows
      if (!row || (!row[0] && !row[4])) {
        continue;
      }

      const violation: Violation = {
        id: row[0] || `gen-${i}`,
        importedAt: row[1] || '',
        reason: row[2] || '',
        date: row[3] || '',
        asin: row[4] || '',
        productTitle: row[5] || '',
        atRiskSales: parseFloat(row[6]?.replace(/[$,]/g, '')) || 0,
        actionTaken: row[7] || '',
        ahrImpact: parseAhrImpact(row[8]),
        nextSteps: row[9] || '',
        options: row[10] || '',
        status: tab === 'resolved' ? 'Resolved' : parseViolationStatus(row[11]),
        notes: row[12] || '',
        // Column N is shared: docsNeeded for active, dateResolved for resolved
        dateResolved: tab === 'resolved' ? row[13] || '' : undefined,
        docsNeeded: tab === 'active' ? row[13] || '' : undefined,
      };

      violations.push(violation);
    }

    return violations;
  } catch (error) {
    console.error('Error fetching team violations:', error);
    throw error;
  }
}

// Filter violations based on criteria
export function filterViolations(
  violations: Violation[],
  {
    timeFilter = 'all',
    status = 'all',
    search = '',
  }: {
    timeFilter?: 'all' | '7days' | '30days';
    status?: ViolationStatus | 'all';
    search?: string;
  }
): Violation[] {
  let filtered = [...violations];

  // Time filter
  if (timeFilter !== 'all') {
    const now = new Date();
    const days = timeFilter === '7days' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    filtered = filtered.filter((v) => {
      const violationDate = new Date(v.date);
      return violationDate >= cutoff;
    });
  }

  // Status filter
  if (status !== 'all') {
    filtered = filtered.filter((v) => v.status === status);
  }

  // Search filter (ASIN or Product Title)
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (v) =>
        v.asin.toLowerCase().includes(searchLower) ||
        v.productTitle.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

// Get subdomain(s) for a user by email
// Uses retry logic to handle rate limits
export async function getSubdomainsByEmail(email: string): Promise<string[]> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await withRetry(
      () => throttledRequest(() =>
        sheets.spreadsheets.values.get({
          spreadsheetId: CLIENT_MAPPING_SHEET_ID,
          range: `'All Seller Information'!A:L`,
        })
      ),
      3,
      1000
    );

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [];
    }

    const emailLower = email.toLowerCase();
    const subdomains: string[] = [];

    // Find all rows matching the email (column C, index 2)
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowEmail = (row[2] || '').toString().toLowerCase().trim();

      if (rowEmail === emailLower) {
        // Get subdomain from column L (full URL) or column A (store name)
        const columnL = (row[11] || '').toString().trim();
        const columnA = (row[0] || '').toString().trim();

        // Extract just the subdomain part
        let subdomain = '';
        if (columnL && columnL.includes('.sellercentry.com')) {
          subdomain = columnL.replace('.sellercentry.com', '');
        } else if (columnA) {
          subdomain = columnA.toLowerCase();
        }

        if (subdomain && !subdomains.includes(subdomain)) {
          subdomains.push(subdomain);
        }
      }
    }

    return subdomains;
  } catch (error) {
    console.error('Error fetching subdomains by email:', error);
    throw error;
  }
}

// Master user emails that can see ALL accounts (for admin access)
const MASTER_USER_EMAILS = [
  'joe@marketools.io',
];

// Get all accounts (subdomain + store name) for an email - used for multi-account switcher
// Uses retry logic to handle rate limits
export async function getAccountsByEmail(email: string): Promise<{ subdomain: string; storeName: string }[]> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await withRetry(
      () => throttledRequest(() =>
        sheets.spreadsheets.values.get({
          spreadsheetId: CLIENT_MAPPING_SHEET_ID,
          range: `'All Seller Information'!A:L`,
        })
      ),
      3,
      1000
    );

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [];
    }

    const emailLower = email.toLowerCase();
    const isMasterUser = MASTER_USER_EMAILS.some(master => master.toLowerCase() === emailLower);

    const accounts: { subdomain: string; storeName: string }[] = [];
    const seenSubdomains = new Set<string>();

    // Find all rows - for master users, get ALL accounts; for regular users, match by email
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowEmail = (row[2] || '').toString().toLowerCase().trim();

      // Master users see all accounts, regular users only see their own
      if (isMasterUser || rowEmail === emailLower) {
        const storeName = (row[0] || '').toString().trim();
        const columnL = (row[11] || '').toString().trim();

        // Skip rows without a store name
        if (!storeName) continue;

        // Extract subdomain from column L (could be various formats)
        let subdomain = '';
        if (columnL) {
          // Handle full URL: https://subdomain.sellercentry.com
          if (columnL.includes('://')) {
            const match = columnL.match(/https?:\/\/([^.]+)\.sellercentry\.com/);
            if (match) {
              subdomain = match[1];
            }
          }
          // Handle domain format: subdomain.sellercentry.com
          else if (columnL.includes('.sellercentry.com')) {
            subdomain = columnL.replace('.sellercentry.com', '').trim();
          }
          // Handle plain subdomain (no domain suffix)
          else if (columnL && !columnL.includes(' ') && !columnL.includes('.')) {
            subdomain = columnL.toLowerCase();
          }
        }

        // Fallback to store name if no subdomain found
        if (!subdomain && storeName) {
          subdomain = storeName.toLowerCase().replace(/\s+/g, '-');
        }

        if (subdomain && !seenSubdomains.has(subdomain)) {
          seenSubdomains.add(subdomain);
          accounts.push({ subdomain, storeName: storeName || subdomain });
        }
      }
    }

    return accounts;
  } catch (error) {
    console.error('Error fetching accounts by email:', error);
    throw error;
  }
}

// Helper function to calculate time-based violation counts from actual violation data
function calculateViolationMetrics(violations: Violation[]): {
  total: number;
  last48h: number;
  last7Days: number;
  highImpact: number;
  atRiskSales: number;
} {
  const now = new Date();
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const cutoff7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let last48h = 0;
  let last7Days = 0;
  let highImpact = 0;
  let atRiskSales = 0;

  for (const violation of violations) {
    // Use the violation date (Column D), not importedAt
    const violationDate = new Date(violation.date);

    if (!isNaN(violationDate.getTime())) {
      if (violationDate >= cutoff48h) {
        last48h++;
      }
      if (violationDate >= cutoff7Days) {
        last7Days++;
      }
    }

    if (violation.ahrImpact === 'High') {
      highImpact++;
    }

    atRiskSales += violation.atRiskSales || 0;
  }

  return {
    total: violations.length,
    last48h,
    last7Days,
    highImpact,
    atRiskSales,
  };
}

// Helper function to fetch violations for a single client (for metrics calculation)
async function fetchClientViolationsForMetrics(
  sheetUrl: string,
  tab: 'active' | 'resolved' = 'active'
): Promise<Violation[]> {
  try {
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return [];
    }

    const sheets = getGoogleSheetsClient();

    const tabNameVariations = tab === 'active'
      ? ['All Current Violations', 'Current Violations', 'Active Violations']
      : ['All Resolved Violations', 'Resolved Violations'];

    for (const tabName of tabNameVariations) {
      try {
        const response = await withRetry(
          () => throttledRequest(() =>
            sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: `'${tabName}'!A:N`,
            })
          ),
          2, // Fewer retries for batch operations
          500
        );

        const rows = response.data.values as string[][] | undefined;
        if (!rows || rows.length < 2) {
          return [];
        }

        const violations: Violation[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || (!row[0] && !row[4])) continue;

          violations.push({
            id: row[0] || `gen-${i}`,
            importedAt: row[1] || '',
            reason: row[2] || '',
            date: row[3] || '',
            asin: row[4] || '',
            productTitle: row[5] || '',
            atRiskSales: parseFloat(row[6]?.replace(/[$,]/g, '')) || 0,
            actionTaken: row[7] || '',
            ahrImpact: parseAhrImpact(row[8]),
            nextSteps: row[9] || '',
            options: row[10] || '',
            status: tab === 'resolved' ? 'Resolved' : parseViolationStatus(row[11]),
            notes: row[12] || '',
            dateResolved: tab === 'resolved' ? row[13] || '' : undefined,
            docsNeeded: tab === 'active' ? row[13] || '' : undefined,
          });
        }
        return violations;
      } catch (tabError: unknown) {
        const errorMessage = tabError instanceof Error ? tabError.message : String(tabError);
        if (errorMessage.includes('Unable to parse range') || errorMessage.includes('not found')) {
          continue;
        }
        throw tabError;
      }
    }
    return [];
  } catch (error) {
    console.error('Error fetching client violations for metrics:', error);
    return [];
  }
}

// Get all clients with their metrics for the team dashboard
// Fetches violations from each client's sheet to calculate accurate time-based counts
export async function getAllClientsWithMetrics(): Promise<ClientOverview[]> {
  // Check cache first
  const cached = getCachedClients();
  if (cached) {
    return cached;
  }

  try {
    const sheets = getGoogleSheetsClient();

    // First, get basic client info from master sheet
    const response = await withRetry(() =>
      throttledRequest(() =>
        sheets.spreadsheets.values.get({
          spreadsheetId: CLIENT_MAPPING_SHEET_ID,
          range: `'All Seller Information'!A:N`,
        })
      )
    );

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [];
    }

    // Build list of clients with their sheet URLs
    const clientsBasic: Array<{
      storeName: string;
      subdomain: string;
      email: string;
      sheetUrl: string;
    }> = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const storeName = (row[0] || '').toString().trim();
      if (!storeName) continue;

      const sheetUrl = row[3] || '';
      const columnL = (row[11] || '').toString().trim();

      let subdomain = '';
      if (columnL) {
        if (columnL.includes('://')) {
          const match = columnL.match(/https?:\/\/([^.]+)\.sellercentry\.com/);
          if (match) subdomain = match[1];
        } else if (columnL.includes('.sellercentry.com')) {
          subdomain = columnL.replace('.sellercentry.com', '').trim();
        } else if (!columnL.includes(' ') && !columnL.includes('.')) {
          subdomain = columnL.toLowerCase();
        }
      }
      if (!subdomain) {
        subdomain = storeName.toLowerCase().replace(/\s+/g, '-');
      }

      clientsBasic.push({
        storeName,
        subdomain,
        email: row[2] || '',
        sheetUrl,
      });
    }

    // Fetch violations for each client and calculate metrics
    // Process in batches to avoid rate limits
    const clients: ClientOverview[] = [];
    const batchSize = 5;

    for (let i = 0; i < clientsBasic.length; i += batchSize) {
      const batch = clientsBasic.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (client) => {
          // Fetch active violations
          const activeViolations = await fetchClientViolationsForMetrics(client.sheetUrl, 'active');
          const activeMetrics = calculateViolationMetrics(activeViolations);

          // Fetch resolved violations for resolved counts
          const resolvedViolations = await fetchClientViolationsForMetrics(client.sheetUrl, 'resolved');
          const resolvedMetrics = calculateViolationMetrics(resolvedViolations);

          return {
            ...client,
            violations48h: activeMetrics.last48h,
            violationsThisWeek: activeMetrics.last7Days,
            resolvedThisMonth: resolvedMetrics.last7Days * 4, // Approximate monthly from weekly
            resolvedThisWeek: resolvedMetrics.last7Days,
            activeViolations: activeMetrics.total,
            highImpactCount: activeMetrics.highImpact,
            atRiskSales: activeMetrics.atRiskSales,
          } as ClientOverview;
        })
      );

      clients.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < clientsBasic.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Cache the results
    setCachedClients(clients);

    return clients;
  } catch (error) {
    console.error('Error fetching all clients:', error);
    throw error;
  }
}

// Get basic client list - now uses the same calculation as detailed
// to ensure consistency with actual violation dates
export async function getAllClientsBasic(): Promise<ClientOverview[]> {
  // Use the same function for consistency - both should calculate from actual violation data
  return getAllClientsWithMetrics();
}

// ============================================
// WRITE OPERATIONS - Team Tool Only
// ============================================

// Column mapping for violation updates
// Note: Column N is shared - used for docsNeeded in active tab, dateResolved in resolved tab
const VIOLATION_COLUMN_MAP: Record<string, string> = {
  actionTaken: 'H',
  ahrImpact: 'I',
  nextSteps: 'J',
  options: 'K',
  status: 'L',
  notes: 'M',
  docsNeeded: 'N', // Column N for active violations
};

// Type for violation updates
export interface ViolationUpdate {
  actionTaken?: string;
  ahrImpact?: 'High' | 'Low' | 'No impact';
  nextSteps?: string;
  options?: string;
  status?: ViolationStatus;
  notes?: string;
  docsNeeded?: string;
}

// Export extractSheetId for use by API routes
export { extractSheetId };

// Custom error class for Google Sheets operations
export class SheetsError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'RATE_LIMITED' | 'UNKNOWN',
    public details?: string
  ) {
    super(message);
    this.name = 'SheetsError';
  }
}

// Parse Google API errors into user-friendly messages
function handleSheetsError(error: unknown): never {
  if (error instanceof SheetsError) {
    throw error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorObj = error as { code?: number; status?: number };

  if (errorObj.code === 403 || errorObj.status === 403 || errorMessage.includes('403')) {
    throw new SheetsError(
      'Permission denied. The service account may not have write access to this sheet.',
      'PERMISSION_DENIED',
      errorMessage
    );
  }

  if (errorObj.code === 404 || errorObj.status === 404 || errorMessage.includes('not found')) {
    throw new SheetsError(
      'Sheet or range not found. The tab name or cell reference may be incorrect.',
      'NOT_FOUND',
      errorMessage
    );
  }

  if (errorObj.code === 429 || errorObj.status === 429 || errorMessage.includes('rate')) {
    throw new SheetsError(
      'Rate limit exceeded. Please wait a moment and try again.',
      'RATE_LIMITED',
      errorMessage
    );
  }

  throw new SheetsError(
    'An unexpected error occurred while updating the sheet.',
    'UNKNOWN',
    errorMessage
  );
}

// Find a row by Violation ID in a specific tab
// Uses retry logic to handle rate limits
export async function findRowByViolationId(
  sheetId: string,
  tabName: string,
  violationId: string
): Promise<number | null> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await withRetry(
      () => throttledRequest(() =>
        sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `'${tabName}'!A:A`,
        })
      ),
      3,
      1000
    );

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return null;
    }

    // Find the row (1-indexed, skip header at row 1)
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === violationId) {
        return i + 1; // Convert to 1-indexed row number
      }
    }

    return null;
  } catch (error) {
    console.error(`Error finding row for violation ${violationId}:`, error);
    handleSheetsError(error);
  }
}

// Update a violation with specific field changes
// Uses sequential updates with retry to avoid rate limits
export async function updateViolation(
  sheetId: string,
  tabName: string,
  rowNumber: number,
  updates: ViolationUpdate
): Promise<void> {
  try {
    const sheets = getGoogleSheetsClient();

    // Process updates sequentially to avoid rate limits
    for (const [field, value] of Object.entries(updates)) {
      if (value === undefined) continue;

      const column = VIOLATION_COLUMN_MAP[field];
      if (!column) {
        console.warn(`Unknown field: ${field}`);
        continue;
      }

      const range = `'${tabName}'!${column}${rowNumber}`;

      // Use retry with throttling for each update
      await withRetry(
        () => throttledRequest(() =>
          sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[value]],
            },
          })
        ),
        3, // max retries
        1000 // base delay
      );

      // Small delay between updates to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error(`Error updating violation at row ${rowNumber}:`, error);
    handleSheetsError(error);
  }
}

// Read a full row of violation data (columns A through N)
// Uses retry logic to handle rate limits
export async function readViolationRow(
  sheetId: string,
  tabName: string,
  rowNumber: number
): Promise<string[] | null> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await withRetry(
      () => throttledRequest(() =>
        sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `'${tabName}'!A${rowNumber}:N${rowNumber}`,
        })
      ),
      3,
      1000
    );

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return null;
    }

    return rows[0];
  } catch (error) {
    console.error(`Error reading violation at row ${rowNumber}:`, error);
    handleSheetsError(error);
  }
}

// Append a row to a tab
// Uses retry logic to handle rate limits
export async function appendRow(
  sheetId: string,
  tabName: string,
  rowData: string[]
): Promise<void> {
  try {
    const sheets = getGoogleSheetsClient();

    await withRetry(
      () => throttledRequest(() =>
        sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `'${tabName}'!A:N`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [rowData],
          },
        })
      ),
      3,
      1000
    );

  } catch (error) {
    console.error(`Error appending row to ${tabName}:`, error);
    handleSheetsError(error);
  }
}

// Delete a row from a tab (requires getting sheet gid first)
// Uses retry logic to handle rate limits
export async function deleteRow(
  sheetId: string,
  tabName: string,
  rowNumber: number
): Promise<void> {
  try {
    const sheets = getGoogleSheetsClient();

    // First, get the sheet metadata to find the sheet ID (gid)
    const spreadsheet = await withRetry(
      () => throttledRequest(() =>
        sheets.spreadsheets.get({
          spreadsheetId: sheetId,
          fields: 'sheets.properties',
        })
      ),
      3,
      1000
    );

    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === tabName
    );

    if (!sheet || sheet.properties?.sheetId === undefined) {
      throw new SheetsError(
        `Tab "${tabName}" not found in spreadsheet`,
        'NOT_FOUND'
      );
    }

    const sheetGid = sheet.properties.sheetId;

    // Delete the row using batchUpdate
    await withRetry(
      () => throttledRequest(() =>
        sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: sheetGid,
                    dimension: 'ROWS',
                    startIndex: rowNumber - 1, // 0-indexed
                    endIndex: rowNumber, // Exclusive
                  },
                },
              },
            ],
          },
        })
      ),
      3,
      1000
    );

  } catch (error) {
    console.error(`Error deleting row ${rowNumber} from ${tabName}:`, error);
    handleSheetsError(error);
  }
}

// Resolve a violation: move from active tab to resolved tab
export async function resolveViolation(
  sheetId: string,
  activeTabName: string,
  resolvedTabName: string,
  rowNumber: number
): Promise<void> {
  try {
    // Read the current row data (A through N)
    const rowData = await readViolationRow(sheetId, activeTabName, rowNumber);
    if (!rowData) {
      throw new SheetsError(
        'Could not read violation data',
        'NOT_FOUND'
      );
    }

    // Ensure we have at least 14 columns (A-N)
    while (rowData.length < 14) {
      rowData.push('');
    }

    // Set DateResolved (Column N, index 13) to current date
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    rowData[13] = today;

    // Append to resolved tab
    await appendRow(sheetId, resolvedTabName, rowData);

    // Delete from active tab
    await deleteRow(sheetId, activeTabName, rowNumber);
  } catch (error) {
    console.error('Error resolving violation:', error);
    if (error instanceof SheetsError) {
      throw error;
    }
    handleSheetsError(error);
  }
}

// Get the sheet ID for a client by subdomain
export async function getClientSheetId(subdomain: string): Promise<string | null> {
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant || !tenant.sheetUrl) {
    return null;
  }
  return extractSheetId(tenant.sheetUrl);
}
