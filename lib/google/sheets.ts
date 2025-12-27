import { google } from 'googleapis';
import type { Tenant, Violation, ViolationStatus, ClientOverview } from '@/types';

// Client Mapping Sheet ID
const CLIENT_MAPPING_SHEET_ID = '1p-J1x9B6UlaUNkULjx8YMXRpqKVaD1vRnkOjYTD1qMc';

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
export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CLIENT_MAPPING_SHEET_ID,
      range: `'All Seller Information'!A:N`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
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
        return {
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
      }
    }

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

    // For active tab, read A:O to include Docs Needed column (Column O)
    // For resolved tab, read A:N as before
    const rangeEnd = tab === 'active' ? 'O' : 'N';

    let rows: string[][] | undefined;
    let usedTabName: string | null = null;

    // Try each tab name variation until one works
    for (const tabName of tabNameVariations) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `'${tabName}'!A:${rangeEnd}`,
        });
        rows = response.data.values as string[][] | undefined;
        usedTabName = tabName;
        console.log(`[getViolations] Found tab "${tabName}" for ${tab} violations`);
        break;
      } catch (tabError: unknown) {
        // Tab doesn't exist, try next variation
        const errorMessage = tabError instanceof Error ? tabError.message : String(tabError);
        if (errorMessage.includes('Unable to parse range') || errorMessage.includes('not found')) {
          console.log(`[getViolations] Tab "${tabName}" not found, trying next...`);
          continue;
        }
        // If it's a different error (auth, network, etc.), throw it
        throw tabError;
      }
    }

    if (!usedTabName || !rows) {
      console.error(`[getViolations] No valid tab found for ${tab} violations. Tried: ${tabNameVariations.join(', ')}`);
      return [];
    }

    if (rows.length < 2) {
      console.log(`[getViolations] Tab "${usedTabName}" exists but has no data rows`);
      return [];
    }

    // Skip header row and map data
    const violations: Violation[] = [];

    // Debug: Log header row to verify column structure
    if (rows.length > 0) {
      console.log(`[getViolations] Header row: ${rows[0].slice(0, 14).join(' | ')}`);
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Skip empty rows (rows without Violation ID AND without ASIN)
      if (!row || (!row[0] && !row[4])) {
        continue;
      }

      // Debug: Log raw status value from column L (index 11) for first few rows
      if (i <= 5) {
        console.log(`[getViolations] Row ${i} - Raw status (col L): "${row[11]}" → Parsed: "${tab === 'resolved' ? 'Resolved' : parseViolationStatus(row[11])}"`);
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
        dateResolved: tab === 'resolved' ? row[13] || '' : undefined,
        docsNeeded: tab === 'active' ? row[14] || '' : undefined,
      };

      violations.push(violation);
    }

    console.log(`[getViolations] Returning ${violations.length} ${tab} violations from "${usedTabName}"`);
    return violations;
  } catch (error) {
    console.error('Error fetching violations:', error);
    throw error;
  }
}

// Get violations for team view (includes Column O - Docs Needed for active violations)
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

    // For active tab, read A:O to include Docs Needed column
    // For resolved tab, read A:N as before
    const rangeEnd = tab === 'active' ? 'O' : 'N';

    let rows: string[][] | undefined;
    let usedTabName: string | null = null;

    for (const tabName of tabNameVariations) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `'${tabName}'!A:${rangeEnd}`,
        });
        rows = response.data.values as string[][] | undefined;
        usedTabName = tabName;
        console.log(`[getViolationsForTeam] Found tab "${tabName}" for ${tab} violations`);
        break;
      } catch (tabError: unknown) {
        const errorMessage = tabError instanceof Error ? tabError.message : String(tabError);
        if (errorMessage.includes('Unable to parse range') || errorMessage.includes('not found')) {
          console.log(`[getViolationsForTeam] Tab "${tabName}" not found, trying next...`);
          continue;
        }
        throw tabError;
      }
    }

    if (!usedTabName || !rows) {
      console.error(`[getViolationsForTeam] No valid tab found for ${tab} violations. Tried: ${tabNameVariations.join(', ')}`);
      return [];
    }

    if (rows.length < 2) {
      console.log(`[getViolationsForTeam] Tab "${usedTabName}" exists but has no data rows`);
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
        dateResolved: tab === 'resolved' ? row[13] || '' : undefined,
        docsNeeded: tab === 'active' ? row[14] || '' : undefined,
      };

      violations.push(violation);
    }

    console.log(`[getViolationsForTeam] Returning ${violations.length} ${tab} violations from "${usedTabName}"`);
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
export async function getSubdomainsByEmail(email: string): Promise<string[]> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CLIENT_MAPPING_SHEET_ID,
      range: `'All Seller Information'!A:L`,
    });

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
export async function getAccountsByEmail(email: string): Promise<{ subdomain: string; storeName: string }[]> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CLIENT_MAPPING_SHEET_ID,
      range: `'All Seller Information'!A:L`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.log(`[getAccountsByEmail] No data rows found for email: ${email}`);
      return [];
    }

    const emailLower = email.toLowerCase();
    const isMasterUser = MASTER_USER_EMAILS.some(master => master.toLowerCase() === emailLower);

    console.log(`[getAccountsByEmail] Searching for email: ${email} in ${rows.length - 1} rows (isMasterUser: ${isMasterUser})`);

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

    console.log(`[getAccountsByEmail] Found ${accounts.length} accounts for ${email}`);
    return accounts;
  } catch (error) {
    console.error('Error fetching accounts by email:', error);
    throw error;
  }
}

