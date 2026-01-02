import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantBySubdomain, getViolations } from '@/lib/google/sheets';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Violation } from '@/types';

// Brand colors (exact hex values from spec)
const BRAND = {
  primaryOrange: '#E67E22',
  slateNavy: '#1E293B',
  coolGray: '#64748B',
  lightGray: '#F1F5F9',
  tableBorder: '#E2E8F0',
  alternateRow: '#F8FAFC',
  successGreen: '#059669',
  infoBlue: '#0284C7',
  alertAmber: '#D97706',
  criticalRed: '#DC2626',
  white: '#FFFFFF',
};

// Convert hex to RGB array for jsPDF
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// Format currency with $ and commas
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date to MM/DD/YY
function formatDateShort(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

// Format date to full spelled-out format (December 1, 2025)
function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format date for filename (YYYY-MM-DD)
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Truncate text at word boundary
function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
}

// Filter violations by custom date range
function filterByDateRange(
  violations: Violation[],
  fromDate: Date,
  toDate: Date,
  useResolvedDate: boolean
): Violation[] {
  return violations.filter((v) => {
    const dateStr = useResolvedDate ? (v.dateResolved || v.date) : v.date;
    const violationDate = new Date(dateStr);
    return violationDate >= fromDate && violationDate <= toDate;
  });
}

// Calculate metrics from filtered data only (3 cards only, no avg resolution time)
function calculateMetrics(violations: Violation[], tab: 'active' | 'resolved' | 'all') {
  const resolvedViolations = violations.filter(
    (v) => ['resolved', 'ignored', 'acknowledged'].includes(v.status.toLowerCase())
  );
  const activeViolations = violations.filter(
    (v) => !['resolved', 'ignored', 'acknowledged'].includes(v.status.toLowerCase())
  );

  const fundsProtected = resolvedViolations.reduce((sum, v) => sum + (v.atRiskSales || 0), 0);
  const fundsAtRisk = activeViolations.reduce((sum, v) => sum + (v.atRiskSales || 0), 0);
  const uniqueAsins = new Set(resolvedViolations.map((v) => v.asin).filter(Boolean)).size;
  const uniqueActiveAsins = new Set(activeViolations.map((v) => v.asin).filter(Boolean)).size;

  if (tab === 'resolved') {
    return {
      metric1: { label: 'RESOLVED THIS PERIOD', value: resolvedViolations.length.toString(), subLabel: 'Violations Resolved' },
      metric2: { label: 'REVENUE PROTECTED', value: formatCurrency(fundsProtected), subLabel: 'Funds Secured' },
      metric3: { label: 'ASINS PROTECTED', value: uniqueAsins.toString(), subLabel: 'Unique Products' },
      summaryCount: resolvedViolations.length,
      summaryAmount: fundsProtected,
    };
  }

  return {
    metric1: { label: 'OPEN VIOLATIONS', value: activeViolations.length.toString(), subLabel: 'Currently Active' },
    metric2: { label: 'FUNDS AT RISK', value: formatCurrency(fundsAtRisk), subLabel: 'Potential Impact' },
    metric3: { label: 'ASINS AT RISK', value: uniqueActiveAsins.toString(), subLabel: 'Unique Products' },
    summaryCount: activeViolations.length,
    summaryAmount: fundsAtRisk,
  };
}

