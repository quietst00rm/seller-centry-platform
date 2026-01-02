import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantBySubdomain, getViolations } from '@/lib/google/sheets';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Violation } from '@/types';

// Brand colors
const BRAND = {
  primaryOrange: '#E67E22',
  slateNavy: '#1E293B',
  coolGray: '#64748B',
  lightGray: '#F1F5F9',
  successGreen: '#059669',
  impactRed: '#EF4444',
  impactAmber: '#F59E0B',
  white: '#FFFFFF',
};

// Convert hex to RGB array for jsPDF
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date to MM/DD/YYYY
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

// Truncate text with ellipsis
function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Filter violations by date range
function filterByDateRange(
  violations: Violation[],
  dateRange: string
): Violation[] {
  if (dateRange === 'all' || dateRange === 'All Time') return violations;

  const now = new Date();
  let daysAgo = 30;

  if (dateRange === '7days' || dateRange === 'Last 7 Days') daysAgo = 7;
  else if (dateRange === '30days' || dateRange === 'Last 30 Days') daysAgo = 30;
  else if (dateRange === '90days' || dateRange === 'Last 90 Days') daysAgo = 90;

  const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  return violations.filter((v) => {
    const violationDate = new Date(v.date);
    return violationDate >= cutoffDate;
  });
}

// Filter by search term
function filterBySearch(violations: Violation[], search: string): Violation[] {
  if (!search) return violations;

  const searchLower = search.toLowerCase();
  return violations.filter(
    (v) =>
      v.asin.toLowerCase().includes(searchLower) ||
      v.productTitle.toLowerCase().includes(searchLower) ||
      v.reason.toLowerCase().includes(searchLower) ||
      v.id.toLowerCase().includes(searchLower)
  );
}

// Get date range string for display
function getDateRangeDisplay(dateRange: string): string {
  const now = new Date();
  let daysAgo = 0;

  if (dateRange === '7days' || dateRange === 'Last 7 Days') daysAgo = 7;
  else if (dateRange === '30days' || dateRange === 'Last 30 Days') daysAgo = 30;
  else if (dateRange === '90days' || dateRange === 'Last 90 Days') daysAgo = 90;

  if (daysAgo === 0) {
    return 'All Time';
  }

  const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const formatOpt: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };

  return `${startDate.toLocaleDateString('en-US', formatOpt)} - ${now.toLocaleDateString('en-US', formatOpt)}`;
}

// Calculate summary metrics
function calculateMetrics(
  violations: Violation[],
  tab: 'active' | 'resolved' | 'all'
) {
  const activeViolations = violations.filter(
    (v) => v.status.toLowerCase() !== 'resolved'
  );
  const resolvedViolations = violations.filter(
    (v) => v.status.toLowerCase() === 'resolved'
  );

  const totalAtRiskSaved = resolvedViolations.reduce(
    (sum, v) => sum + (v.atRiskSales || 0),
    0
  );
  const totalAtRiskActive = activeViolations.reduce(
    (sum, v) => sum + (v.atRiskSales || 0),
    0
  );

  // Unique ASINs protected (resolved)
  const uniqueAsinsProtected = new Set(resolvedViolations.map((v) => v.asin))
    .size;

  // Resolved this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const resolvedThisMonth = resolvedViolations.filter((v) => {
    if (!v.dateResolved) return false;
    const resolvedDate = new Date(v.dateResolved);
    return resolvedDate >= startOfMonth;
  }).length;

  if (tab === 'resolved') {
    return {
      metric1: { label: 'Total Resolved', value: resolvedViolations.length, subLabel: 'This Period' },
      metric2: { label: 'Revenue Protected', value: formatCurrency(totalAtRiskSaved), subLabel: 'At-Risk Saved' },
      metric3: { label: 'ASINs Protected', value: uniqueAsinsProtected, subLabel: 'Unique Products' },
      metric4: { label: 'This Month', value: resolvedThisMonth, subLabel: 'Recently Resolved' },
    };
  }

  // For active tab
  const highImpactCount = activeViolations.filter(
    (v) => v.ahrImpact === 'High'
  ).length;

  return {
    metric1: { label: 'Open Violations', value: activeViolations.length, subLabel: 'Currently Active' },
    metric2: { label: 'At Risk Sales', value: formatCurrency(totalAtRiskActive), subLabel: 'Potential Impact' },
    metric3: { label: 'High Impact', value: highImpactCount, subLabel: 'Require Attention' },
    metric4: { label: 'Total Resolved', value: resolvedViolations.length, subLabel: 'All Time' },
  };
}

