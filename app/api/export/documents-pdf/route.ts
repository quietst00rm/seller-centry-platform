import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantBySubdomain, getViolations } from '@/lib/google/sheets';
import { jsPDF } from 'jspdf';
import type { Violation } from '@/types';

// Document requirements definitions
const DOCUMENT_REQUIREMENTS: Record<string, { title: string; requirements: string[] }> = {
  Invoice: {
    title: 'Invoice',
    requirements: [
      'Must cover the last 365 days of sales',
      'Must be dated before the violation date',
      'Must be authentic and unaltered',
      'Must clearly show supplier name, address, and contact info',
      'Must list the ASIN/product and quantities purchased',
    ],
  },
  LOA: {
    title: 'Letter of Authorization (LOA)',
    requirements: [
      'Must be on official company letterhead from the brand owner',
      'Must explicitly authorize you to sell the product on Amazon',
      'Must include the brand owner\'s contact information',
      'Must be signed and dated',
      'Must reference the specific products or ASIN(s)',
    ],
  },
  'Safety Cert': {
    title: 'Safety Certification',
    requirements: [
      'Must be from an accredited testing laboratory',
      'Must be valid and not expired',
      'Must reference the specific product or ASIN',
      'Must show compliance with applicable safety standards',
    ],
  },
  'Lab Report': {
    title: 'Laboratory Test Report',
    requirements: [
      'Must be from an ISO 17025 accredited laboratory',
      'Must verify product compliance with safety standards',
      'Must reference the specific product or ASIN tested',
      'Must include test date and report number',
    ],
  },
};

// Parse comma-separated docs string into array
function parseDocsNeeded(docsNeeded: string | undefined): string[] {
  if (!docsNeeded) return [];
  return docsNeeded
    .split(',')
    .map((doc) => doc.trim())
    .filter((doc) => doc.length > 0);
}

