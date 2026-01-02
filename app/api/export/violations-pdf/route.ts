import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantBySubdomain, getViolations } from '@/lib/google/sheets';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Violation } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

// Brand colors
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
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

// Format date to full format (December 3, 2025)
function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Truncate text at word boundary
function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;

  // Find last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
}

// Parse date range string and return start/end dates
function parseDateRange(dateRange: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  let label: string;

  switch (dateRange) {
    case '7days':
    case 'Last 7 Days':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      label = `${formatDateFull(start)} - ${formatDateFull(end)}`;
      break;
    case '30days':
    case 'Last 30 Days':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      label = `${formatDateFull(start)} - ${formatDateFull(end)}`;
      break;
    case '90days':
    case 'Last 90 Days':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      label = `${formatDateFull(start)} - ${formatDateFull(end)}`;
      break;
    case 'thisMonth':
    case 'This Month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      label = `${formatDateFull(start)} - ${formatDateFull(end)}`;
      break;
    case 'all':
    case 'All Time':
    default:
      start = new Date(2020, 0, 1); // Far past date
      label = 'All Time';
      break;
  }

  return { start, end, label };
}

// Filter violations by date range
function filterByDateRange(violations: Violation[], dateRange: string, useResolvedDate: boolean): Violation[] {
  if (dateRange === 'all' || dateRange === 'All Time') return violations;

  const { start, end } = parseDateRange(dateRange);

  return violations.filter((v) => {
    const dateStr = useResolvedDate ? (v.dateResolved || v.date) : v.date;
    const violationDate = new Date(dateStr);
    return violationDate >= start && violationDate <= end;
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

// Calculate metrics from filtered data only
function calculateMetrics(violations: Violation[], tab: 'active' | 'resolved' | 'all') {
  const resolvedViolations = violations.filter(
    (v) => v.status.toLowerCase() === 'resolved' ||
           v.status.toLowerCase() === 'ignored' ||
           v.status.toLowerCase() === 'acknowledged'
  );
  const activeViolations = violations.filter(
    (v) => !['resolved', 'ignored', 'acknowledged'].includes(v.status.toLowerCase())
  );

  // Calculate total funds protected (from resolved)
  const fundsProtected = resolvedViolations.reduce((sum, v) => sum + (v.atRiskSales || 0), 0);

  // Calculate funds at risk (from active)
  const fundsAtRisk = activeViolations.reduce((sum, v) => sum + (v.atRiskSales || 0), 0);

  // Unique ASINs protected
  const uniqueAsins = new Set(resolvedViolations.map((v) => v.asin).filter(Boolean)).size;

  // Average resolution time (days)
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

  // For active tab
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

// Load logo as base64
function loadLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logos', 'seller-centry-logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Failed to load logo:', error);
    return null;
  }
}

// Generate the PDF
function generateViolationsPDF(
  storeName: string,
  merchantId: string,
  violations: Violation[],
  tab: 'active' | 'resolved' | 'all',
  dateRangeLabel: string,
  search: string
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
  const marginBottom = 12.7;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let yPos = marginTop;

  // Load logo
  const logoBase64 = loadLogoBase64();

  // Calculate metrics from filtered data
  const metrics = calculateMetrics(violations, tab);
  const tabLabel = tab === 'resolved' ? 'Resolved' : tab === 'all' ? 'All' : 'Active';
  const statusLabel = tab === 'resolved' ? 'RESOLVED VIOLATIONS' : tab === 'active' ? 'ACTIVE VIOLATIONS' : 'ALL VIOLATIONS';

  // Track total pages for footer
  let currentPage = 1;

  // Add footer to page
  const addFooter = (pageNum: number) => {
    const footerY = pageHeight - marginBottom + 3;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(BRAND.coolGray));

    // Left: Confidential notice
    doc.text(`Confidential - Prepared for ${storeName}`, marginLeft, footerY);

    // Center: Page number (will be updated at end)
    doc.text(`Page ${pageNum}`, pageWidth / 2, footerY, { align: 'center' });

    // Right: Website
    doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
    doc.text('sellercentry.com', pageWidth - marginRight, footerY, { align: 'right' });
  };

  // Add continuation header for pages 2+
  const addContinuationHeader = () => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.text(`Account Health Report - ${storeName}`, marginLeft, marginTop);
    doc.text(dateRangeLabel, pageWidth - marginRight, marginTop, { align: 'right' });

    // Border below header
    doc.setDrawColor(...hexToRgb(BRAND.tableBorder));
    doc.setLineWidth(0.3);
    doc.line(marginLeft, marginTop + 4, pageWidth - marginRight, marginTop + 4);

    return marginTop + 12;
  };

  // ========== PAGE 1 HEADER ==========

  // Logo (left side)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', marginLeft, yPos - 2, 30, 30);
    } catch (e) {
      // Fallback to text if image fails
      doc.setFontSize(14);
      doc.setTextColor(...hexToRgb(BRAND.slateNavy));
      doc.setFont('helvetica', 'bold');
      doc.text('SELLER', marginLeft, yPos + 8);
      doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
      doc.text('CENTRY', marginLeft + 22, yPos + 8);
    }
  } else {
    // Text fallback
    doc.setFontSize(14);
    doc.setTextColor(...hexToRgb(BRAND.slateNavy));
    doc.setFont('helvetica', 'bold');
    doc.text('SELLER', marginLeft, yPos + 8);
    doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
    doc.text('CENTRY', marginLeft + 22, yPos + 8);
  }

  // Report Title (right aligned)
  doc.setFontSize(24);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'bold');
  doc.text('Account Health Report', pageWidth - marginRight, yPos + 6, { align: 'right' });

  yPos += 18;

  // Client name
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'normal');
  doc.text(storeName, marginLeft, yPos);
  yPos += 7;

  // Merchant ID
  if (merchantId) {
    doc.setFontSize(11);
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

  // Status badge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const badgeWidth = doc.getTextWidth(statusLabel) + 8;
  doc.setFillColor(...hexToRgb(BRAND.primaryOrange));
  doc.roundedRect(marginLeft, yPos - 4, badgeWidth, 7, 1, 1, 'F');
  doc.setTextColor(...hexToRgb(BRAND.white));
  doc.text(statusLabel, marginLeft + 4, yPos + 1);

  yPos += 16;

  // Divider
  doc.setDrawColor(...hexToRgb(BRAND.coolGray));
  doc.setLineWidth(0.3);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 10;

  // ========== EXECUTIVE SUMMARY LINE ==========
  if (tab === 'resolved' && metrics.summaryCount > 0) {
    doc.setFontSize(14);
    doc.setTextColor(...hexToRgb(BRAND.slateNavy));
    doc.setFont('helvetica', 'normal');
    const summaryText = `${metrics.summaryCount} violations resolved protecting ${formatCurrency(metrics.summaryAmount)} in revenue`;
    doc.text(summaryText, marginLeft, yPos);
    yPos += 14;
  } else if (tab === 'active' && metrics.summaryCount > 0) {
    doc.setFontSize(14);
    doc.setTextColor(...hexToRgb(BRAND.slateNavy));
    doc.setFont('helvetica', 'normal');
    const summaryText = `${metrics.summaryCount} active violations with ${formatCurrency(metrics.summaryAmount)} at risk`;
    doc.text(summaryText, marginLeft, yPos);
    yPos += 14;
  }

  // ========== METRIC CARDS ==========
  const cardWidth = (contentWidth - 12) / 4; // 4mm gaps between cards
  const cardHeight = 32;
  const cardStartX = marginLeft;

  const metricEntries = [metrics.metric1, metrics.metric2, metrics.metric3, metrics.metric4];

  metricEntries.forEach((metric, index) => {
    const cardX = cardStartX + index * (cardWidth + 4);

    // Card background
    doc.setFillColor(...hexToRgb(BRAND.lightGray));
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'F');

    // Card border
    doc.setDrawColor(...hexToRgb(BRAND.tableBorder));
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'S');

    // Metric label (uppercase)
    doc.setFontSize(6);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'bold');
    doc.text(metric.label, cardX + cardWidth / 2, yPos + 8, { align: 'center' });

    // Metric value (large)
    doc.setFontSize(18);
    doc.setTextColor(...hexToRgb(BRAND.slateNavy));
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, cardX + cardWidth / 2, yPos + 20, { align: 'center' });

    // Sub label
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(BRAND.primaryOrange));
    doc.setFont('helvetica', 'normal');
    doc.text(metric.subLabel, cardX + cardWidth / 2, yPos + 27, { align: 'center' });
  });

  yPos += cardHeight + 16;

  // ========== TABLE SECTION ==========

  // Table header
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(BRAND.slateNavy));
  doc.setFont('helvetica', 'bold');
  doc.text(`${tabLabel} Violations`, marginLeft, yPos);

  // Issue count and filter summary
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(BRAND.coolGray));
  doc.setFont('helvetica', 'normal');
  let filterSummary = dateRangeLabel;
  if (search) {
    filterSummary += ` | Search: "${truncateText(search, 15)}"`;
  }
  doc.text(filterSummary, pageWidth - marginRight, yPos, { align: 'right' });

  yPos += 4;
  doc.text(`${violations.length} issue${violations.length !== 1 ? 's' : ''} found`, marginLeft, yPos);
  yPos += 8;

  // Handle empty results
  if (violations.length === 0) {
    doc.setFillColor(...hexToRgb(BRAND.lightGray));
    doc.roundedRect(marginLeft, yPos, contentWidth, 35, 3, 3, 'F');

    doc.setFontSize(12);
    doc.setTextColor(...hexToRgb(BRAND.coolGray));
    doc.setFont('helvetica', 'normal');
    doc.text('No violations found for this period', pageWidth / 2, yPos + 20, { align: 'center' });

    addFooter(1);
    return doc.output('arraybuffer');
  }

  // Calculate totals
  const totalFundsProtected = violations.reduce((sum, v) => sum + (v.atRiskSales || 0), 0);

  // Prepare table data
  const tableHeaders = [
    'ASIN',
    'PRODUCT',
    'ISSUE TYPE',
    'FUNDS PROTECTED',
    'IMPACT',
    'STATUS',
    'OPENED',
    'RESOLVED',
  ];

  const tableData = violations.map((v) => [
    v.asin || '-',
    truncateText(v.productTitle, 45),
    truncateText(v.reason, 35),
    formatCurrency(v.atRiskSales || 0),
    v.ahrImpact || '-',
    v.status || '-',
    formatDateShort(v.date),
    v.dateResolved ? formatDateShort(v.dateResolved) : '-',
  ]);

  // Add totals row
  tableData.push([
    'TOTAL',
    '',
    '',
    formatCurrency(totalFundsProtected),
    '',
    '',
    '',
    '',
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
      minCellHeight: 10,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: hexToRgb(BRAND.slateNavy),
      cellPadding: 2,
      minCellHeight: 9,
    },
    alternateRowStyles: {
      fillColor: hexToRgb(BRAND.alternateRow),
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', font: 'courier' }, // ASIN - monospace
      1: { cellWidth: 45 }, // Product
      2: { cellWidth: 35 }, // Issue Type
      3: { cellWidth: 22, halign: 'right' }, // Funds Protected
      4: { cellWidth: 16, halign: 'center' }, // Impact
      5: { cellWidth: 18, halign: 'center' }, // Status
      6: { cellWidth: 18, halign: 'center' }, // Opened
      7: { cellWidth: 18, halign: 'center' }, // Resolved
    },
    margin: { left: marginLeft, right: marginRight, bottom: marginBottom + 10 },
    tableLineColor: hexToRgb(BRAND.tableBorder),
    tableLineWidth: 0.2,
    didParseCell: (data) => {
      // Color code impact column
      if (data.section === 'body' && data.column.index === 4) {
        const impact = data.cell.raw as string;
        if (impact === 'High') {
          data.cell.styles.textColor = hexToRgb(BRAND.criticalRed);
          data.cell.styles.fontStyle = 'bold';
        } else if (impact === 'Medium') {
          data.cell.styles.textColor = hexToRgb(BRAND.alertAmber);
        } else if (impact === 'Low') {
          data.cell.styles.textColor = hexToRgb(BRAND.alertAmber);
        } else {
          data.cell.styles.textColor = hexToRgb(BRAND.coolGray);
        }
      }

      // Color code status column
      if (data.section === 'body' && data.column.index === 5) {
        const status = (data.cell.raw as string).toLowerCase();
        if (status === 'resolved' || status === 'ignored' || status === 'acknowledged') {
          data.cell.styles.textColor = hexToRgb(BRAND.successGreen);
        } else if (status === 'working') {
          data.cell.styles.textColor = hexToRgb(BRAND.infoBlue);
        } else if (status === 'waiting' || status === 'waiting on client') {
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
    didDrawPage: (data) => {
      const pageNum = data.pageNumber;

      // Add continuation header on pages 2+
      if (pageNum > 1) {
        addContinuationHeader();
      }

      // Add footer to each page
      addFooter(pageNum);

      currentPage = pageNum;
    },
    showHead: 'everyPage',
  });

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
    const tab = (searchParams.get('tab') as 'active' | 'resolved' | 'all') || 'resolved';
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

    // For resolved tab, filter to only resolved/ignored/acknowledged statuses
    if (tab === 'resolved') {
      violations = violations.filter((v) => {
        const status = v.status.toLowerCase();
        return status === 'resolved' || status === 'ignored' || status === 'acknowledged';
      });
    }

    // Apply filters
    const useResolvedDate = tab === 'resolved';
    violations = filterByDateRange(violations, dateRange, useResolvedDate);
    violations = filterBySearch(violations, search);

    // Sort by date (newest first)
    violations.sort((a, b) => {
      const dateA = new Date(useResolvedDate ? (a.dateResolved || a.date) : a.date);
      const dateB = new Date(useResolvedDate ? (b.dateResolved || b.date) : b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // Get date range label for display
    const { label: dateRangeLabel } = parseDateRange(dateRange);

    // Generate the PDF
    const pdfBuffer = generateViolationsPDF(
      tenant.storeName,
      tenant.merchantId,
      violations,
      tab,
      dateRangeLabel,
      search
    );

    // Create filename with status included
    const sanitizedSubdomain = subdomain.replace(/[^a-zA-Z0-9-]/g, '');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedSubdomain}-${tab}-report-${dateStr}.pdf`;

    console.log(`[GET /api/export/violations-pdf] Generated PDF for ${subdomain} (${tab}) with ${violations.length} violations`);

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