// Generate the PDF with all fixes
function generateViolationsPDF(
  storeName: string,
  merchantId: string,
  violations: Violation[],
  tab: 'active' | 'resolved' | 'all',
  dateRangeLabel: string
): ArrayBuffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15.24; // 0.6 inches
  const marginRight = 15.24;
  const marginTop = 12.7; // 0.5 inches
  const marginBottom = 15.24; // 0.6 inches
  const contentWidth = pageWidth - marginLeft - marginRight;
  let yPos = marginTop;

  const metrics = calculateMetrics(violations, tab);
  const tabLabel = tab === 'resolved' ? 'Resolved' : tab === 'all' ? 'All' : 'Active';
  const statusLabel = tab === 'resolved' ? 'RESOLVED VIOLATIONS' : tab === 'active' ? 'ACTIVE VIOLATIONS' : 'ALL VIOLATIONS';

  // Footer function with hyperlink
  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 10; // 0.4" from bottom

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(BRAND.coolGray));

    // Left: Report name with client
    doc.text(`Account Health Report - ${storeName}`, marginLeft, footerY);

    // Center: Page number
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });

    // Right: Hyperlinked URL
    const linkText = 'sellercentry.com';
    const linkX = pageWidth - marginRight - doc.getTextWidth(linkText);
    doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
    doc.textWithLink(linkText, linkX, footerY, { url: 'https://sellercentry.com' });
  };

  // Pages 2+ have NO header text - table continues directly at top margin
  const getPage2StartY = () => {
    return marginTop;
  };

  // ========== PAGE 1 HEADER (clean, no artifacts) ==========

  // Text-based logo: "SELLER" in navy, "CENTRY" in orange
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  const sellerWidth = doc.getTextWidth('SELLER');
  doc.text('SELLER', marginLeft, yPos + 7);
  doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
  doc.text('CENTRY', marginLeft + sellerWidth + 2, yPos + 7);

  // Report title (right aligned)
  doc.setFontSize(28);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'bold');
  doc.text('Account Health Report', pageWidth - marginRight, yPos + 7, { align: 'right' });

  yPos += 16;

  // Client name
  doc.setFontSize(18);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'normal');
  doc.text(storeName, marginLeft, yPos);
  yPos += 7;

  // Merchant ID
  if (merchantId) {
    doc.setFontSize(12);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.text(`Merchant ID: ${merchantId}`, marginLeft, yPos);
    yPos += 7;
  }

  // Date range
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Period: ${dateRangeLabel}`, marginLeft, yPos);
  yPos += 8;

  // Status badge (only if resolved)
  if (tab === 'resolved') {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const badgeWidth = doc.getTextWidth(statusLabel) + 10;
    doc.setFillColor(...hexToRgb(BRAND.primaryOrange));
    doc.roundedRect(marginLeft, yPos - 4, badgeWidth, 8, 2, 2, 'F');
    doc.setTextColor(...hexToRgb(BRAND.white));
    doc.text(statusLabel, marginLeft + 5, yPos + 2);
    yPos += 12;
  }

  // Spacing (no horizontal lines)
  yPos += 8;

  // ========== EXECUTIVE SUMMARY ==========
  if (tab === 'resolved' && metrics.summaryCount > 0) {
    doc.setFontSize(14);
    doc.setTextColor(...hexToRgb(BRAND.slateNavy));
    doc.setFont('helvetica', 'normal');
    doc.text(`${metrics.summaryCount} violations resolved protecting ${formatCurrency(metrics.summaryAmount)} in revenue`, marginLeft, yPos);
    yPos += 12;
  } else if (tab === 'active' && metrics.summaryCount > 0) {
    doc.setFontSize(14);
    doc.setTextColor(...hexToRgb(BRAND.slateNavy));
    doc.setFont('helvetica', 'normal');
    doc.text(`${metrics.summaryCount} active violations with ${formatCurrency(metrics.summaryAmount)} at risk`, marginLeft, yPos);
    yPos += 12;
  }

  // ========== METRIC CARDS (3 cards only, equal 1/3 width) ==========
  const cardGap = 4.5; // ~16px gap between cards (4.5mm ≈ 16px)
  const totalGaps = cardGap * 2; // 2 gaps between 3 cards
  const cardWidth = (contentWidth - totalGaps) / 3; // Each card is 1/3 of available width
  const cardHeight = 32;
  const cardPadding = 5; // 20px internal padding (5mm ≈ 20px)

  const metricEntries = [metrics.metric1, metrics.metric2, metrics.metric3];

  metricEntries.forEach((metric, index) => {
    const cardX = marginLeft + index * (cardWidth + cardGap);

    // Card background with border (light gray bg, subtle border)
    doc.setFillColor(...hexToRgb(BRAND.lightGray));
    doc.setDrawColor(...hexToRgb(BRAND.tableBorder));
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'FD');

    // Label (uppercase, centered) - 10pt Medium
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'bold');
    doc.text(metric.label, cardX + cardWidth / 2, yPos + cardPadding + 3, { align: 'center' });

    // Value (large, centered) - 28pt Bold
    doc.setFontSize(28);
    doc.setTextColor(...hexToRgb(BRAND.slateNavy));
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, cardX + cardWidth / 2, yPos + cardPadding + 16, { align: 'center' });

    // Sublabel (centered) - 10pt Regular
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'normal');
    doc.text(metric.subLabel, cardX + cardWidth / 2, yPos + cardPadding + 23, { align: 'center' });
  });

  yPos += cardHeight + 14;

  // ========== TABLE SECTION HEADER ==========
  doc.setFontSize(18);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'bold');
  doc.text(`${tabLabel} Violations`, marginLeft, yPos);

  doc.setFontSize(12);
  doc.setTextColor(...hexToRgb(BRAND.coolGray));
  doc.setFont('helvetica', 'normal');
  doc.text(dateRangeLabel, pageWidth - marginRight, yPos, { align: 'right' });

  yPos += 5;
  doc.text(`${violations.length} issue${violations.length !== 1 ? 's' : ''} found`, marginLeft, yPos);
  yPos += 10;

  // Handle empty results
  if (violations.length === 0) {
    doc.setFillColor(...hexToRgb(BRAND.lightGray));
    doc.roundedRect(marginLeft, yPos, contentWidth, 30, 3, 3, 'F');

    doc.setFontSize(12);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'normal');
    doc.text('No violations found for this period', pageWidth / 2, yPos + 17, { align: 'center' });

    addFooter(1, 1);
    return doc.output('arraybuffer');
  }

  // Prepare table data - 5 columns only (no OPENED)
  // Single line content only - truncate with ellipsis
  const tableHeaders = [
    'ASIN',
    'PRODUCT',
    'ISSUE TYPE',
    'FUNDS\nPROTECTED',
    'RESOLVED',
  ];

  // Store ASIN values for hyperlinks
  const asinValues: string[] = [];

  const tableData = violations.map((v) => {
    asinValues.push(v.asin || '');
    return [
      v.asin || '-',
      truncateText(v.productTitle, 50), // Wider column allows more chars
      truncateText(v.reason, 40), // Wider column allows more chars
      formatCurrency(v.atRiskSales || 0),
      v.dateResolved ? formatDateShort(v.dateResolved) : '-',
    ];
  });

  // Track pages for footer
  let totalPagesEstimate = 1;

  // Column widths in mm (total content width ~185mm on letter)
  // Fixed widths: ASIN ~33mm, FUNDS ~30mm, RESOLVED ~26mm = 89mm fixed
  // Flexible: PRODUCT + ISSUE TYPE split remaining ~96mm (55/41 split)
  const colWidths = {
    asin: 33,
    product: 55,
    issueType: 41,
    funds: 30,
    resolved: 26,
  };

  // Use autoTable - 5 columns, single line rows, ASIN hyperlinks
  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: hexToRgb(BRAND.slateNavy),
      textColor: hexToRgb(BRAND.white),
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      minCellHeight: 12,
      lineColor: [148, 163, 184], // #94A3B8 - visible borders between header cells
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: hexToRgb(BRAND.slateNavy),
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      minCellHeight: 10, // Consistent row height ~28-32px
      valign: 'middle',
      overflow: 'ellipsize', // Single line with ellipsis
    },
    alternateRowStyles: {
      fillColor: hexToRgb(BRAND.alternateRow),
    },
    columnStyles: {
      0: { cellWidth: colWidths.asin, halign: 'center', fontStyle: 'bold', font: 'courier' }, // ASIN
      1: { cellWidth: colWidths.product, halign: 'left' }, // Product
      2: { cellWidth: colWidths.issueType, halign: 'left' }, // Issue Type
      3: { cellWidth: colWidths.funds, halign: 'center' }, // Funds Protected
      4: { cellWidth: colWidths.resolved, halign: 'center' }, // Resolved
    },
    margin: { left: marginLeft, right: marginRight, bottom: marginBottom + 5 },
    tableLineColor: hexToRgb(BRAND.tableBorder),
    tableLineWidth: 0.3,
    rowPageBreak: 'avoid', // Prevent rows from being split across pages
    didDrawCell: (data) => {
      // Add Amazon hyperlink to ASIN cells
      if (data.section === 'body' && data.column.index === 0) {
        const asin = asinValues[data.row.index];
        if (asin && asin !== '-') {
          // Add invisible link over the cell
          const url = `https://www.amazon.com/dp/${asin}`;
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
        }
      }
    },
    willDrawPage: (data) => {
      // Pages 2+ have NO header text - table continues at top margin
      if (data.pageNumber > 1) {
        data.settings.startY = getPage2StartY();
      }
    },
    didDrawPage: (data) => {
      totalPagesEstimate = Math.max(totalPagesEstimate, data.pageNumber);
    },
    showHead: 'everyPage',
  });

  // Add footers to all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc.output('arraybuffer');
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const subdomain = searchParams.get('subdomain');
    const tab = (searchParams.get('tab') as 'active' | 'resolved' | 'all') || 'resolved';
    const fromDateStr = searchParams.get('fromDate');
    const toDateStr = searchParams.get('toDate');

    if (!subdomain) {
      return NextResponse.json({ success: false, error: 'Subdomain is required' }, { status: 400 });
    }

    // Parse dates
    const now = new Date();
    const fromDate = fromDateStr ? new Date(fromDateStr + 'T00:00:00') : new Date(2020, 0, 1);
    const toDate = toDateStr ? new Date(toDateStr + 'T23:59:59') : now;

    // Validate dates
    if (fromDate > toDate) {
      return NextResponse.json({ success: false, error: 'From date must be before to date' }, { status: 400 });
    }

    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Fetch violations
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

    // Filter by status for resolved tab
    if (tab === 'resolved') {
      violations = violations.filter((v) =>
        ['resolved', 'ignored', 'acknowledged'].includes(v.status.toLowerCase())
      );
    }

    // Apply date filter
    const useResolvedDate = tab === 'resolved';
    violations = filterByDateRange(violations, fromDate, toDate, useResolvedDate);

    // Sort by date (newest first)
    violations.sort((a, b) => {
      const dateA = new Date(useResolvedDate ? (a.dateResolved || a.date) : a.date);
      const dateB = new Date(useResolvedDate ? (b.dateResolved || b.date) : b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // Create date range label
    const isAllTime = fromDate.getFullYear() <= 2020 && toDate.getTime() >= now.getTime() - 86400000;
    const dateRangeLabel = isAllTime
      ? 'All Time'
      : `${formatDateFull(fromDate)} - ${formatDateFull(toDate)}`;

    // Generate PDF
    const pdfBuffer = generateViolationsPDF(
      tenant.storeName,
      tenant.merchantId,
      violations,
      tab,
      dateRangeLabel
    );

    // Filename with date range
    const sanitizedSubdomain = subdomain.replace(/[^a-zA-Z0-9-]/g, '');
    const fromStr = formatDateForFilename(fromDate);
    const toStr = formatDateForFilename(toDate);
    const filename = isAllTime
      ? `${sanitizedSubdomain}-${tab}-report-all-time.pdf`
      : `${sanitizedSubdomain}-${tab}-${fromStr}-to-${toStr}.pdf`;

    console.log(`[GET /api/export/violations-pdf] Generated PDF for ${subdomain} (${tab}) with ${violations.length} violations`);

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