// Generate the PDF
function generateViolationsPDF(
  storeName: string,
  merchantId: string,
  violations: Violation[],
  tab: 'active' | 'resolved' | 'all',
  dateRange: string,
  search: string
): ArrayBuffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 19.05; // 0.75 inches
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Track page numbers
  let pageNumber = 1;
  const totalPages = () => doc.internal.pages.length - 1;

  // Add footer to current page
  const addFooter = () => {
    const footerY = pageHeight - 12;

    // Left: Confidential notice
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'normal');
    doc.text(`Confidential - Prepared for ${storeName}`, margin, footerY);

    // Center: Page X of Y
    doc.text(`Page ${pageNumber}`, pageWidth / 2, footerY, { align: 'center' });

    // Right: Seller Centry
    doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
    doc.text('sellercentry.com', pageWidth - margin, footerY, { align: 'right' });
  };

  // Helper for new page
  const checkNewPage = (requiredSpace: number): boolean => {
    if (yPos + requiredSpace > pageHeight - 25) {
      addFooter();
      doc.addPage();
      pageNumber++;
      yPos = margin;
      return true;
    }
    return false;
  };

  // ========== HEADER SECTION ==========
  // Logo text (since we can't embed images easily)
  doc.setFontSize(20);
  doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
  doc.setFont('helvetica', 'bold');
  doc.text('SELLER CENTRY', margin, yPos + 5);

  // Small brand indicator
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(BRAND.coolGray));
  doc.setFont('helvetica', 'normal');
  doc.text('Account Health Management', margin, yPos + 10);
  yPos += 18;

  // Report title
  doc.setFontSize(22);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'bold');
  doc.text('Account Health Report', margin, yPos);
  yPos += 9;

  // Client name
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'normal');
  doc.text(storeName, margin, yPos);
  yPos += 6;

  // Merchant ID
  if (merchantId) {
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.text(`Merchant ID: ${merchantId}`, margin, yPos);
    yPos += 6;
  }

  // Date range
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Period: ${getDateRangeDisplay(dateRange)}`, margin, yPos);
  yPos += 6;

  // Generated date
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(BRAND.coolGray));
  doc.setFont('helvetica', 'normal');
  const generatedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(`Generated: ${generatedDate}`, margin, yPos);
  yPos += 12;

  // Divider line
  doc.setDrawColor(...hexToRgb(BRAND.coolGray));
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ========== SUMMARY METRICS SECTION ==========
  const metrics = calculateMetrics(violations, tab);
  const cardWidth = (contentWidth - 9) / 4; // 3mm gaps between cards
  const cardHeight = 28;
  const cardStartX = margin;

  // Draw metric cards
  const metricEntries = [metrics.metric1, metrics.metric2, metrics.metric3, metrics.metric4];

  metricEntries.forEach((metric, index) => {
    const cardX = cardStartX + index * (cardWidth + 3);

    // Card background
    doc.setFillColor(...hexToRgb(BRAND.lightGray));
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'F');

    // Card border
    doc.setDrawColor(...hexToRgb(BRAND.coolGray));
    doc.setLineWidth(0.2);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'S');

    // Metric label
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'normal');
    doc.text(metric.label.toUpperCase(), cardX + cardWidth / 2, yPos + 7, { align: 'center' });

    // Metric value
    doc.setFontSize(16);
    doc.setTextColor(...hexToRgb(BRAND.slateNavy));
    doc.setFont('helvetica', 'bold');
    const valueStr = typeof metric.value === 'number' ? metric.value.toString() : metric.value;
    doc.text(valueStr, cardX + cardWidth / 2, yPos + 17, { align: 'center' });

    // Sub label
    doc.setFontSize(6);
    doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
    doc.setFont('helvetica', 'normal');
    doc.text(metric.subLabel, cardX + cardWidth / 2, yPos + 23, { align: 'center' });
  });

  yPos += cardHeight + 12;

  // ========== VIOLATIONS TABLE ==========
  // Section header
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'bold');
  const tabLabel = tab === 'resolved' ? 'Resolved' : tab === 'all' ? 'All' : 'Active';
  doc.text(`${tabLabel} Violations`, margin, yPos);
  yPos += 3;

  // Violations count and search indicator
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(BRAND.coolGray));
  doc.setFont('helvetica', 'normal');
  let countText = `${violations.length} issue${violations.length !== 1 ? 's' : ''} found`;
  if (search) {
    countText += ` matching "${truncateText(search, 20)}"`;
  }
  doc.text(countText, margin, yPos + 5);
  yPos += 12;

  // Handle empty results
  if (violations.length === 0) {
    checkNewPage(40);

    doc.setFillColor(...hexToRgb(BRAND.lightGray));
    doc.roundedRect(margin, yPos, contentWidth, 30, 3, 3, 'F');

    doc.setFontSize(12);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'normal');
    doc.text('No violations found for this period', pageWidth / 2, yPos + 18, { align: 'center' });
    yPos += 40;
  } else {
    // Prepare table data
    const tableHeaders = [
      'ASIN',
      'Product Title',
      'Issue Type',
      '$ At Risk',
      'Impact',
      'Status',
      'Opened',
      'Resolved',
    ];

    const tableData = violations.map((v) => [
      v.asin || '-',
      truncateText(v.productTitle, 40),
      truncateText(v.reason, 25),
      formatCurrency(v.atRiskSales || 0),
      v.ahrImpact || '-',
      v.status || '-',
      formatDate(v.date),
      v.dateResolved ? formatDate(v.dateResolved) : 'Pending',
    ]);

    // Use autoTable for proper pagination
    autoTable(doc, {
      startY: yPos,
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: hexToRgb(BRAND.slateNavy),
        textColor: hexToRgb(BRAND.white),
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: hexToRgb(BRAND.slateNavy),
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: hexToRgb(BRAND.lightGray),
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' }, // ASIN
        1: { cellWidth: 38 }, // Product Title
        2: { cellWidth: 28 }, // Issue Type
        3: { cellWidth: 18, halign: 'right' }, // $ At Risk
        4: { cellWidth: 14 }, // Impact
        5: { cellWidth: 22 }, // Status
        6: { cellWidth: 18 }, // Opened
        7: { cellWidth: 18 }, // Resolved
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        // Color code impact column
        if (data.section === 'body' && data.column.index === 4) {
          const impact = data.cell.raw as string;
          if (impact === 'High') {
            data.cell.styles.textColor = hexToRgb(BRAND.impactRed);
            data.cell.styles.fontStyle = 'bold';
          } else if (impact === 'Medium') {
            data.cell.styles.textColor = hexToRgb(BRAND.impactAmber);
          } else if (impact === 'Low') {
            data.cell.styles.textColor = hexToRgb(BRAND.coolGray);
          }
        }
        // Color code status column
        if (data.section === 'body' && data.column.index === 5) {
          const status = (data.cell.raw as string).toLowerCase();
          if (status === 'resolved') {
            data.cell.styles.textColor = hexToRgb(BRAND.successGreen);
          } else if (status === 'denied') {
            data.cell.styles.textColor = hexToRgb(BRAND.impactRed);
          }
        }
        // Color resolved date column
        if (data.section === 'body' && data.column.index === 7) {
          const resolved = data.cell.raw as string;
          if (resolved !== 'Pending' && resolved !== '-') {
            data.cell.styles.textColor = hexToRgb(BRAND.successGreen);
          }
        }
      },
      didDrawPage: () => {
        // Add footer to each page
        const currentPage = doc.internal.pages.length - 1;
        const footerY = pageHeight - 12;

        doc.setFontSize(8);
        doc.setTextColor(...hexToRgb(BRAND.coolGray));
        doc.setFont('helvetica', 'normal');
        doc.text(`Confidential - Prepared for ${storeName}`, margin, footerY);

        doc.text(`Page ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });

        doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
        doc.text('sellercentry.com', pageWidth - margin, footerY, { align: 'right' });
      },
    });
  }

  // Add footer to last page if table was empty
  if (violations.length === 0) {
    addFooter();
  }

  return doc.output('arraybuffer');
}

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const subdomain = searchParams.get('subdomain');
    const tab = (searchParams.get('tab') as 'active' | 'resolved' | 'all') || 'active';
    const dateRange = searchParams.get('dateRange') || 'all';
    const search = searchParams.get('search') || '';

    if (!subdomain) {
      return NextResponse.json({ success: false, error: 'Subdomain is required' }, { status: 400 });
    }

    // Fetch tenant info
    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Fetch violations based on tab
    let violations: Violation[] = [];
    if (tab === 'all') {
      const [active, resolved] = await Promise.all([
        getViolations(tenant, 'active'),
        getViolations(tenant, 'resolved'),
      ]);
      violations = [...active, ...resolved];
    } else {
      violations = await getViolations(tenant, tab);
    }

    // Apply filters
    violations = filterByDateRange(violations, dateRange);
    violations = filterBySearch(violations, search);

    // Sort by date (newest first)
    violations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Generate the PDF
    const pdfBuffer = generateViolationsPDF(
      tenant.storeName,
      tenant.merchantId,
      violations,
      tab,
      dateRange,
      search
    );

    // Create filename
    const sanitizedSubdomain = subdomain.replace(/[^a-zA-Z0-9-]/g, '');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedSubdomain}-violations-report-${dateStr}.pdf`;

    console.log(`[GET /api/export/violations-pdf] Generated PDF for ${subdomain} with ${violations.length} violations`);

    // Return the PDF
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating violations PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
