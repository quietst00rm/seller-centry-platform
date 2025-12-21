// Tenant data from the Client Mapping Sheet
export interface Tenant {
  storeName: string;           // Column A - Used as subdomain
  merchantId: string;          // Column B
  email: string;               // Column C
  sheetUrl: string;            // Column D - Link to client's violations sheet
  totalViolations: number;     // Column E
  violationsLast7Days: number; // Column F
  violationsLast2Days: number; // Column G
  atRiskSales: number;         // Column H - Dollar amount
  highImpactCount: number;     // Column I
  resolvedCount: number;       // Column J
  subdomain: string;           // Column L - Full URL like "alwayz-on-sale.sellercentry.com"
  documentFolderUrl?: string;  // Column N - Link to Seller Document Folders (Google Drive)
}

// Violation data from individual client sheets
export interface Violation {
  id: string;                  // Column A - Violation ID (12-char hash)
  importedAt: string;          // Column B - Date imported
  reason: string;              // Column C - Violation type
  date: string;                // Column D - When Amazon flagged it
  asin: string;                // Column E
  productTitle: string;        // Column F
  atRiskSales: number;         // Column G - Dollar amount
  actionTaken: string;         // Column H - e.g., "Listing removed"
  ahrImpact: 'High' | 'Medium' | 'Low' | 'No impact'; // Column I
  nextSteps: string;           // Column J
  options: string;             // Column K
  status: ViolationStatus;     // Column L
  notes: string;               // Column M
  dateResolved?: string;       // Column N (only for resolved)
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
