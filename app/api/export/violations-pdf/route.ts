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

// Calculate metrics from filtered data only
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

  // Average resolution time
  let avgResolutionDays: number | null = null;
  const violationsWithBothDates = resolvedViolations.filter((v) => v.date && v.dateResolved);
  if (violationsWithBothDates.length > 0) {
    const totalDays = violationsWithBothDates.reduce((sum, v) => {
      const opened = new Date(v.date);
      const resolved = new Date(v.dateResolved!);
      const days = Math.max(0, Math.ceil((resolved.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0);
    avgResolutionDays = Math.round(totalDays / violationsWithBothDates.length);
  }

  if (tab === 'resolved') {
    return {
      metric1: { label: 'RESOLVED THIS PERIOD', value: resolvedViolations.length.toString(), subLabel: 'Violations Resolved' },
      metric2: { label: 'REVENUE PROTECTED', value: formatCurrency(fundsProtected), subLabel: 'Funds Secured' },
      metric3: { label: 'ASINS PROTECTED', value: uniqueAsins.toString(), subLabel: 'Unique Products' },
      metric4: { label: 'AVG RESOLUTION TIME', value: avgResolutionDays !== null ? `${avgResolutionDays}` : 'N/A', subLabel: avgResolutionDays !== null ? 'Days to Resolve' : 'Pending' },
      summaryCount: resolvedViolations.length,
      summaryAmount: fundsProtected,
    };
  }

  const highImpactCount = activeViolations.filter((v) => v.ahrImpact === 'High').length;

  return {
    metric1: { label: 'OPEN VIOLATIONS', value: activeViolations.length.toString(), subLabel: 'Currently Active' },
    metric2: { label: 'FUNDS AT RISK', value: formatCurrency(fundsAtRisk), subLabel: 'Potential Impact' },
    metric3: { label: 'HIGH IMPACT', value: highImpactCount.toString(), subLabel: 'Require Attention' },
    metric4: { label: 'AVG RESOLUTION TIME', value: avgResolutionDays !== null ? `${avgResolutionDays}` : 'N/A', subLabel: avgResolutionDays !== null ? 'Days to Resolve' : 'Pending' },
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

  // Footer function
  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 10; // 0.4" from bottom

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(BRAND.coolGray));

    doc.text(`Confidential - Prepared for ${storeName}`, marginLeft, footerY);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
    doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
    doc.text('sellercentry.com', pageWidth - marginRight, footerY, { align: 'right' });
  };

  // Continuation header for pages 2+
  const addContinuationHeader = () => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.text(`Account Health Report - ${storeName}`, marginLeft, marginTop);
    doc.text(dateRangeLabel, pageWidth - marginRight, marginTop, { align: 'right' });

    doc.setDrawColor(...hexToRgb(BRAND.tableBorder));
    doc.setLineWidth(0.3);
    doc.line(marginLeft, marginTop + 5, pageWidth - marginRight, marginTop + 5);

    return marginTop + 14;
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

  // ========== METRIC CARDS (clean, no icons) ==========
  const cardWidth = (contentWidth - 9) / 4; // 3mm gaps
  const cardHeight = 28;

  const metricEntries = [metrics.metric1, metrics.metric2, metrics.metric3, metrics.metric4];

  metricEntries.forEach((metric, index) => {
    const cardX = marginLeft + index * (cardWidth + 3);

    // Card background with border
    doc.setFillColor(...hexToRgb(BRAND.lightGray));
    doc.setDrawColor(...hexToRgb(BRAND.tableBorder));
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'FD');

    // Label (uppercase, centered)
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'bold');
    doc.text(metric.label, cardX + cardWidth / 2, yPos + 8, { align: 'center' });

    // Value (large, centered)
    doc.setFontSize(20);
    doc.setTextColor(...hexToRgb(BRAND.slateNavy));
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, cardX + cardWidth / 2, yPos + 18, { align: 'center' });

    // Sublabel
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'normal');
    doc.text(metric.subLabel, cardX + cardWidth / 2, yPos + 24, { align: 'center' });
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

  // Calculate totals
  const totalFundsProtected = violations.reduce((sum, v) => sum + (v.atRiskSales || 0), 0);

  // Prepare table data
  const tableHeaders = ['ASIN', 'PRODUCT', 'ISSUE TYPE', 'FUNDS PROTECTED', 'IMPACT', 'STATUS', 'OPENED', 'RESOLVED'];

  const tableData = violations.map((v) => [
    v.asin || '-',
    truncateText(v.productTitle, 40),
    truncateText(v.reason, 30),
    formatCurrency(v.atRiskSales || 0),
    v.ahrImpact || '-',
    v.status || '-',
    formatDateShort(v.date),
    v.dateResolved ? formatDateShort(v.dateResolved) : '-',
  ]);

  // Add totals row
  tableData.push(['TOTAL', '', '', formatCurrency(totalFundsProtected), '', '', '', '']);

  // Track pages for footer
  let totalPagesEstimate = 1;

  // Use autoTable
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
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
      minCellHeight: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: hexToRgb(BRAND.slateNavy),
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      minCellHeight: 9,
    },
    alternateRowStyles: {
      fillColor: hexToRgb(BRAND.alternateRow),
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center', fontStyle: 'bold', font: 'courier' }, // ASIN
      1: { cellWidth: 45, halign: 'left' }, // Product
      2: { cellWidth: 35, halign: 'left' }, // Issue Type
      3: { cellWidth: 23, halign: 'right' }, // Funds Protected (header centered, data right)
      4: { cellWidth: 16, halign: 'center' }, // Impact
      5: { cellWidth: 18, halign: 'center' }, // Status
      6: { cellWidth: 18, halign: 'center' }, // Opened
      7: { cellWidth: 18, halign: 'center' }, // Resolved
    },
    margin: { left: marginLeft, right: marginRight, bottom: marginBottom + 5 },
    tableLineColor: hexToRgb(BRAND.tableBorder),
    tableLineWidth: 0.2,
    didParseCell: (data) => {
      // Color code impact column
      if (data.section === 'body' && data.column.index === 4) {
        const impact = data.cell.raw as string;
        if (impact === 'High') {
          data.cell.styles.textColor = hexToRgb(BRAND.criticalRed);
          data.cell.styles.fontStyle = 'bold';
        } else if (impact === 'Low') {
          data.cell.styles.textColor = hexToRgb(BRAND.alertAmber);
        } else {
          data.cell.styles.textColor = hexToRgb(BRAND.coolGray);
        }
      }

      // Color code status column
      if (data.section === 'body' && data.column.index === 5) {
        const status = (data.cell.raw as string).toLowerCase();
        if (['resolved', 'ignored', 'acknowledged'].includes(status)) {
          data.cell.styles.textColor = hexToRgb(BRAND.successGreen);
        } else if (status === 'working') {
          data.cell.styles.textColor = hexToRgb(BRAND.infoBlue);
        } else if (['waiting', 'waiting on client'].includes(status)) {
          data.cell.styles.textColor = hexToRgb(BRAND.alertAmber);
        } else if (status === 'denied') {
          data.cell.styles.textColor = hexToRgb(BRAND.criticalRed);
        }
      }

      // Style totals row
      if (data.section === 'body' && data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = hexToRgb(BRAND.lightGray);
        data.cell.styles.fontStyle = 'bold';
      }
    },
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        data.settings.startY = addContinuationHeader();
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