// Get all clients with their metrics for the team dashboard
export async function getAllClientsWithMetrics(): Promise<ClientOverview[]> {
  try {
    const sheets = getGoogleSheetsClient();

    // Fetch all data from master sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CLIENT_MAPPING_SHEET_ID,
      range: `'All Seller Information'!A:N`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [];
    }

    const clients: ClientOverview[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Process each row (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const storeName = (row[0] || '').toString().trim();

      // Skip empty rows
      if (!storeName) continue;

      const sheetUrl = row[3] || '';
      const columnL = (row[11] || '').toString().trim();

      // Extract subdomain
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

      // Use master sheet data for basic metrics
      // Column G (index 6) has violations last 2 days - use as approximation for 48h
      const violations2Days = parseInt(row[6]) || 0;
      // Column F (index 5) has violations last 7 days - we'll calculate 72h from individual sheet
      const atRiskSales = parseFloat(row[7]?.replace(/[$,]/g, '')) || 0;
      const highImpactCount = parseInt(row[8]) || 0;
      const resolvedTotal = parseInt(row[9]) || 0;

      // For detailed metrics (48h, 72h, resolved this month), we need to fetch individual sheets
      // This will be done asynchronously to avoid blocking
      const clientData: ClientOverview = {
        storeName,
        subdomain,
        email: row[2] || '',
        sheetUrl,
        violations48h: violations2Days, // Approximation from master sheet
        violations72h: 0, // Will be calculated from individual sheet
        resolvedThisMonth: 0, // Will be calculated from individual sheet
        resolvedTotal,
        highImpactCount,
        atRiskSales,
      };

      clients.push(clientData);
    }

    // Fetch detailed metrics for each client in parallel (with concurrency limit)
    const CONCURRENCY_LIMIT = 5;
    const clientChunks: ClientOverview[][] = [];
    for (let i = 0; i < clients.length; i += CONCURRENCY_LIMIT) {
      clientChunks.push(clients.slice(i, i + CONCURRENCY_LIMIT));
    }

    for (const chunk of clientChunks) {
      await Promise.all(
        chunk.map(async (client) => {
          try {
            const sheetId = extractSheetId(client.sheetUrl);
            if (!sheetId) return;

            // Fetch active violations for 48h/72h counts
            const activeResponse = await sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: `'All Current Violations'!A:B`,
            }).catch(() => null);

            if (activeResponse?.data.values && activeResponse.data.values.length > 1) {
              const violations = activeResponse.data.values.slice(1);
              const now48hAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
              const now72hAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

              let count48h = 0;
              let count72h = 0;

              for (const violation of violations) {
                const importedAt = violation[1]; // Column B is ImportedAt
                if (!importedAt) continue;

                const importedDate = new Date(importedAt);
                if (isNaN(importedDate.getTime())) continue;

                if (importedDate >= now48hAgo) count48h++;
                if (importedDate >= now72hAgo) count72h++;
              }

              client.violations48h = count48h;
              client.violations72h = count72h;
            }

            // Fetch resolved violations for this month count
            const resolvedResponse = await sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: `'All Resolved Violations'!A:N`,
            }).catch(() => null);

            if (resolvedResponse?.data.values && resolvedResponse.data.values.length > 1) {
              const resolved = resolvedResponse.data.values.slice(1);
              let resolvedThisMonth = 0;

              for (const violation of resolved) {
                const dateResolved = violation[13]; // Column N is DateResolved
                if (!dateResolved) continue;

                const resolvedDate = new Date(dateResolved);
                if (isNaN(resolvedDate.getTime())) continue;

                if (
                  resolvedDate.getMonth() === currentMonth &&
                  resolvedDate.getFullYear() === currentYear
                ) {
                  resolvedThisMonth++;
                }
              }

              client.resolvedThisMonth = resolvedThisMonth;
            }
          } catch (error) {
            console.error(`Error fetching metrics for ${client.storeName}:`, error);
            // Keep default values on error
          }
        })
      );
    }

    console.log(`[getAllClientsWithMetrics] Returning ${clients.length} clients`);
    return clients;
  } catch (error) {
    console.error('Error fetching all clients:', error);
    throw error;
  }
}

