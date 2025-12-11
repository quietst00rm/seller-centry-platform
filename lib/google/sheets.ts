import { google } from 'googleapis';
import type { Tenant, Violation, ViolationStatus } from '@/types';

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
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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

    // First, get the spreadsheet metadata to find the first sheet name
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: CLIENT_MAPPING_SHEET_ID,
      fields: 'sheets.properties.title',
    });

    const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CLIENT_MAPPING_SHEET_ID,
      range: `'${firstSheetName}'!A:L`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return null;
    }

    // Find the row matching the subdomain (Column A = StoreName)
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const storeName = (row[0] || '').toString().toLowerCase();

      if (storeName === subdomain.toLowerCase()) {
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
          subdomain: row[11] || `${storeName}.sellercentry.com`,
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
  const statusMap: Record<string, ViolationStatus> = {
    'working': 'Working',
    'waiting on client': 'Waiting on Client',
    'submitted': 'Submitted',
    'denied': 'Denied',
    'ignored': 'Ignored',
    'resolved': 'Resolved',
  };
  return statusMap[normalized.toLowerCase()] || 'Working';
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

    // Determine which tab to read from
    const tabName = tab === 'active' ? 'All Current Violations' : 'All Resolved Violations';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A:N`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [];
    }

    // Skip header row and map data
    const violations: Violation[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Skip empty rows
      if (!row[0] && !row[4]) continue;

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
      };

      violations.push(violation);
    }

    return violations;
  } catch (error) {
    console.error('Error fetching violations:', error);
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