// Format date for display
function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Truncate text for PDF
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Generate the PDF document
function generatePDF(
  storeName: string,
  documentFolderUrl: string | undefined,
  violations: Violation[]
): ArrayBuffer {
  // Filter to only violations with docs needed
  const violationsWithDocs = violations.filter((v) => {
    const docs = parseDocsNeeded(v.docsNeeded);
    return docs.length > 0;
  });

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Colors
  const orange = '#F97316';
  const darkGray = '#374151';
  const lightGray = '#6B7280';

  // Helper to add a new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper to draw horizontal line
  const drawLine = () => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
  };

  // ========== HEADER ==========
  doc.setFontSize(24);
  doc.setTextColor(orange);
  doc.setFont('helvetica', 'bold');
  doc.text('SELLER CENTRY', margin, yPos);
  yPos += 10;

  doc.setFontSize(16);
  doc.setTextColor(darkGray);
  doc.setFont('helvetica', 'bold');
  doc.text(`Documents Needed for ${storeName}`, margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(lightGray);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`, margin, yPos);
  yPos += 10;

  drawLine();

  // ========== INTRODUCTION ==========
  doc.setFontSize(10);
  doc.setTextColor(darkGray);
  doc.setFont('helvetica', 'normal');

  const introText = `The following violations require documentation to be submitted for resolution. Please review each item carefully and provide the requested documents as soon as possible to avoid further impact to your account health.`;

  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, margin, yPos);
  yPos += introLines.length * 5 + 8;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orange);
  doc.text(`Total Items Requiring Documents: ${violationsWithDocs.length}`, margin, yPos);
  yPos += 12;

  drawLine();

  // ========== VIOLATIONS ==========
  violationsWithDocs.forEach((violation, index) => {
    const docsNeeded = parseDocsNeeded(violation.docsNeeded);

    // Estimate space needed for this violation
    let estimatedSpace = 35; // Base space for header info
    docsNeeded.forEach((docType) => {
      const docInfo = DOCUMENT_REQUIREMENTS[docType];
      if (docInfo) {
        estimatedSpace += 8 + docInfo.requirements.length * 5;
      }
    });

    checkNewPage(Math.min(estimatedSpace, 80));

    // Violation header with clickable ASIN link
    doc.setFontSize(12);
    doc.setTextColor(orange);
    doc.setFont('helvetica', 'bold');
    const asinText = `${index + 1}. ASIN: ${violation.asin}`;
    doc.text(asinText, margin, yPos);

    // Add clickable link to Amazon
    const asinWidth = doc.getTextWidth(asinText);
    doc.link(margin, yPos - 4, asinWidth, 6, { url: `https://www.amazon.com/dp/${violation.asin}` });
    yPos += 7;

    // Product title
    doc.setFontSize(10);
    doc.setTextColor(darkGray);
    doc.setFont('helvetica', 'normal');
    const titleLines = doc.splitTextToSize(`Product: ${truncateText(violation.productTitle, 80)}`, contentWidth);
    doc.text(titleLines, margin, yPos);
    yPos += titleLines.length * 5;

    // Violation date
    doc.text(`Violation Date: ${formatDate(violation.date)}`, margin, yPos);
    yPos += 5;

    // Reason (if available)
    if (violation.reason) {
      const reasonLines = doc.splitTextToSize(`Reason: ${truncateText(violation.reason, 70)}`, contentWidth);
      doc.text(reasonLines, margin, yPos);
      yPos += reasonLines.length * 5;
    }

    // Documents needed list
    doc.setFont('helvetica', 'bold');
    doc.text(`Documents Needed: ${docsNeeded.join(', ')}`, margin, yPos);
    yPos += 8;

    // Requirements for each document
    docsNeeded.forEach((docType) => {
      const docInfo = DOCUMENT_REQUIREMENTS[docType];
      if (!docInfo) return;

      checkNewPage(25);

      doc.setFontSize(10);
      doc.setTextColor(orange);
      doc.setFont('helvetica', 'bold');
      doc.text(`${docInfo.title} Requirements:`, margin + 5, yPos);
      yPos += 5;

      doc.setFontSize(9);
      doc.setTextColor(lightGray);
      doc.setFont('helvetica', 'normal');

      docInfo.requirements.forEach((req) => {
        checkNewPage(6);
        doc.text(`• ${req}`, margin + 10, yPos);
        yPos += 5;
      });

      yPos += 3;
    });

    yPos += 5;

    // Separator between violations (except last)
    if (index < violationsWithDocs.length - 1) {
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
    }
  });

  // ========== HOW TO SUBMIT SECTION ==========
  checkNewPage(60);
  yPos += 5;
  drawLine();

  doc.setFontSize(14);
  doc.setTextColor(orange);
  doc.setFont('helvetica', 'bold');
  doc.text('HOW TO SUBMIT YOUR DOCUMENTS', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setTextColor(darkGray);
  doc.setFont('helvetica', 'normal');

  // Option 1: Google Drive
  if (documentFolderUrl) {
    doc.setFont('helvetica', 'bold');
    doc.text('Option 1: Upload to Google Drive (Recommended)', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(orange);
    const driveLines = doc.splitTextToSize(documentFolderUrl, contentWidth - 10);
    doc.text(driveLines, margin + 5, yPos);
    // Add clickable link
    doc.link(margin + 5, yPos - 3, contentWidth - 10, driveLines.length * 5, { url: documentFolderUrl });
    yPos += driveLines.length * 5 + 3;
  }

  // Option 2: Email
  doc.setTextColor(darkGray);
  doc.setFont('helvetica', 'bold');
  doc.text(documentFolderUrl ? 'Option 2: Email Documents' : 'Option 1: Email Documents', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(orange);
  doc.text('info@sellercentry.com', margin + 5, yPos);
  doc.link(margin + 5, yPos - 3, 50, 5, { url: 'mailto:info@sellercentry.com?subject=Document%20Submission' });
  yPos += 8;

  // Important notes
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orange);
  doc.text('Important Notes:', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray);

  const notes = [
    'Please label files clearly with the ASIN (e.g., B08XXXXXX_Invoice.pdf)',
    'Submit all documents together when possible to expedite processing',
    'Ensure documents are legible and complete',
    'Contact us if you have questions: info@sellercentry.com',
  ];

  notes.forEach((note) => {
    checkNewPage(6);
    doc.text(`• ${note}`, margin + 5, yPos);
    yPos += 5;
  });

  // Footer
  yPos = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(lightGray);
  doc.text('Seller Centry - Amazon Account Health Management', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.setTextColor(orange);
  doc.text('sellercentry.com', pageWidth / 2, yPos, { align: 'center' });
  doc.link(pageWidth / 2 - 15, yPos - 3, 30, 5, { url: 'https://sellercentry.com' });

  // Get the PDF as ArrayBuffer and return it
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

    // Get subdomain from query params
    const searchParams = request.nextUrl.searchParams;
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json({ success: false, error: 'Subdomain is required' }, { status: 400 });
    }

    // Fetch tenant info
    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Fetch active violations
    const violations = await getViolations(tenant, 'active');

    // Check if there are any violations with docs needed
    const violationsWithDocs = violations.filter((v) => {
      const docs = parseDocsNeeded(v.docsNeeded);
      return docs.length > 0;
    });

    if (violationsWithDocs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No documents are currently requested for your account'
      }, { status: 400 });
    }

    // Generate the PDF
    const pdfBuffer = generatePDF(
      tenant.storeName,
      tenant.documentFolderUrl,
      violations
    );

    // Create filename
    const sanitizedStoreName = tenant.storeName.replace(/[^a-zA-Z0-9]/g, '');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `DocumentsNeeded_${sanitizedStoreName}_${dateStr}.pdf`;

    console.log(`[GET /api/export/documents-pdf] Generated PDF for ${subdomain} with ${violationsWithDocs.length} violations`);

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
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