// Get basic client list without detailed metrics (faster, for initial load)
export async function getAllClientsBasic(): Promise<ClientOverview[]> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CLIENT_MAPPING_SHEET_ID,
      range: `'All Seller Information'!A:N`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [];
    }

    const clients: ClientOverview[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const storeName = (row[0] || '').toString().trim();

      if (!storeName) continue;

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

      clients.push({
        storeName,
        subdomain,
        email: row[2] || '',
        sheetUrl: row[3] || '',
        violations48h: parseInt(row[6]) || 0, // Using 2-day column as approximation
        violations72h: parseInt(row[5]) || 0, // Using 7-day column as approximation
        resolvedThisMonth: 0, // Not available from master sheet
        resolvedTotal: parseInt(row[9]) || 0,
        highImpactCount: parseInt(row[8]) || 0,
        atRiskSales: parseFloat(row[7]?.replace(/[$,]/g, '')) || 0,
      });
    }

    console.log(`[getAllClientsBasic] Returning ${clients.length} clients`);
    return clients;
  } catch (error) {
    console.error('Error fetching basic clients:', error);
    throw error;
  }
}

// ============================================
// WRITE OPERATIONS - Team Tool Only
// ============================================

// Column mapping for violation updates
const VIOLATION_COLUMN_MAP: Record<string, string> = {
  actionTaken: 'H',
  ahrImpact: 'I',
  nextSteps: 'J',
  options: 'K',
  status: 'L',
  notes: 'M',
  docsNeeded: 'O',
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
export async function findRowByViolationId(
  sheetId: string,
  tabName: string,
  violationId: string
): Promise<number | null> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A:A`,
    });

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
export async function updateViolation(
  sheetId: string,
  tabName: string,
  rowNumber: number,
  updates: ViolationUpdate
): Promise<void> {
  try {
    const sheets = getGoogleSheetsClient();

    // Build batch update requests for each field
    const updatePromises: Promise<unknown>[] = [];

    for (const [field, value] of Object.entries(updates)) {
      if (value === undefined) continue;

      const column = VIOLATION_COLUMN_MAP[field];
      if (!column) {
        console.warn(`Unknown field: ${field}`);
        continue;
      }

      const range = `'${tabName}'!${column}${rowNumber}`;
      console.log(`[updateViolation] Updating ${range} to "${value}"`);

      updatePromises.push(
        sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[value]],
          },
        })
      );
    }

    if (updatePromises.length === 0) {
      console.log('[updateViolation] No updates to apply');
      return;
    }

    await Promise.all(updatePromises);
    console.log(`[updateViolation] Successfully updated ${updatePromises.length} fields at row ${rowNumber}`);
  } catch (error) {
    console.error(`Error updating violation at row ${rowNumber}:`, error);
    handleSheetsError(error);
  }
}

// Read a full row of violation data (columns A through N)
export async function readViolationRow(
  sheetId: string,
  tabName: string,
  rowNumber: number
): Promise<string[] | null> {
  try {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A${rowNumber}:N${rowNumber}`,
    });

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
export async function appendRow(
  sheetId: string,
  tabName: string,
  rowData: string[]
): Promise<void> {
  try {
    const sheets = getGoogleSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A:N`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    });

    console.log(`[appendRow] Successfully appended row to ${tabName}`);
  } catch (error) {
    console.error(`Error appending row to ${tabName}:`, error);
    handleSheetsError(error);
  }
}

// Delete a row from a tab (requires getting sheet gid first)
export async function deleteRow(
  sheetId: string,
  tabName: string,
  rowNumber: number
): Promise<void> {
  try {
    const sheets = getGoogleSheetsClient();

    // First, get the sheet metadata to find the sheet ID (gid)
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'sheets.properties',
    });

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
    await sheets.spreadsheets.batchUpdate({
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
    });

    console.log(`[deleteRow] Successfully deleted row ${rowNumber} from ${tabName}`);
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

    console.log(`[resolveViolation] Successfully moved violation to resolved tab`);
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
